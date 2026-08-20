import React from 'react';
import { DotsBoxesState } from '../../types';
import { sounds } from '../../utils/audio';

interface DotsAndBoxesProps {
  state: DotsBoxesState;
  playerNum: 1 | 2;
  onMove: (type: 'h' | 'v', r: number, c: number) => void;
  disabled?: boolean;
  onChangeGridSize?: (size: number) => void;
}

export const DotsAndBoxes: React.FC<DotsAndBoxesProps> = ({
  state,
  playerNum,
  onMove,
  disabled = false,
  onChangeGridSize,
}) => {
  const gridSize = state.gridSize || 4; // 4 to 9 dots
  const numDots = Math.min(Math.max(gridSize, 4), 9);
  const numBoxes = numDots - 1;

  const handleLineClick = (type: 'h' | 'v', r: number, c: number) => {
    if (disabled) return;
    const hVal = state.hLines[r]?.[c];
    const vVal = state.vLines[r]?.[c];
    if (type === 'h' && (hVal === 1 || hVal === 2 || hVal === true)) return;
    if (type === 'v' && (vVal === 1 || vVal === 2 || vVal === true)) return;

    sounds.playMove();
    onMove(type, r, c);
  };

  const getLineClass = (val: any, isHorizontal: boolean) => {
    const isP1 = val === 1 || val === '1';
    const isP2 = val === 2 || val === '2';
    const isLegacyTrue = val === true;

    if (isP1 || (isLegacyTrue && state.currentTurn === 1)) {
      return 'bg-cyan-400 shadow-md shadow-cyan-400/70 ring-1 ring-cyan-300 cursor-default';
    }
    if (isP2 || (isLegacyTrue && state.currentTurn === 2)) {
      return 'bg-rose-500 shadow-md shadow-rose-500/70 ring-1 ring-rose-300 cursor-default';
    }
    if (disabled) {
      return 'bg-slate-800/60 cursor-default';
    }
    return isHorizontal
      ? 'bg-slate-800 hover:bg-cyan-500/50 transition-colors cursor-pointer'
      : 'bg-slate-800 hover:bg-cyan-500/50 transition-colors cursor-pointer';
  };

  // Dimensions based on grid size for responsiveness
  const getDimensions = () => {
    switch (numDots) {
      case 4:
        return { dotSize: 16, boxSize: 62, lineThickness: 4, textSize: 'text-xl sm:text-2xl', dotRadius: 8 };
      case 5:
        return { dotSize: 14, boxSize: 52, lineThickness: 4, textSize: 'text-lg sm:text-xl', dotRadius: 7 };
      case 6:
        return { dotSize: 13, boxSize: 42, lineThickness: 3.5, textSize: 'text-base sm:text-lg', dotRadius: 6.5 };
      case 7:
        return { dotSize: 12, boxSize: 35, lineThickness: 3.5, textSize: 'text-sm sm:text-base', dotRadius: 6 };
      case 8:
        return { dotSize: 11, boxSize: 30, lineThickness: 3, textSize: 'text-xs sm:text-sm', dotRadius: 5.5 };
      case 9:
      default:
        return { dotSize: 10, boxSize: 26, lineThickness: 3, textSize: 'text-[11px] sm:text-xs', dotRadius: 5 };
    }
  };

  const dim = getDimensions();
  const totalGridRows = 2 * numDots - 1;
  const totalGridCols = 2 * numDots - 1;

  const gridTemplateCols = Array.from({ length: totalGridCols }, (_, i) =>
    i % 2 === 0 ? `${dim.dotSize}px` : `${dim.boxSize}px`
  ).join(' ');

  const gridTemplateRows = Array.from({ length: totalGridRows }, (_, i) =>
    i % 2 === 0 ? `${dim.dotSize}px` : `${dim.boxSize}px`
  ).join(' ');

  return (
    <div className="flex flex-col items-center justify-center p-1 sm:p-2 space-y-4 max-w-full">
      {/* Grid Size Selector Pills (۴×۴ تا ۹×۹) */}
      {onChangeGridSize && (
        <div className="flex flex-col items-center space-y-1.5 bg-slate-900/90 border border-slate-800 px-3 sm:px-4 py-2 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between w-full gap-2">
            <span className="text-[11px] font-bold text-slate-400">اندازه زمین:</span>
            <span className="text-[11px] font-mono text-cyan-400 font-bold">
              {numDots}×{numDots} نقطه ({numBoxes}×{numBoxes} مربع)
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
            {[4, 5, 6, 7, 8, 9].map((size) => (
              <button
                key={`size-${size}`}
                onClick={() => {
                  if (size !== numDots) {
                    sounds.playClick();
                    onChangeGridSize(size);
                  }
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                  size === numDots
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Score overview with Player Colors */}
      <div className="flex items-center justify-center gap-6 sm:gap-8 rounded-2xl bg-slate-950/95 border border-slate-800 px-5 sm:px-7 py-2 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-md shadow-cyan-400 ring-2 ring-cyan-300/30" />
          <span className="text-xs font-bold text-cyan-300">آبی (P1):</span>
          <span className="font-mono text-lg sm:text-xl font-black text-cyan-400">{state.scores[1]}</span>
        </div>
        <div className="h-5 w-px bg-slate-800" />
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500 shadow-md shadow-rose-500 ring-2 ring-rose-300/30" />
          <span className="text-xs font-bold text-rose-300">قرمز (P2):</span>
          <span className="font-mono text-lg sm:text-xl font-black text-rose-400">{state.scores[2]}</span>
        </div>
        <div className="h-5 w-px bg-slate-800" />
        <div className="text-[11px] font-mono text-slate-400">
          باقی‌مانده: {numBoxes * numBoxes - (state.scores[1] + state.scores[2])}
        </div>
      </div>

      {/* Perfectly Aligned CSS Grid Board */}
      <div className="relative rounded-3xl border-2 border-slate-800 bg-slate-950 p-3 sm:p-6 shadow-2xl overflow-x-auto max-w-full">
        <div
          className="grid mx-auto select-none"
          style={{
            gridTemplateColumns: gridTemplateCols,
            gridTemplateRows: gridTemplateRows,
            width: 'max-content',
          }}
        >
          {Array.from({ length: totalGridRows }).map((_, gridRow) =>
            Array.from({ length: totalGridCols }).map((__, gridCol) => {
              const isEvenRow = gridRow % 2 === 0;
              const isEvenCol = gridCol % 2 === 0;
              const key = `cell-${gridRow}-${gridCol}`;

              // 1. Dot: Even Row + Even Col
              if (isEvenRow && isEvenCol) {
                const r = gridRow / 2;
                const c = gridCol / 2;
                return (
                  <div
                    key={key}
                    className="w-full h-full flex items-center justify-center z-10 pointer-events-none"
                  >
                    <div
                      style={{
                        width: `${dim.dotSize}px`,
                        height: `${dim.dotSize}px`,
                      }}
                      className="rounded-full bg-slate-200 border-2 border-slate-900 shadow-sm shadow-cyan-500/30"
                    />
                  </div>
                );
              }

              // 2. Horizontal Line: Even Row + Odd Col
              if (isEvenRow && !isEvenCol) {
                const r = gridRow / 2;
                const c = (gridCol - 1) / 2;
                const hVal = state.hLines[r]?.[c];
                const isClaimed = hVal === 1 || hVal === 2 || hVal === true;

                return (
                  <div
                    key={key}
                    className="w-full h-full flex items-center justify-center px-0.5"
                  >
                    <button
                      onClick={() => handleLineClick('h', r, c)}
                      disabled={disabled || isClaimed}
                      style={{
                        height: `${dim.lineThickness}px`,
                      }}
                      className={`w-full rounded-full transition-all select-none ${getLineClass(
                        hVal,
                        true
                      )}`}
                      title={`خط افقی ردیف ${r + 1} ستون ${c + 1}`}
                    />
                  </div>
                );
              }

              // 3. Vertical Line: Odd Row + Even Col (EXACT SAME COLUMN AS THE DOTS -> 100% PERFECTLY ALIGNED!)
              if (!isEvenRow && isEvenCol) {
                const r = (gridRow - 1) / 2;
                const c = gridCol / 2;
                const vVal = state.vLines[r]?.[c];
                const isClaimed = vVal === 1 || vVal === 2 || vVal === true;

                return (
                  <div
                    key={key}
                    className="w-full h-full flex items-center justify-center py-0.5"
                  >
                    <button
                      onClick={() => handleLineClick('v', r, c)}
                      disabled={disabled || isClaimed}
                      style={{
                        width: `${dim.lineThickness}px`,
                      }}
                      className={`h-full rounded-full transition-all select-none ${getLineClass(
                        vVal,
                        false
                      )}`}
                      title={`خط عمودی ردیف ${r + 1} ستون ${c + 1}`}
                    />
                  </div>
                );
              }

              // 4. Box: Odd Row + Odd Col
              if (!isEvenRow && !isEvenCol) {
                const r = (gridRow - 1) / 2;
                const c = (gridCol - 1) / 2;
                const boxOwner = state.boxes[r]?.[c];

                return (
                  <div
                    key={key}
                    className={`w-full h-full m-0.5 rounded-lg flex items-center justify-center font-black transition-all ${
                      boxOwner === 1
                        ? 'bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 shadow-inner'
                        : boxOwner === 2
                        ? 'bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-inner'
                        : 'bg-slate-900/30'
                    }`}
                  >
                    {boxOwner === 1 && (
                      <span className={`${dim.textSize} text-cyan-400 drop-shadow`}>P1</span>
                    )}
                    {boxOwner === 2 && (
                      <span className={`${dim.textSize} text-rose-400 drop-shadow`}>P2</span>
                    )}
                  </div>
                );
              }

              return null;
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <span className="h-2 w-5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 inline-block" />
          <span>خط بازیکن آبی (P1)</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-400">
          <span className="h-2 w-5 rounded-full bg-rose-500 shadow-sm shadow-rose-500 inline-block" />
          <span>خط بازیکن قرمز (P2)</span>
        </div>
      </div>
    </div>
  );
};
