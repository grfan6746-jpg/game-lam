import React, { useEffect, useRef } from 'react';
import { FightingState, FighterState } from '../../types';
import { sounds } from '../../utils/audio';
import { ArrowLeft, ArrowRight, ArrowUp, Shield, Swords } from 'lucide-react';

interface FightingProps {
  state: FightingState;
  playerNum: 1 | 2;
  onAction: (action: 'move' | 'jump' | 'attack' | 'defend_start' | 'defend_end', dir?: number) => void;
  disabled?: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

export const Fighting: React.FC<FightingProps> = ({
  state,
  playerNum,
  onAction,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active key state for continuous hold-to-move
  const keysRef = useRef<{ left: boolean; right: boolean; jump: boolean; defend: boolean }>({
    left: false,
    right: false,
    jump: false,
    defend: false,
  });

  const sparksRef = useRef<SparkParticle[]>([]);

  // Local physics simulation for instant 60fps reaction and smooth jumps
  const localFightersRef = useRef<{ p1: FighterState; p2: FighterState }>({
    p1: { ...state.p1 },
    p2: { ...state.p2 },
  });

  // Sync from incoming state
  useEffect(() => {
    // If health or round changed, sync immediately
    localFightersRef.current.p1.health = state.p1.health;
    localFightersRef.current.p2.health = state.p2.health;
    localFightersRef.current.p1.roundsWon = state.p1.roundsWon;
    localFightersRef.current.p2.roundsWon = state.p2.roundsWon;

    // Opponent position sync
    if (playerNum === 1) {
      localFightersRef.current.p2.x = state.p2.x;
      localFightersRef.current.p2.y = state.p2.y;
      localFightersRef.current.p2.isDefending = state.p2.isDefending;
      localFightersRef.current.p2.isAttacking = state.p2.isAttacking;
    } else {
      localFightersRef.current.p1.x = state.p1.x;
      localFightersRef.current.p1.y = state.p1.y;
      localFightersRef.current.p1.isDefending = state.p1.isDefending;
      localFightersRef.current.p1.isAttacking = state.p1.isAttacking;
    }
  }, [state, playerNum]);

  // Keyboard navigation with hold support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (!keysRef.current.left) {
          keysRef.current.left = true;
          onAction('move', -1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (!keysRef.current.right) {
          keysRef.current.right = true;
          onAction('move', 1);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleJump();
      } else if (e.key === ' ' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleAttack();
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (!keysRef.current.defend) {
          keysRef.current.defend = true;
          onAction('defend_start');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
        if (!keysRef.current.right) onAction('move', 0);
        else onAction('move', 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
        if (!keysRef.current.left) onAction('move', 0);
        else onAction('move', -1);
      } else if (e.key === 'k' || e.key === 'K') {
        keysRef.current.defend = false;
        onAction('defend_end');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, onAction]);

  // Jump handler (guarantees takeoff and landing via local + server physics)
  const handleJump = () => {
    if (disabled) return;
    const me = playerNum === 1 ? localFightersRef.current.p1 : localFightersRef.current.p2;
    if (me.isGrounded && me.y >= 295) {
      me.vy = -14;
      me.isGrounded = false;
      me.animState = 'jump';
      sounds.playMove();
      onAction('jump');

      // Jump dust puff
      for (let i = 0; i < 5; i++) {
        sparksRef.current.push({
          x: me.x + (Math.random() - 0.5) * 20,
          y: 300,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 2,
          color: '#94a3b8',
          life: 0.6,
          size: 3,
        });
      }
    }
  };

  const handleAttack = () => {
    if (disabled) return;
    const me = playerNum === 1 ? localFightersRef.current.p1 : localFightersRef.current.p2;
    const opp = playerNum === 1 ? localFightersRef.current.p2 : localFightersRef.current.p1;

    me.isAttacking = true;
    setTimeout(() => {
      me.isAttacking = false;
    }, 180);

    sounds.playPunch();
    onAction('attack');

    // Punch impact spark
    const faceDir = me.facing === 'right' ? 1 : -1;
    for (let i = 0; i < 8; i++) {
      sparksRef.current.push({
        x: me.x + faceDir * 28,
        y: me.y - 32,
        vx: faceDir * (2 + Math.random() * 4),
        vy: (Math.random() - 0.5) * 4,
        color: '#f59e0b',
        life: 0.8,
        size: 3.5,
      });
    }
  };

  // Continuous physics update and render loop (Ensures gravity ALWAYS brings fighters down!)
  useEffect(() => {
    let animFrame: number;

    const loop = () => {
      const { p1, p2 } = localFightersRef.current;

      // Update P1 Physics & Gravity
      if (!p1.isGrounded || p1.y < 300) {
        p1.vy += 0.85; // Strong gravity
        p1.y += p1.vy;
      }
      if (p1.y >= 300) {
        p1.y = 300;
        p1.vy = 0;
        p1.isGrounded = true;
      }

      // Update P2 Physics & Gravity
      if (!p2.isGrounded || p2.y < 300) {
        p2.vy += 0.85; // Strong gravity
        p2.y += p2.vy;
      }
      if (p2.y >= 300) {
        p2.y = 300;
        p2.vy = 0;
        p2.isGrounded = true;
      }

      // Continuous lateral movement when holding keys/buttons
      const me = playerNum === 1 ? p1 : p2;
      if (keysRef.current.left) {
        me.x = Math.max(35, me.x - 4.5);
      } else if (keysRef.current.right) {
        me.x = Math.min(565, me.x + 4.5);
      }

      // Face each other
      if (p1.x < p2.x) {
        p1.facing = 'right';
        p2.facing = 'left';
      } else {
        p1.facing = 'left';
        p2.facing = 'right';
      }

      // Particle physics
      sparksRef.current.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.05;
      });
      sparksRef.current = sparksRef.current.filter((s) => s.life > 0);

      // Draw Arena & Fighters
      renderArena(p1, p2);

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [playerNum]);

  // Canvas Arena Renderer
  const renderArena = (p1: FighterState, p2: FighterState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background Gradient (Cyber Dojo)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.8, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Neon grid lines on back wall
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 300);
      ctx.stroke();
    }

    // Japanese Kanji / Emblem in Background
    ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('闘', width / 2, 200);

    // Arena Combat Platform
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 300, width, 60);

    // Glowing Neon Platform Edge
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(width, 300);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Platform floor tiles
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 300);
      ctx.lineTo(x + 20, 360);
      ctx.stroke();
    }

