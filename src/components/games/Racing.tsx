import React, { useEffect, useRef, useState } from 'react';
import { RacingState, CarState } from '../../types';
import { sounds } from '../../utils/audio';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Gauge, Flag, Trophy } from 'lucide-react';

interface RacingProps {
  state: RacingState;
  playerNum: 1 | 2;
  onSyncCar: (car: CarState) => void;
  disabled?: boolean;
}

// 8 Checkpoints along the oval race circuit
const CHECKPOINTS = [
  { x: 130, y: 350, r: 70 }, // 0: Start / Finish Line
  { x: 110, y: 200, r: 70 }, // 1: Left straight
  { x: 170, y: 90, r: 70 },  // 2: Top left curve
  { x: 340, y: 80, r: 70 },  // 3: Top straight
  { x: 490, y: 130, r: 70 }, // 4: Top right curve
  { x: 500, y: 260, r: 70 }, // 5: Right straight
  { x: 440, y: 350, r: 70 }, // 6: Bottom right curve
  { x: 270, y: 350, r: 70 }, // 7: Bottom straight before finish
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export const Racing: React.FC<RacingProps> = ({
  state,
  playerNum,
  onSyncCar,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Key state for active holding
  const keysRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const localCarRef = useRef<CarState>(
    playerNum === 1 ? { ...state.p1Car } : { ...state.p2Car }
  );

  const particlesRef = useRef<Particle[]>([]);
  const skidMarksRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);

  // Opponent car from server
  const oppCar = playerNum === 1 ? state.p2Car : state.p1Car;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        keysRef.current.up = true;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        keysRef.current.down = true;
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        keysRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        keysRef.current.right = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled]);

  // Main 60FPS physics and rendering loop
  useEffect(() => {
    let animFrame: number;
    let lastSyncTime = Date.now();
    let speedUpdateCounter = 0;

    const loop = () => {
      const car = localCarRef.current;
      const keys = keysRef.current;

      if (!disabled) {
        // Continuous Acceleration (Hold Gas)
        if (keys.up) {
          car.speed = Math.min(car.speed + 0.15, 5.0);

          // Add smoke particles
          if (Math.random() > 0.4) {
            particlesRef.current.push({
              x: car.x - Math.cos(car.angle) * 16,
              y: car.y - Math.sin(car.angle) * 16,
              vx: (Math.random() - 0.5) * 0.8 - Math.cos(car.angle) * 1.2,
              vy: (Math.random() - 0.5) * 0.8 - Math.sin(car.angle) * 1.2,
              life: 1.0,
              color: 'rgba(203, 213, 225, ',
              size: 3 + Math.random() * 3,
            });
          }
        } else if (keys.down) {
          // Continuous Brake / Reverse
          car.speed = Math.max(car.speed - 0.18, -2.0);
        } else {
          // Natural Road Friction
          car.speed *= 0.965;
        }

        // Continuous Steering (Hold Left / Right)
        if (Math.abs(car.speed) > 0.12) {
          const steerDir = car.speed > 0 ? 1 : -1;
          const turnRate = 0.058 * (Math.min(Math.abs(car.speed), 3.5) / 3.5);

          if (keys.left) {
            car.angle -= turnRate * steerDir;
            if (car.speed > 3.0 && Math.random() > 0.6) {
              skidMarksRef.current.push({ x: car.x, y: car.y, alpha: 0.5 });
            }
          }
          if (keys.right) {
            car.angle += turnRate * steerDir;
            if (car.speed > 3.0 && Math.random() > 0.6) {
              skidMarksRef.current.push({ x: car.x, y: car.y, alpha: 0.5 });
            }
          }
        }

        // Apply Velocity
        car.x += Math.cos(car.angle) * car.speed;
        car.y += Math.sin(car.angle) * car.speed;

        // Boundaries & Off-road Slowdown
        if (car.x < 35) { car.x = 35; car.speed *= -0.4; }
        if (car.x > 565) { car.x = 565; car.speed *= -0.4; }
        if (car.y < 35) { car.y = 35; car.speed *= -0.4; }
        if (car.y > 385) { car.y = 385; car.speed *= -0.4; }

        // Center Grass Island Slowdown
        if (car.x > 195 && car.x < 405 && car.y > 140 && car.y < 280) {
          car.speed *= 0.86; // Off-track grass friction
          if (Math.random() > 0.6) {
            particlesRef.current.push({
              x: car.x,
              y: car.y,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              life: 0.8,
              color: 'rgba(34, 197, 94, ',
              size: 3,
            });
          }
        }

        // Checkpoint / Finish Line Lap Tracking
        const nextCpIdx = (car.currentCheckpoint + 1) % CHECKPOINTS.length;
        const nextCp = CHECKPOINTS[nextCpIdx];
        const distToCp = Math.hypot(car.x - nextCp.x, car.y - nextCp.y);

        if (distToCp < nextCp.r) {
          car.currentCheckpoint = nextCpIdx;
          if (nextCpIdx === 0) {
            car.lap += 1;
            sounds.playCapture();
          }
        }

        // Sync Speed for UI HUD (at 10Hz)
        speedUpdateCounter++;
        if (speedUpdateCounter % 6 === 0) {
          setCurrentSpeedKmh(Math.round(Math.abs(car.speed) * 32));
        }

        // Send Server Sync at 20Hz
        if (Date.now() - lastSyncTime > 50) {
          lastSyncTime = Date.now();
          onSyncCar({ ...car });
        }
      }

      // Update Particles & Skid Marks
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      skidMarksRef.current.forEach((s) => {
        s.alpha -= 0.003;
      });
      skidMarksRef.current = skidMarksRef.current.filter((s) => s.alpha > 0.05);

      // Render Complete Track
      renderTrack(car);

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [disabled, oppCar, onSyncCar, playerNum]);

  // Detailed Canvas Track Renderer
  const renderTrack = (myCar: CarState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Surrounding Grass Field with subtle lawn texture
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, width, height);

    // Striped grass pattern
    ctx.fillStyle = '#047857';
    for (let x = 0; x < width; x += 60) {
      ctx.fillRect(x, 0, 30, height);
    }

    // 2. Outer Asphalt Track (Smooth curved highway)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(40, 35, 520, 350, 110);
    ctx.fill();

    // Red-and-White Rumble Strip Curb (Outer)
    drawCurbBorder(ctx, 36, 31, 528, 358, 114, 8);

    // 3. Inner Infield Grass Island
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.roundRect(190, 140, 220, 140, 60);
    ctx.fill();

    // Inner Infield Rumble Strip Curb
    drawCurbBorder(ctx, 186, 136, 228, 148, 64, 8);

    // Inner Island Lake / Logo Decor
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(300, 210, 45, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏁 GRAND PRIX', 300, 214);

    // 4. Track Lane Markings (White dashed centerline)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.roundRect(115, 88, 370, 244, 85);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Directional Arrows on Asphalt
    drawArrow(ctx, 130, 220, -Math.PI / 2); // Going up on left side
    drawArrow(ctx, 330, 88, 0);             // Going right on top side
    drawArrow(ctx, 485, 220, Math.PI / 2);  // Going down on right side
    drawArrow(ctx, 330, 332, Math.PI);      // Going left on bottom side

    // 6. Starting Grid Boxes (#1 Blue and #2 Red)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, 310, 30, 20);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('1', 115, 324);

    ctx.strokeStyle = '#fb7185';
    ctx.strokeRect(140, 335, 30, 20);
    ctx.fillStyle = '#fb7185';
    ctx.fillText('2', 155, 349);

    // 7. CHECKERED FINISH / START LINE (High-Contrast Black & White Grid)
    drawFinishLine(ctx, 130, 260, 130, 385);

    // 8. Skid Marks
    skidMarksRef.current.forEach((s) => {
      ctx.fillStyle = `rgba(15, 23, 42, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 9. Particle Smoke / Grass Emitters
    particlesRef.current.forEach((p) => {
      ctx.fillStyle = `${p.color}${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 10. Corner Cones (Safety Markers)
    drawCone(ctx, 185, 135);
    drawCone(ctx, 415, 135);
    drawCone(ctx, 185, 285);
    drawCone(ctx, 415, 285);

    // 11. Draw Opponent Car
    drawCar(
      ctx,
      oppCar.x,
      oppCar.y,
      oppCar.angle,
      playerNum === 1 ? '#fb7185' : '#38bdf8',
      playerNum === 1 ? 'P2' : 'P1'
    );

    // 12. Draw Local Car
    drawCar(
      ctx,
      myCar.x,
      myCar.y,
      myCar.angle,
      myCar.speed !== undefined ? (playerNum === 1 ? '#38bdf8' : '#fb7185') : '#38bdf8',
      'شما (YOU)'
    );
  };

  // Helper: Draw Alternating Red & White Curbs
  const drawCurbBorder = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    lineW: number
  ) => {
    ctx.save();
    ctx.lineWidth = lineW;
    ctx.strokeStyle = '#ef4444'; // Red base
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff'; // White stripes
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();
    ctx.restore();
  };

  // Helper: Checkered Start/Finish Line Banner
  const drawFinishLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    ctx.save();
    const squareSize = 10;
    const totalSquares = Math.floor(Math.abs(y2 - y1) / squareSize);

    // 2-row checkerboard
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < totalSquares; i++) {
        const isWhite = (i + row) % 2 === 0;
        ctx.fillStyle = isWhite ? '#f8fafc' : '#090d16';
        ctx.fillRect(x1 - 10 + row * squareSize, y1 + i * squareSize, squareSize, squareSize);
      }
    }

    // Overhead Finish Marker
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x1 - 14, y1 - 18, 28, 16);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', x1, y1 - 7);
    ctx.restore();
  };

  // Helper: Draw Directional Arrow on Track
  const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(248, 250, 252, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 6);
    ctx.lineTo(3, 6);
    ctx.lineTo(3, 12);
    ctx.lineTo(-3, 12);
    ctx.lineTo(-3, 6);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Helper: Draw Orange Cone
  const drawCone = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Helper: Draw Detailed Sport Racing Car
  const drawCar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    label: string
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Car Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(-16, -9, 32, 18, 5);
    ctx.fill();

    // 4 Black Wheels
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-15, -12, 8, 4);
    ctx.fillRect(7, -12, 8, 4);
    ctx.fillRect(-15, 8, 8, 4);
    ctx.fillRect(7, 8, 8, 4);

    // Main Aerodynamic Body
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(-16, -9, 32, 18, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Racing Stripe (White centerline)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-16, -2, 32, 4);

    // Tinted Cockpit / Windshield
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-4, -6, 12, 12, 3);
    ctx.fill();

    // Front Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(14, -7, 2, 4);
    ctx.fillRect(14, 3, 2, 4);

    // Rear Spoiler
    ctx.fillStyle = '#334155';
    ctx.fillRect(-17, -9, 3, 18);

    ctx.restore();

    // Floating Label Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(label, x, y - 18);
    ctx.shadowBlur = 0;
  };

  const myCar = playerNum === 1 ? state.p1Car : state.p2Car;
  const isFinalLap = myCar.lap >= (state.targetLaps || 3) - 1;

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-3 w-full max-w-xl select-none" dir="rtl">
      {/* Race Stats HUD */}
      <div className="flex items-center justify-between w-full px-5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono shadow-lg">
        <div className="flex items-center gap-2">
          <Flag className={`h-4 w-4 ${isFinalLap ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
          <span className="text-slate-300 font-bold">دور مسابقه:</span>
          <span className={`text-base font-black px-2 py-0.5 rounded-lg ${isFinalLap ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-cyan-300 bg-slate-900'}`}>
            {myCar.lap} از {state.targetLaps || 3}
          </span>
          {isFinalLap && <span className="text-[10px] text-amber-400 font-bold">دور آخر! 🏁</span>}
        </div>

        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-emerald-400" />
          <span className="text-slate-300 font-bold">سرعت:</span>
          <span className="text-base font-black text-emerald-300 font-mono">
            {currentSpeedKmh} <span className="text-[10px] text-slate-400">km/h</span>
          </span>
        </div>
      </div>

      {/* Race Track Canvas */}
      <div className="relative w-full aspect-[4/3] rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
        <canvas
          ref={canvasRef}
          width={600}
          height={420}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Start/Finish Guidance */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] text-slate-300 border border-slate-800 backdrop-blur-sm pointer-events-none">
          دکمه سبز را نگه دارید تا گاز دهد • دکمه‌های چپ و راست برای هدایت فرمان
        </div>
      </div>

      {/* Mobile Touch Controls (FORCED LTR: Left side has Steering Left & Right, Right side has Brake & Gas) */}
      <div className="flex items-center justify-between w-full max-w-lg px-2 pt-1" dir="ltr">
        {/* Left Side: Steering Controls (Left button on left, Right button on right) */}
        <div className="flex gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              keysRef.current.left = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current.left = false;
            }}
            onPointerCancel={() => { keysRef.current.left = false; }}
            onPointerLeave={() => { keysRef.current.left = false; }}
            className="h-14 w-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex flex-col items-center justify-center text-cyan-400 font-bold transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="فرمان چپ"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="text-[10px] font-bold mt-0.5">چپ</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              keysRef.current.right = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current.right = false;
            }}
            onPointerCancel={() => { keysRef.current.right = false; }}
            onPointerLeave={() => { keysRef.current.right = false; }}
            className="h-14 w-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex flex-col items-center justify-center text-cyan-400 font-bold transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="فرمان راست"
          >
            <ArrowRight className="h-6 w-6" />
            <span className="text-[10px] font-bold mt-0.5">راست</span>
          </button>
        </div>

        {/* Right Side: Throttle & Brake (Brake on left, Gas/Throttle on right) */}
        <div className="flex gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              keysRef.current.down = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current.down = false;
            }}
            onPointerCancel={() => { keysRef.current.down = false; }}
            onPointerLeave={() => { keysRef.current.down = false; }}
            className="h-14 w-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-rose-500 active:text-white border border-slate-700 flex flex-col items-center justify-center text-rose-400 font-bold transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="ترمز"
          >
            <ArrowDown className="h-6 w-6" />
            <span className="text-[10px] font-bold mt-0.5">ترمز</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              keysRef.current.up = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current.up = false;
            }}
            onPointerCancel={() => { keysRef.current.up = false; }}
            onPointerLeave={() => { keysRef.current.up = false; }}
            className="h-14 w-20 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 active:text-slate-950 text-white border border-emerald-500 flex flex-col items-center justify-center font-black transition shadow-lg cursor-pointer touch-none select-none"
            aria-label="گاز و شتاب"
          >
            <ArrowUp className="h-6 w-6 text-emerald-200" />
            <span className="text-[11px] font-black mt-0.5 text-emerald-100">گاز / شتاب</span>
          </button>
        </div>
      </div>
    </div>
  );
};
