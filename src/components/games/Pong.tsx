import React, { useEffect, useRef } from 'react';
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

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      const currentY = playerNum === 1 ? state.p1PaddleY : state.p2PaddleY;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        onPaddleMove(Math.max(10, currentY - 7));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onPaddleMove(Math.min(90, currentY + 7));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, playerNum, state.p1PaddleY, state.p2PaddleY, onPaddleMove]);

  // Touch Move on Arena
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || !touchAreaRef.current) return;
    const rect = touchAreaRef.current.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relativeY = ((clientY - rect.top) / rect.height) * 100;
    onPaddleMove(Math.max(10, Math.min(90, relativeY)));
  };

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Center Dashed Line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddle 1 (Left: Blue)
    const p1H = (state.paddleHeight / 100) * height;
    const p1W = (state.paddleWidth / 100) * width;
    const p1Y = (state.p1PaddleY / 100) * height - p1H / 2;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(15, p1Y, p1W, p1H, 6);
    ctx.fill();

    // Paddle 2 (Right: Red)
    const p2H = (state.paddleHeight / 100) * height;
    const p2W = (state.paddleWidth / 100) * width;
    const p2Y = (state.p2PaddleY / 100) * height - p2H / 2;
    ctx.fillStyle = '#fb7185';
    ctx.shadowColor = '#fb7185';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(width - 15 - p2W, p2Y, p2W, p2H, 6);
    ctx.fill();

    // Ball
    const ballX = (state.ball.x / 100) * width;
    const ballY = (state.ball.y / 100) * height;
    const ballR = Math.max(6, (state.ball.radius / 100) * width);

    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [state]);

  const moveUp = () => {
    const currentY = playerNum === 1 ? state.p1PaddleY : state.p2PaddleY;
    onPaddleMove(Math.max(10, currentY - 10));
    sounds.playMove();
  };

  const moveDown = () => {
    const currentY = playerNum === 1 ? state.p1PaddleY : state.p2PaddleY;
    onPaddleMove(Math.min(90, currentY + 10));
    sounds.playMove();
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-4 w-full max-w-xl">
      {/* Score Header */}
      <div className="flex items-center justify-between w-full px-6 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-mono">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">بازیکن ۱ (شما: {playerNum === 1 ? '🔵' : '⚪'})</span>
          <span className="text-2xl font-black text-cyan-400">{state.scores[1]}</span>
        </div>
        <span className="text-xs text-slate-500 font-bold">هدف: ۱۰ امتیاز</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-rose-400">{state.scores[2]}</span>
          <span className="text-rose-400 font-bold">بازیکن ۲ (شما: {playerNum === 2 ? '🔴' : '⚪'})</span>
        </div>
      </div>

      {/* Pong Canvas Arena */}
      <div
        ref={touchAreaRef}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleTouchMove(e);
        }}
        onTouchMove={handleTouchMove}
        className="relative w-full aspect-[16/9] rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-950 cursor-ns-resize touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-full object-contain"
        />

        {/* Drag Helper overlay */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] text-slate-400 border border-slate-800 pointer-events-none">
          انگشت خود را روی صفحه بکشید یا دکمه‌های پایین را لمس کنید
        </div>
      </div>

      {/* Mobile Touch Controls */}
      <div className="flex gap-4 w-full justify-center pt-1">
        <button
          onClick={moveUp}
          className="flex-1 max-w-[160px] h-14 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-black transition shadow-lg cursor-pointer"
        >
          <ChevronUp className="h-7 w-7" />
          <span className="text-xs mr-1">بالا</span>
        </button>
        <button
          onClick={moveDown}
          className="flex-1 max-w-[160px] h-14 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-black transition shadow-lg cursor-pointer"
        >
          <ChevronDown className="h-7 w-7" />
          <span className="text-xs mr-1">پایین</span>
        </button>
      </div>
    </div>
  );
};