    // Draw Particles
    sparksRef.current.forEach((s) => {
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Draw P1 (Cyan) & P2 (Rose)
    drawFighter(ctx, p1, '#38bdf8', 'بازیکن ۱ (P1)');
    drawFighter(ctx, p2, '#fb7185', 'بازیکن ۲ (P2)');
  };

  // Detailed Stickman Fighter with dynamic poses
  const drawFighter = (
    ctx: CanvasRenderingContext2D,
    f: FighterState,
    color: string,
    name: string
  ) => {
    ctx.save();
    ctx.translate(f.x, f.y);

    const faceDir = f.facing === 'right' ? 1 : -1;
    const isAirborne = f.y < 295;

    // Ground Shadow (scales with height)
    const shadowScale = Math.max(0.4, 1 - (300 - f.y) / 200);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(0, 300 - f.y, 22 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Defend Energy Shield Bubble
    if (f.isDefending) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, -32, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Head
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, -56, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Headband / Martial Arts Bandana
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-12, -60, 24, 5);
    ctx.beginPath();
    ctx.moveTo(-faceDir * 12, -58);
    ctx.lineTo(-faceDir * 24, -54);
    ctx.lineTo(-faceDir * 22, -62);
    ctx.fill();

    // Body Spine
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -41);
    ctx.lineTo(0, -18);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    if (isAirborne) {
      // Jump kick pose
      ctx.moveTo(0, -18);
      ctx.lineTo(faceDir * 16, -10);
      ctx.lineTo(faceDir * 28, -6); // extended front kick

      ctx.moveTo(0, -18);
      ctx.lineTo(-faceDir * 10, -5);
      ctx.lineTo(-faceDir * 12, 4); // bent back leg
    } else {
      // Ground stance
      ctx.moveTo(0, -18);
      ctx.lineTo(-12, 0);
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 0);
    }
    ctx.stroke();

