import React, { useEffect, useRef } from 'react';
import { FightingState, FighterState } from '../../types';
import { sounds } from '../../utils/audio';
import { ArrowLeft, ArrowRight, ArrowUp, Shield, Swords, Heart } from 'lucide-react';

interface FightingProps {
  state: FightingState;
  playerNum: 1 | 2;
  onAction: (action: 'move' | 'jump' | 'attack' | 'defend_start' | 'defend_end', dir?: number) => void;
  disabled?: boolean;
}

export const Fighting: React.FC<FightingProps> = ({
  state,
  playerNum,
  onAction,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        onAction('move', -1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        onAction('move', 1);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        onAction('jump');
        sounds.playMove();
      } else if (e.key === ' ' || e.key === 'j' || e.key === 'J') {
        onAction('attack');
        sounds.playPunch();
      } else if (e.key === 'k' || e.key === 'K') {
        onAction('defend_start');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd' || e.key === 'A' || e.key === 'D') {
        onAction('move', 0);
      } else if (e.key === 'k' || e.key === 'K') {
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

  // Render 2D Arena & Cartoon Stickman Fighters
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Arena background (Cyberpunk retro dojo)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 600, 360);

    // Floor Platform
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 300, 600, 60);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(600, 300);
    ctx.stroke();

    // Draw P1 (Blue)
    drawFighter(ctx, state.p1, '#38bdf8', 'Player 1');

    // Draw P2 (Red)
    drawFighter(ctx, state.p2, '#fb7185', 'Player 2');
  }, [state]);

  const drawFighter = (ctx: CanvasRenderingContext2D, f: FighterState, color: string, name: string) => {
    ctx.save();
    ctx.translate(f.x, f.y);

    // Shield Bubble if defending
    if (f.isDefending) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -30, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, -55, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Body
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -41);
    ctx.lineTo(0, -18);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-12, 0);
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 0);
    ctx.stroke();

    // Arms
    const faceDir = f.facing === 'right' ? 1 : -1;
    ctx.beginPath();
    if (f.isAttacking) {
      // Punch extended forward
      ctx.moveTo(0, -32);
      ctx.lineTo(faceDir * 28, -32);
      // Punch glove flash
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(faceDir * 28, -32, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.isDefending) {
      // Guard arms
      ctx.moveTo(0, -32);
      ctx.lineTo(faceDir * 10, -45);
    } else {
      // Normal stance
      ctx.moveTo(0, -32);
      ctx.lineTo(faceDir * 14, -20);
      ctx.moveTo(0, -32);
      ctx.lineTo(-faceDir * 14, -20);
      ctx.stroke();
    }

    ctx.restore();

    // Name above fighter
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, f.x, f.y - 75);
  };

  const handleAttack = () => {
    sounds.playPunch();
    onAction('attack');
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-4 w-full max-w-xl">
      {/* Health Bars & Rounds Header */}
      <div className="grid grid-cols-2 gap-4 w-full px-2">
        {/* P1 Health */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
            <span>P1 {playerNum === 1 ? '(شما)' : ''}</span>
            <span>{state.p1.health}% HP</span>
          </div>
          <div className="h-4 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
              style={{ width: `${state.p1.health}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400">بردها: {'★'.repeat(state.p1.roundsWon)}</div>
        </div>

        {/* P2 Health */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400">
            <span>{state.p2.health}% HP</span>
            <span>P2 {playerNum === 2 ? '(شما)' : ''}</span>
          </div>
          <div className="h-4 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-150 ml-auto"
              style={{ width: `${state.p2.health}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 text-left">بردها: {'★'.repeat(state.p2.roundsWon)}</div>
        </div>
      </div>

      {/* Fight Arena Canvas */}
      <div className="relative w-full aspect-[5/3] rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
        <canvas
          ref={canvasRef}
          width={600}
          height={360}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Mobile Fight Controls */}
      <div className="flex items-center justify-between w-full max-w-md px-2 pt-1">
        {/* Left / Right / Jump */}
        <div className="flex gap-2">
          <button
            onPointerDown={() => onAction('move', -1)}
            onPointerUp={() => onAction('move', 0)}
            onPointerLeave={() => onAction('move', 0)}
            className="h-14 w-14 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow cursor-pointer"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button
            onPointerDown={() => onAction('move', 1)}
            onPointerUp={() => onAction('move', 0)}
            onPointerLeave={() => onAction('move', 0)}
            className="h-14 w-14 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow cursor-pointer"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <button
            onClick={() => {
              onAction('jump');
              sounds.playMove();
            }}
            className="h-14 w-14 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow cursor-pointer"
          >
            <ArrowUp className="h-6 w-6" />
          </button>
        </div>

        {/* Attack & Defense */}
        <div className="flex gap-2">
          <button
            onPointerDown={() => onAction('defend_start')}
            onPointerUp={() => onAction('defend_end')}
            onPointerLeave={() => onAction('defend_end')}
            className="h-14 w-14 rounded-2xl bg-sky-950/80 active:bg-sky-600 border border-sky-600/40 flex items-center justify-center text-sky-400 font-bold transition shadow cursor-pointer"
            title="دفاع سپری"
          >
            <Shield className="h-6 w-6" />
          </button>
          <button
            onClick={handleAttack}
            className="h-14 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 active:from-amber-400 active:to-orange-400 text-slate-950 font-black flex items-center justify-center transition shadow-lg shadow-orange-500/30 cursor-pointer"
            title="حمله و مشت"
          >
            <Swords className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
