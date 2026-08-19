import React from 'react';
import { ConnectFourState } from '../../types';
import { sounds } from '../../utils/audio';
import { ArrowDown } from 'lucide-react';

interface ConnectFourProps {
  state: ConnectFourState;
  playerNum: 1 | 2;
  onDrop: (col: number) => void;
  disabled?: boolean;
}

export const ConnectFour: React.FC<ConnectFourProps> = ({
  state,
  playerNum,
  onDrop,
  disabled = false,
}) => {
  const handleDrop = (col: number) => {
    if (disabled) return;
    if (state.grid[0][col] !== null) return; // Column is full
    sounds.playMove();
    onDrop(col);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-3">
      {/* Column Drop Buttons */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 w-full max-w-sm sm:max-w-md px-2">
        {[0, 1, 2, 3, 4, 5, 6].map((col) => {
          const isColFull = state.grid[0][col] !== null;
          return (
            <button
              key={`drop-btn-${col}`}
              onClick={() => handleDrop(col)}
              disabled={disabled || isColFull}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                disabled || isColFull
                  ? 'opacity-30 cursor-default bg-slate-900'
                  : 'bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 border border-slate-700 hover:border-cyan-400 cursor-pointer shadow-md hover:-translate-y-0.5'
              }`}
              title={`انداختن در ستون ${col + 1}`}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* Blue Connect Four Grid Rack */}
      <div className="rounded-3xl border-4 border-blue-600/80 bg-blue-900/40 p-3 sm:p-4 shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {state.grid.map((row, r) =>
            row.map((cell, c) => {
              const isWinning = state.winningCoords?.some(([wr, wc]) => wr === r && wc === c);
              const isLastDrop = state.lastDrop?.r === r && state.lastDrop?.c === c;

              return (
                <div
                  key={`cell-${r}-${c}`}
                  onClick={() => handleDrop(c)}
                  className={`h-11 w-11 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all ${
                    cell === null
                      ? 'bg-slate-950/90 shadow-inner'
                      : cell === 1
                      ? 'bg-gradient-to-tr from-rose-600 to-red-400 border-2 border-red-300 shadow-lg shadow-red-500/50'
                      : 'bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-yellow-200 shadow-lg shadow-yellow-500/50'
                  } ${
                    isWinning
                      ? 'scale-110 ring-4 ring-white animate-bounce z-10'
                      : ''
                  } ${isLastDrop ? 'animate-in fade-in zoom-in-75 duration-200' : ''}`}
                >
                  {isWinning && <span className="text-white text-xs font-black">★</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs font-mono pt-1">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
          <span className="text-slate-300 font-bold">بازیکن ۱ (🔴 قرمز)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400" />
          <span className="text-slate-300 font-bold">بازیکن ۲ (🟡 زرد)</span>
        </div>
      </div>
    </div>
  );
};