    // Arms
    ctx.beginPath();
    if (f.isAttacking) {
      // Full forward punch thrust
      ctx.moveTo(0, -34);
      ctx.lineTo(faceDir * 32, -34);
      ctx.stroke();

      // Punch Glove / Flash
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(faceDir * 32, -34, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (f.isDefending) {
      // Guard shield stance
      ctx.moveTo(0, -34);
      ctx.lineTo(faceDir * 12, -48);
      ctx.lineTo(faceDir * 16, -30);
      ctx.stroke();
    } else {
      // Dynamic ready stance
      ctx.moveTo(0, -34);
      ctx.lineTo(faceDir * 16, -26);
      ctx.lineTo(faceDir * 24, -38);

      ctx.moveTo(0, -34);
      ctx.lineTo(-faceDir * 12, -26);
      ctx.stroke();
    }

    ctx.restore();

    // Name Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, f.x, f.y - 78);
  };

  const p1 = localFightersRef.current.p1;
  const p2 = localFightersRef.current.p2;

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-3 w-full max-w-xl select-none" dir="rtl">
      {/* Health Bars Header */}
      <div className="grid grid-cols-2 gap-4 w-full px-2">
        {/* P1 Health */}
        <div className="space-y-1 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 shadow">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
            <span>بازیکن ۱ {playerNum === 1 ? '(شما 🔵)' : ''}</span>
            <span className="font-mono text-cyan-300">{p1.health}% HP</span>
          </div>
          <div className="h-4 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
              style={{ width: `${p1.health}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
            <span className="text-slate-400">بردها:</span>
            <span>{'★'.repeat(p1.roundsWon) || '—'}</span>
          </div>
        </div>

        {/* P2 Health */}
        <div className="space-y-1 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 shadow">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400">
            <span className="font-mono text-rose-300">{p2.health}% HP</span>
            <span>بازیکن ۲ {playerNum === 2 ? '(شما 🔴)' : ''}</span>
          </div>
          <div className="h-4 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-150 mr-auto"
              style={{ width: `${p2.health}%` }}
            />
          </div>
          <div className="flex items-center justify-end gap-1 text-[11px] text-amber-400 font-bold">
            <span>{'★'.repeat(p2.roundsWon) || '—'}</span>
            <span className="text-slate-400">بردها:</span>
          </div>
        </div>
      </div>

      {/* Fight Arena Canvas */}
      <div className="relative w-full aspect-[5/3] rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
        <canvas
          ref={canvasRef}
          width={600}
          height={360}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Floating Combat Helper */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] text-slate-300 border border-slate-800 backdrop-blur-sm pointer-events-none">
          دکمه‌های چپ و راست را نگه دارید تا حرکت کند • دکمه پرش و مشت برای حمله
        </div>
      </div>

      {/* Mobile Fight Controls (FORCED LTR: Left movement controls on left, Jump in center/left, Defend & Attack on right) */}
      <div className="flex items-center justify-between w-full max-w-lg px-2 pt-1" dir="ltr">
        {/* Left Side: Continuous Hold Movement (Left, Right, Jump) */}
        <div className="flex gap-2">
          {/* Walk Left */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              keysRef.current.left = true;
              onAction('move', -1);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current.left = false;
              if (!keysRef.current.right) onAction('move', 0);
            }}
            onPointerCancel={() => {
              keysRef.current.left = false;
              if (!keysRef.current.right) onAction('move', 0);
            }}
            onPointerLeave={() => {
              keysRef.current.left = false;
              if (!keysRef.current.right) onAction('move', 0);
            }}
            className="h-14 w-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex flex-col items-center justify-center text-cyan-400 font-bold transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="حرکت چپ"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="text-[10px] font-bold">چپ</span>
          </button>

          {/* Walk Right */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              keysRef.current.right = true;
              onAction('move', 1);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current.right = false;
              if (!keysRef.current.left) onAction('move', 0);
            }}
            onPointerCancel={() => {
              keysRef.current.right = false;
              if (!keysRef.current.left) onAction('move', 0);
            }}
            onPointerLeave={() => {
              keysRef.current.right = false;
              if (!keysRef.current.left) onAction('move', 0);
            }}
            className="h-14 w-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex flex-col items-center justify-center text-cyan-400 font-bold transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="حرکت راست"
          >
            <ArrowRight className="h-6 w-6" />
            <span className="text-[10px] font-bold">راست</span>
          </button>

          {/* Jump */}
          <button
            type="button"
            onClick={handleJump}
            className="h-14 w-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex flex-col items-center justify-center text-cyan-400 font-bold transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="پرش"
          >
            <ArrowUp className="h-6 w-6" />
            <span className="text-[10px] font-bold">پرش</span>
          </button>
        </div>

        {/* Right Side: Shield Defense & Attack Punch */}
        <div className="flex gap-2">
          {/* Shield Defense (Hold to maintain shield) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              keysRef.current.defend = true;
              onAction('defend_start');
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current.defend = false;
              onAction('defend_end');
            }}
            onPointerCancel={() => {
              keysRef.current.defend = false;
              onAction('defend_end');
            }}
            onPointerLeave={() => {
              keysRef.current.defend = false;
              onAction('defend_end');
            }}
            className="h-14 w-14 rounded-2xl bg-sky-950 hover:bg-sky-900 active:bg-sky-600 border border-sky-600/40 flex flex-col items-center justify-center text-sky-400 font-bold transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="دفاع سپری"
          >
            <Shield className="h-6 w-6" />
            <span className="text-[10px] font-bold">دفاع</span>
          </button>

          {/* Attack Punch */}
          <button
            type="button"
            onClick={handleAttack}
            className="h-14 w-20 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-400 active:text-slate-950 text-white border border-rose-500 flex flex-col items-center justify-center font-black transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="مشت و ضربه"
          >
            <Swords className="h-6 w-6 text-rose-200" />
            <span className="text-[11px] font-black text-rose-100">مشت 💥</span>
          </button>
        </div>
      </div>
    </div>
  );
};
