import React, { useEffect, useRef, useState } from 'react';
import { PongState } from '../../types';
import { sounds } from '../../utils/audio';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface PongProps {
  state: PongState;
  playerNum: 1 | 2;
  onPaddleMove: (y: number) => void;
  disabled?: boolean;
}

export const Pong: React.FC<PongProps> = ({
  state,
  playerNum,
  onPaddleMove,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchAreaRef = useRef<HTMLDivElement | null>(null);

  // Local responsive paddle position for instant 60fps reaction
  const localPaddleYRef = useRef<number>(playerNum === 1 ? state.p1PaddleY : state.p2PaddleY);
  const [, setRerender] = useState({});

  // Hold-to-move state for buttons
  const moveDirectionRef = useRef<'up' | 'down' | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Keep local ref in sync if remote state changes significantly
  useEffect(() => {
    const targetY = playerNum === 1 ? state.p1PaddleY : state.p2PaddleY;
    if (Math.abs(localPaddleYRef.current - targetY) > 20) {
      localPaddleYRef.current = targetY;
    }
  }, [state.p1PaddleY, state.p2PaddleY, playerNum]);

  // Continuous movement loop when holding buttons or keys
  const startMoving = (dir: 'up' | 'down') => {
    if (disabled) return;
    moveDirectionRef.current = dir;
    sounds.playMove();

    const step = () => {
      if (!moveDirectionRef.current) return;
      const delta = moveDirectionRef.current === 'up' ? -3.5 : 3.5;
      const newY = Math.max(12, Math.min(88, localPaddleYRef.current + delta));
      localPaddleYRef.current = newY;
      onPaddleMove(newY);
    };

    step(); // Immediate first step

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(step, 30);
  };

  const stopMoving = () => {
    moveDirectionRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Keyboard controls with continuous hold
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (moveDirectionRef.current !== 'up') startMoving('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (moveDirectionRef.current !== 'down') startMoving('down');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        stopMoving();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopMoving();
    };
  }, [disabled, onPaddleMove]);

  // Direct touch/drag on Canvas Arena
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || !touchAreaRef.current) return;
    const rect = touchAreaRef.current.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relativeY = ((clientY - rect.top) / rect.height) * 100;
    const clampedY = Math.max(12, Math.min(88, relativeY));
    localPaddleYRef.current = clampedY;
    onPaddleMove(clampedY);
  };

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid pattern
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Center Dashed Line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center Circle
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Paddle Heights & Widths
    const p1H = (state.paddleHeight / 100) * height;
    const p1W = (state.paddleWidth / 100) * width;
    const effectiveP1Y = playerNum === 1 ? localPaddleYRef.current : state.p1PaddleY;
    const p1Y = (effectiveP1Y / 100) * height - p1H / 2;

    // Paddle 1 (Left: Cyan)
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(15, p1Y, p1W, p1H, 6);
    ctx.fill();

    // Paddle 2 (Right: Rose)
    const p2H = (state.paddleHeight / 100) * height;
    const p2W = (state.paddleWidth / 100) * width;
    const effectiveP2Y = playerNum === 2 ? localPaddleYRef.current : state.p2PaddleY;
    const p2Y = (effectiveP2Y / 100) * height - p2H / 2;

    ctx.fillStyle = '#fb7185';
    ctx.shadowColor = '#fb7185';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(width - 15 - p2W, p2Y, p2W, p2H, 6);
    ctx.fill();

    // Ball with glow
    const ballX = (state.ball.x / 100) * width;
    const ballY = (state.ball.y / 100) * height;
    const ballR = Math.max(8, (state.ball.radius / 100) * width);

    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [state, playerNum]);

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-4 w-full max-w-xl select-none" dir="rtl">
      {/* Score Header */}
      <div className="flex items-center justify-between w-full px-6 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-mono shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">بازیکن ۱ {playerNum === 1 ? '(شما 🔵)' : ''}</span>
          <span className="text-2xl font-black text-cyan-400">{state.scores[1]}</span>
        </div>
        <span className="text-xs text-slate-400 font-bold bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
          هدف: {state.targetScore || 10} امتیاز
        </span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-rose-400">{state.scores[2]}</span>
          <span className="text-rose-400 font-bold">بازیکن ۲ {playerNum === 2 ? '(شما 🔴)' : ''}</span>
        </div>
      </div>

      {/* Pong Canvas Arena */}
      <div
        ref={touchAreaRef}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleTouchMove(e);
        }}
        onMouseDown={handleTouchMove}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchMove}
        className="relative w-full aspect-[16/9] rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-950 cursor-ns-resize touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Drag Helper overlay */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] text-slate-400 border border-slate-800 pointer-events-none backdrop-blur-sm">
          دکمه‌ها را نگه دارید یا انگشت خود را مستقیم روی صفحه بکشید
        </div>
      </div>

      {/* Touch Controls (Smooth Continuous Hold) */}
      <div className="flex gap-4 w-full justify-center pt-1" dir="ltr">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            startMoving('up');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            stopMoving();
          }}
          onPointerCancel={stopMoving}
          onPointerLeave={stopMoving}
          className="flex-1 max-w-[170px] h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-black transition shadow-lg cursor-pointer touch-none select-none"
        >
          <ChevronUp className="h-7 w-7" />
          <span className="text-sm font-bold mr-1">حرکت به بالا</span>
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            startMoving('down');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            stopMoving();
          }}
          onPointerCancel={stopMoving}
          onPointerLeave={stopMoving}
          className="flex-1 max-w-[170px] h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-black transition shadow-lg cursor-pointer touch-none select-none"
        >
          <ChevronDown className="h-7 w-7" />
          <span className="text-sm font-bold mr-1">حرکت به پایین</span>
        </button>
      </div>
    </div>
  );
};
