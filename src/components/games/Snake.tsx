import React, { useEffect, useRef } from 'react';
import { SnakeState } from '../../types';
import { sounds } from '../../utils/audio';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface SnakeProps {
  state: SnakeState;
  playerNum: 1 | 2;
  onDirectionChange: (dir: { x: number; y: number }) => void;
  disabled?: boolean;
}

export const Snake: React.FC<SnakeProps> = ({
  state,
  playerNum,
  onDirectionChange,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        onDirectionChange({ x: 0, y: -1 });
        sounds.playClick();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onDirectionChange({ x: 0, y: 1 });
        sounds.playClick();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onDirectionChange({ x: -1, y: 0 });
        sounds.playClick();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onDirectionChange({ x: 1, y: 0 });
        sounds.playClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onDirectionChange]);

  // Swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || disabled) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 25) {
        onDirectionChange({ x: 1, y: 0 }); // Right
        sounds.playClick();
      } else if (dx < -25) {
        onDirectionChange({ x: -1, y: 0 }); // Left
        sounds.playClick();
      }
    } else {
      if (dy > 25) {
        onDirectionChange({ x: 0, y: 1 }); // Down
        sounds.playClick();
      } else if (dy < -25) {
        onDirectionChange({ x: 0, y: -1 }); // Up
        sounds.playClick();
      }
    }
  };

  // Render Grid on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / state.gridWidth;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid lines
    ctx.strokeStyle = '#131b2e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= state.gridWidth; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }

    // Food (Glow apples)
    state.food.forEach((f) => {
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(
        f.x * cellSize + cellSize / 2,
        f.y * cellSize + cellSize / 2,
        cellSize / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Snake 1 (Cyan / Blue)
    state.snake1.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? '#38bdf8' : '#0284c7';
      ctx.shadowColor = idx === 0 ? '#38bdf8' : 'transparent';
      ctx.shadowBlur = idx === 0 ? 8 : 0;
      ctx.beginPath();
      ctx.roundRect(
        seg.x * cellSize + 1,
        seg.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
        4
      );
      ctx.fill();
    });

    // Snake 2 (Rose / Red)
    state.snake2.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? '#fb7185' : '#e11d48';
      ctx.shadowColor = idx === 0 ? '#fb7185' : 'transparent';
      ctx.shadowBlur = idx === 0 ? 8 : 0;
      ctx.beginPath();
      ctx.roundRect(
        seg.x * cellSize + 1,
        seg.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
        4
      );
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }, [state]);

  const sendDir = (dir: { x: number; y: number }) => {
    sounds.playClick();
    onDirectionChange(dir);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-3 w-full max-w-lg select-none" dir="rtl">
      {/* Score Header */}
      <div className="flex items-center justify-between w-full px-5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono shadow-md">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-cyan-400" />
          <span className="text-cyan-400 font-bold">مار ۱ {playerNum === 1 ? '(شما 🔵)' : ''}:</span>
          <span className="text-base font-black text-cyan-300">{state.scores[1]}</span>
        </div>
        <span className="text-slate-500 font-bold text-[11px]">با دکمه‌ها یا کشیدن انگشت</span>
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-rose-300">{state.scores[2]}</span>
          <span className="text-rose-400 font-bold">مار ۲ {playerNum === 2 ? '(شما 🔴)' : ''}:</span>
          <span className="h-3 w-3 rounded-full bg-rose-400" />
        </div>
      </div>

      {/* Snake Canvas with Swipe Support */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-square max-w-[360px] sm:max-w-[400px] rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-950 touch-none cursor-pointer"
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Mobile D-Pad (FORCED LTR so Left is physically on the left, Right is on the right) */}
      <div className="flex flex-col items-center pt-1" dir="ltr">
        <div className="grid grid-cols-3 gap-2 w-48">
          {/* Row 1: Up in center */}
          <div />
          <button
            type="button"
            onClick={() => sendDir({ x: 0, y: -1 })}
            className="h-12 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow-md cursor-pointer touch-none"
            aria-label="بالا"
          >
            <ChevronUp className="h-7 w-7" />
          </button>
          <div />

          {/* Row 2: Left, Down, Right */}
          <button
            type="button"
            onClick={() => sendDir({ x: -1, y: 0 })}
            className="h-12 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow-md cursor-pointer touch-none"
            aria-label="چپ"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={() => sendDir({ x: 0, y: 1 })}
            className="h-12 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow-md cursor-pointer touch-none"
            aria-label="پایین"
          >
            <ChevronDown className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={() => sendDir({ x: 1, y: 0 })}
            className="h-12 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold transition shadow-md cursor-pointer touch-none"
            aria-label="راست"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
