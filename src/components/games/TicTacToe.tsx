import React from 'react';
import { TicTacToeState } from '../../types';
import { sounds } from '../../utils/audio';

interface TicTacToeProps {
  state: TicTacToeState;
  playerNum: 1 | 2;
  onMove: (index: number) => void;
  disabled?: boolean;
}

export const TicTacToe: React.FC<TicTacToeProps> = ({
  state,
  playerNum,
  onMove,
  disabled = false,
}) => {
  const handleClick = (index: number) => {
    if (disabled || state.board[index] !== null) return;
    sounds.playMove();
    onMove(index);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 bg-slate-950 p-4 sm:p-5 rounded-3xl border-2 border-slate-800 shadow-2xl">
        {state.board.map((cell, idx) => {
          const isWinning = state.winningLine?.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              disabled={disabled || cell !== null}
              className={`h-20 w-20 sm:h-28 sm:w-28 rounded-2xl flex items-center justify-center text-4xl sm:text-6xl font-black transition-all cursor-pointer select-none ${
                cell === null && !disabled
                  ? 'bg-slate-900/90 hover:bg-slate-800 hover:scale-105 active:scale-95 border border-slate-800 hover:border-cyan-500/40 shadow-md'
                  : 'bg-slate-900/60 border border-slate-800/80 cursor-default'
              } ${
                isWinning
                  ? 'bg-emerald-950/80 border-2 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-105 animate-pulse'
                  : ''
              }`}
            >
              {cell === 1 && (
                <span className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)] animate-in zoom-in-50 duration-150">
                  ✕
                </span>
              )}
              {cell === 2 && (
                <span className="text-rose-400 drop-shadow-[0_0_12px_rgba(251,113,133,0.6)] animate-in zoom-in-50 duration-150">
                  ○
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-6 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          <span className="text-slate-300 font-bold">بازیکن ۱ (✕)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-400 shadow-sm shadow-rose-400" />
          <span className="text-slate-300 font-bold">بازیکن ۲ (○)</span>
        </div>
      </div>
    </div>
  );
};
