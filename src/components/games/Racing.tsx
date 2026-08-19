import React, { useEffect, useRef } from 'react';
import { RacingState, CarState } from '../../types';
import { sounds } from '../../utils/audio';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Gauge, Flag } from 'lucide-react';

interface RacingProps {
  state: RacingState;
  playerNum: 1 | 2;
  onSyncCar: (car: CarState) => void;
  disabled?: boolean;
}

// Checkpoints along the oval/curved race track
const CHECKPOINTS = [
  { x: 120, y: 350, r: 60 }, // 0: Start / Finish Line
  { x: 120, y: 180, r: 60 }, // 1: Left straight
  { x: 180, y: 80, r: 60 },  // 2: Top left curve
  { x: 380, y: 80, r: 60 },  // 3: Top straight
  { x: 500, y: 150, r: 60 }, // 4: Top right curve
  { x: 500, y: 280, r: 60 }, // 5: Right straight
  { x: 420, y: 350, r: 60 }, // 6: Bottom right curve
  { x: 260, y: 350, r: 60 }, // 7: Bottom straight before finish
];

export const Racing: React.FC<RacingProps> = ({
  state,
  playerNum,
  onSyncCar,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const localCarRef = useRef<CarState>(playerNum === 1 ? { ...state.p1Car } : { ...state.p2Car });

  // Sync state updates from server for opponent
  const oppCar = playerNum === 1 ? state.p2Car : state.p1Car;

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
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

  // Main local physics & rendering loop
  useEffect(() => {
    let animFrame: number;
    let lastSyncTime = Date.now();

    const loop = () => {
      const car = localCarRef.current;
      const keys = keysRef.current;

      if (!disabled) {
        // Acceleration & Braking
        if (keys.up) {
          car.speed = Math.min(car.speed + 0.18, 4.5);
        } else if (keys.down) {
          car.speed = Math.max(car.speed - 0.15, -1.8);
        } else {
          car.speed *= 0.96; // friction
        }

        // Steering
        if (Math.abs(car.speed) > 0.1) {
          const steerDir = car.speed > 0 ? 1 : -1;
          if (keys.left) car.angle -= 0.05 * steerDir;
          if (keys.right) car.angle += 0.05 * steerDir;
        }

        // Move
        car.x += Math.cos(car.angle) * car.speed;
        car.y += Math.sin(car.angle) * car.speed;

        // Boundaries / Track limits
        if (car.x < 40) { car.x = 40; car.speed *= -0.5; }
        if (car.x > 560) { car.x = 560; car.speed *= -0.5; }
        if (car.y < 40) { car.y = 40; car.speed *= -0.5; }
        if (car.y > 380) { car.y = 380; car.speed *= -0.5; }

        // Inner obstacle / island check
        if (car.x > 220 && car.x < 380 && car.y > 160 && car.y < 260) {
          car.speed *= 0.7; // grass slow down
        }

        // Checkpoint logic
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

        // Send sync to server at ~20 Hz
        if (Date.now() - lastSyncTime > 50) {
          lastSyncTime = Date.now();
          onSyncCar({ ...car });
        }
      }

      // Draw Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear Ground
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 600, 420);

          // Outer Track Asphalt
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.roundRect(40, 40, 520, 340, 100);
          ctx.fill();

          // Inner Grass Island
          ctx.fillStyle = '#064e3b';
          ctx.beginPath();
          ctx.roundRect(200, 150, 200, 120, 50);
          ctx.fill();

          // Finish Line (Dashed Checkered pattern)
          ctx.strokeStyle = '#f8fafc';
          ctx.setLineDash([8, 8]);
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(120, 270);
          ctx.lineTo(120, 380);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw Opponent Car
          drawCar(ctx, oppCar.x, oppCar.y, oppCar.angle, playerNum === 1 ? '#fb7185' : '#38bdf8', 'P' + (playerNum === 1 ? '2' : '1'));

          // Draw Local Car
          drawCar(ctx, car.x, car.y, car.angle, playerNum === 1 ? '#38bdf8' : '#fb7185', 'YOU');
        }
      }

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [disabled, oppCar, onSyncCar, playerNum]);

  const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string, label: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Wheels
    ctx.fillStyle = '#020617';
    ctx.fillRect(-14, -11, 7, 4);
    ctx.fillRect(7, -11, 7, 4);
    ctx.fillRect(-14, 7, 7, 4);
    ctx.fillRect(7, 7, 7, 4);

    // Car Body
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(-15, -8, 30, 16, 5);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -6, 8, 12);

    // Front spoiler
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(13, -7, 3, 14);

    ctx.restore();

    // Label tag
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 16);
  };

  const myCar = playerNum === 1 ? state.p1Car : state.p2Car;

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-3 w-full max-w-xl">
      {/* Race Stats Header */}
      <div className="flex items-center justify-between w-full px-5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-cyan-400" />
          <span className="text-slate-300">دور مسابقه:</span>
          <span className="text-base font-black text-cyan-300">
            {myCar.lap} / {state.targetLaps}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-amber-400" />
          <span className="text-slate-300">سرعت:</span>
          <span className="text-base font-black text-amber-300">
            {Math.abs(Math.round((localCarRef.current.speed || 0) * 25))} km/h
          </span>
        </div>
      </div>

      {/* Race Track Canvas */}
      <div className="relative w-full aspect-[4/3] rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
        <canvas
          ref={canvasRef}
          width={600}
          height={420}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Mobile Touch Steering & Throttle */}
      <div className="flex items-center justify-between w-full max-w-md px-2 pt-1">
        {/* Steer Left/Right */}
        <div className="flex gap-2">
          <button
            onPointerDown={() => { keysRef.current.left = true; }}
            onPointerUp={() => { keysRef.current.left = false; }}
            onPointerLeave={() => { keysRef.current.left = false; }}
            className="h-14 w-14 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow-lg cursor-pointer"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button
            onPointerDown={() => { keysRef.current.right = true; }}
            onPointerUp={() => { keysRef.current.right = false; }}
            onPointerLeave={() => { keysRef.current.right = false; }}
            className="h-14 w-14 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow-lg cursor-pointer"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>

        {/* Gas / Brake */}
        <div className="flex gap-2">
          <button
            onPointerDown={() => { keysRef.current.down = true; }}
            onPointerUp={() => { keysRef.current.down = false; }}
            onPointerLeave={() => { keysRef.current.down = false; }}
            className="h-14 w-14 rounded-2xl bg-slate-800 active:bg-rose-500 active:text-white border border-slate-700 flex items-center justify-center text-rose-400 font-bold transition shadow-lg cursor-pointer"
          >
            <ArrowDown className="h-6 w-6" />
          </button>
          <button
            onPointerDown={() => { keysRef.current.up = true; }}
            onPointerUp={() => { keysRef.current.up = false; }}
            onPointerLeave={() => { keysRef.current.up = false; }}
            className="h-14 w-16 rounded-2xl bg-emerald-600 active:bg-emerald-400 text-slate-950 border border-emerald-500 flex items-center justify-center font-black transition shadow-lg cursor-pointer"
          >
            <ArrowUp className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
