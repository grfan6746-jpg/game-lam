import React from 'react';
import { DotsBoxesState } from '../../types';
import { sounds } from '../../utils/audio';

interface DotsAndBoxesProps {
  state: DotsBoxesState;
  playerNum: 1 | 2;
  onMove: (type: 'h' | 'v', r: number, c: number) => void;
  disabled?: boolean;
}

export const DotsAndBoxes: React.FC<DotsAndBoxesProps> = ({
  state,
  playerNum,
  onMove,
  disabled = false,
}) => {
  const handleLineClick = (type: 'h' | 'v', r: number, c: number) => {
    if (disabled) return;
    if (type === 'h' && state.hLines[r][c]) return;
    if (type === 'v' && state.vLines[r][c]) return;

    sounds.playMove();
    onMove(type, r, c);
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 space-y-4">
      {/* Score overview */}
      <div className="flex items-center justify-center gap-8 rounded-2xl bg-slate-950/80 border border-slate-800 px-6 py-2 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400" />
          <span className="text-xs font-bold text-slate-300">امتیاز بازیکن ۱:</span>
          <span className="font-mono text-lg font-black text-cyan-400">{state.scores[1]}</span>
        </div>
        <div className="h-4 w-px bg-slate-800" />
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-rose-400 shadow-md shadow-rose-400" />
          <span className="text-xs font-bold text-slate-300">امتیاز بازیکن ۲:</span>
          <span className="font-mono text-lg font-black text-rose-400">{state.scores[2]}</span>
        </div>
      </div>

      {/* Grid Canvas Board */}
      <div className="relative rounded-3xl border-2 border-slate-800 bg-slate-950 p-4 sm:p-8 shadow-2xl">
        <div className="flex flex-col">
          {[0, 1, 2, 3].map((r) => (
            <React.Fragment key={`row-${r}`}>
              {/* Dots + Horizontal Lines */}
              <div className="flex items-center">
                {[0, 1, 2, 3].map((c) => (
                  <React.Fragment key={`dot-h-${r}-${c}`}>
                    {/* Dot */}
                    <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-slate-300 border-2 border-slate-900 shadow-md shadow-cyan-500/20 z-10" />

                    {/* Horizontal Line between (r, c) and (r, c+1) */}
                    {c < 3 && (
                      <button
                        onClick={() => handleLineClick('h', r, c)}
                        disabled={disabled || state.hLines[r][c]}
                        className={`h-3.5 sm:h-4 w-16 sm:w-20 rounded-full transition-all cursor-pointer select-none mx-0.5 ${
                          state.hLines[r][c]
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-md shadow-cyan-500/40 cursor-default'
                            : disabled
                            ? 'bg-slate-800/40 cursor-default'
                            : 'bg-slate-800/80 hover:bg-cyan-500/40 hover:scale-y-125'
                        }`}
                        title={`خط افقی ردیف ${r + 1} ستون ${c + 1}`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Vertical Lines + Boxes */}
              {r < 3 && (
                <div className="flex items-center my-0.5">
                  {[0, 1, 2, 3].map((c) => (
                    <React.Fragment key={`v-box-${r}-${c}`}>
                      {/* Vertical Line */}
                      <button
                        onClick={() => handleLineClick('v', r, c)}
                        disabled={disabled || state.vLines[r][c]}
                        className={`w-3.5 sm:w-4 h-16 sm:h-20 rounded-full transition-all cursor-pointer select-none ${
                          state.vLines[r][c]
                            ? 'bg-gradient-to-b from-cyan-400 to-blue-500 shadow-md shadow-cyan-500/40 cursor-default'
                            : disabled
                            ? 'bg-slate-800/40 cursor-default'
                            : 'bg-slate-800/80 hover:bg-cyan-500/40 hover:scale-x-125'
                        }`}
                        title={`خط عمودی ردیف ${r + 1} ستون ${c + 1}`}
                      />

                      {/* Box inside */}
                      {c < 3 && (
                        <div
                          className={`h-16 sm:h-20 w-16 sm:w-20 rounded-xl mx-0.5 flex items-center justify-center text-lg sm:text-2xl font-black transition-all ${
                            state.boxes[r][c] === 1
                              ? 'bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 shadow-inner'
                              : state.boxes[r][c] === 2
                              ? 'bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-inner'
                              : 'bg-slate-900/30'
                          }`}
                        >
                          {state.boxes[r][c] === 1 && 'P1'}
                          {state.boxes[r][c] === 2 && 'P2'}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center max-w-sm">
        روی خطوط خاکستری کلیک یا لمس کنید تا خط کشیده شود. با کامل کردن ۴ ضلع هر مربع، امتیاز و یک نوبت جایزه می‌گیرید!
      </p>
    </div>
  );
};
