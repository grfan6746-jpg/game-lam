import React, { useState } from 'react';
import { LudoState, LudoColor } from '../../types';
import { sounds } from '../../utils/audio';
import { Dices, Trophy, Bot, User, Star, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';

interface LudoProps {
  state: LudoState;
  playerNum: 1 | 2 | 3 | 4;
  onRollDice: () => void;
  onMoveToken: (tokenId: number) => void;
  disabled?: boolean;
}

// 52 Main Track Coordinates on a 15x15 Grid (0-indexed [r, c])
export const LUDO_TRACK_COORDS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], // 0-4 (Red runway to top)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // 5-10
  [0, 7], // 11 (Top center)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // 12-17 (Green start is 13 at [1,8])
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23
  [7, 14], // 24 (Right center)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 25-30 (Yellow start is 26 at [8,13])
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36
  [14, 7], // 37 (Bottom center)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 38-43 (Blue start is 39 at [13,6])
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44-49
  [7, 0], // 50 (Left center)
  [6, 0], // 51 (Loop end before Red home)
];

// Colored Home Run Paths (5 steps to home + 1 center tile = 6 steps)
export const LUDO_HOME_PATHS: { [color in LudoColor]: [number, number][] } = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Safe spots where pieces cannot be captured (Star cells on track index)
export const SAFE_TRACK_INDEXES = [0, 8, 13, 21, 26, 34, 39, 47];

// Base Yard Positions in Grid Coordinates (for 4 tokens in each yard)
export const BASE_YARDS_COORDS: { [color in LudoColor]: [number, number][] } = {
  red: [[1.8, 1.8], [1.8, 4.2], [4.2, 1.8], [4.2, 4.2]],
  green: [[1.8, 10.8], [1.8, 13.2], [4.2, 10.8], [4.2, 13.2]],
  yellow: [[10.8, 10.8], [10.8, 13.2], [13.2, 10.8], [13.2, 13.2]],
  blue: [[10.8, 1.8], [10.8, 4.2], [13.2, 1.8], [13.2, 4.2]],
};

// Starting track offset index for each color
export const COLOR_TRACK_OFFSETS: { [color in LudoColor]: number } = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const Ludo: React.FC<LudoProps> = ({
  state,
  playerNum,
  onRollDice,
  onMoveToken,
  disabled = false,
}) => {
  const [rollingAnim, setRollingAnim] = useState(false);

  const currentSlot = state.players[state.currentTurn];
  const isMyTurn = state.currentTurn === playerNum;

  // Dice roll trigger
  const handleRollClick = () => {
    if (disabled || !isMyTurn || state.hasRolled || currentSlot?.isAi) return;
    setRollingAnim(true);
    sounds.playMove();
    setTimeout(() => {
      setRollingAnim(false);
      onRollDice();
    }, 350);
  };

  // Move token click
  const handleTokenClick = (pNum: number, tId: number) => {
    if (disabled || pNum !== state.currentTurn) return;
    if (!isMyTurn && !currentSlot?.isAi) return;
    if (!state.hasRolled) return;
    if (!state.movableTokenIds.includes(tId)) return;

    sounds.playCapture();
    onMoveToken(tId);
  };

  // Color config helpers
  const getColorHex = (color: LudoColor) => {
    switch (color) {
      case 'red': return '#ef4444';
      case 'green': return '#10b981';
      case 'yellow': return '#f59e0b';
      case 'blue': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const getColorGradient = (color: LudoColor) => {
    switch (color) {
      case 'red': return { light: '#f87171', main: '#dc2626', dark: '#991b1b' };
      case 'green': return { light: '#34d399', main: '#059669', dark: '#065f46' };
      case 'yellow': return { light: '#fde047', main: '#d97706', dark: '#92400e' };
      case 'blue': return { light: '#60a5fa', main: '#2563eb', dark: '#1e40af' };
      default: return { light: '#cbd5e1', main: '#64748b', dark: '#334155' };
    }
  };

  const getColorNameFa = (color: LudoColor) => {
    switch (color) {
      case 'red': return 'قرمز 🔴';
      case 'green': return 'سبز 🟢';
      case 'yellow': return 'زرد 🟡';
      case 'blue': return 'آبی 🔵';
      default: return '';
    }
  };

  // Compute (r, c) on a 15x15 board
  const getTokenCoords = (color: LudoColor, step: number, tokenId: number): [number, number] => {
    if (step === -1) {
      return BASE_YARDS_COORDS[color][tokenId];
    }
    if (step >= 0 && step <= 50) {
      const trackIndex = (COLOR_TRACK_OFFSETS[color] + step) % 52;
      return LUDO_TRACK_COORDS[trackIndex];
    }
    if (step >= 51 && step <= 56) {
      const homePathIndex = step - 51;
      return LUDO_HOME_PATHS[color][homePathIndex];
    }
    return [7, 7];
  };

  // Gather all tokens on board to compute collision offsets
  const allTokensWithCoords: {
    playerNum: 1 | 2 | 3 | 4;
    color: LudoColor;
    tokenId: number;
    step: number;
    r: number;
    c: number;
    isMovable: boolean;
  }[] = [];

  state.activePlayerNums.forEach((pNum) => {
    const pSlot = state.players[pNum];
    pSlot.tokens.forEach((token) => {
      const [r, c] = getTokenCoords(pSlot.color, token.step, token.id);
      const isMovable =
        state.currentTurn === pNum &&
        state.hasRolled &&
        state.movableTokenIds.includes(token.id);

      allTokensWithCoords.push({
        playerNum: pNum,
        color: pSlot.color,
        tokenId: token.id,
        step: token.step,
        r,
        c,
        isMovable,
      });
    });
  });

  // Calculate pixel offsets for overlapping tokens on the exact same tile
  const tileOccupancy: { [key: string]: number } = {};
  const tokenOffsets: { [key: string]: { dx: number; dy: number } } = {};

  allTokensWithCoords.forEach((item) => {
    // Only apply collision offset on track/home (not in base yard because base yards have 4 distinct slots)
    if (item.step >= 0) {
      const key = `${Math.round(item.r)}-${Math.round(item.c)}`;
      const count = tileOccupancy[key] || 0;
      tileOccupancy[key] = count + 1;

      // Small radial shift if multiple tokens on the same spot
      if (count === 0) {
        tokenOffsets[`${item.playerNum}-${item.tokenId}`] = { dx: 0, dy: 0 };
      } else if (count === 1) {
        tokenOffsets[`${item.playerNum}-${item.tokenId}`] = { dx: -7, dy: -7 };
      } else if (count === 2) {
        tokenOffsets[`${item.playerNum}-${item.tokenId}`] = { dx: 7, dy: 7 };
      } else {
        tokenOffsets[`${item.playerNum}-${item.tokenId}`] = { dx: 7, dy: -7 };
      }
    } else {
      tokenOffsets[`${item.playerNum}-${item.tokenId}`] = { dx: 0, dy: 0 };
    }
  });

  // Cell size in SVG units (600x600 board with 15x15 cells => exactly 40x40 per cell)
  const cellSize = 40;

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-3 w-full max-w-xl select-none" dir="rtl">
      {/* Top Banner: Turn & Status */}
      <div className="flex items-center justify-between w-full px-5 py-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border border-white/20 transition-transform"
            style={{ backgroundColor: getColorHex(currentSlot?.color || 'red') }}
          >
            {currentSlot?.isAi ? <Bot className="w-5 h-5 text-slate-950" /> : <User className="w-5 h-5 text-slate-950" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-100">
                نوبت بازیکن {state.currentTurn} ({getColorNameFa(currentSlot?.color || 'red')})
              </span>
              {currentSlot?.isAi && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                  ربات AI 🤖
                </span>
              )}
              {isMyTurn && !currentSlot?.isAi && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold animate-pulse">
                  نوبت شماست!
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">
              {state.lastActionText || (state.hasRolled ? 'مهره مورد نظر را لمس کنید' : 'تاس بیندازید')}
            </div>
          </div>
        </div>

        {/* Dice Widget */}
        <div className="flex items-center gap-2">
          {state.diceValue ? (
            <div className="flex flex-col items-center">
              <div className={`w-11 h-11 rounded-2xl bg-slate-100 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg border-2 border-amber-400 ${
                rollingAnim ? 'animate-spin' : 'animate-bounce'
              }`}>
                {state.diceValue}
              </div>
              {state.diceValue === 6 && (
                <span className="text-[10px] text-amber-400 font-bold mt-0.5">جایزه ۶! ⭐</span>
              )}
            </div>
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs font-bold">
              🎲 —
            </div>
          )}
        </div>
      </div>

      {/* Players Progress Bar */}
      <div className={`grid gap-2 w-full ${state.totalPlayers === 2 ? 'grid-cols-2' : state.totalPlayers === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {state.activePlayerNums.map((pNum) => {
          const pSlot = state.players[pNum];
          const isCurrent = state.currentTurn === pNum;
          const isMe = playerNum === pNum;

          return (
            <div
              key={pNum}
              className={`p-2 rounded-2xl border transition-all ${
                isCurrent
                  ? 'bg-slate-900 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1" style={{ color: getColorHex(pSlot.color) }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorHex(pSlot.color) }} />
                  {pSlot.name} {isMe ? '(شما)' : ''}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {pSlot.tokens.filter((t) => t.step === 56).length}/4 🏁
                </span>
              </div>
              {/* Token mini dots */}
              <div className="flex items-center gap-1 mt-1.5 justify-center">
                {pSlot.tokens.map((t) => (
                  <span
                    key={t.id}
                    className={`w-2 h-2 rounded-full border ${
                      t.step === 56
                        ? 'bg-amber-400 border-amber-300'
                        : t.step >= 0
                        ? 'bg-slate-300 border-slate-400'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 15x15 Vector SVG Ludo Board (600x600) */}
      <div className="relative w-full aspect-square max-w-[430px] rounded-3xl p-2.5 bg-slate-950 border-4 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full rounded-2xl drop-shadow-lg"
          style={{ touchAction: 'manipulation' }}
        >
          <defs>
            {/* Gradients for Yard Bases */}
            <linearGradient id="redBaseGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="greenBaseGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="yellowBaseGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="blueBaseGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Token 3D Gradients */}
            <radialGradient id="tokenRed" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
            <radialGradient id="tokenGreen" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#065f46" />
            </radialGradient>
            <radialGradient id="tokenYellow" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </radialGradient>
            <radialGradient id="tokenBlue" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </radialGradient>

            {/* Drop Shadow Filter */}
            <filter id="tokenShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.6" />
            </filter>
            <filter id="glowMovable" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Board Background */}
          <rect width="600" height="600" fill="#0f172a" />

          {/* 1. Track Cells (15x15) */}
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              // Skip 4 big corner bases (6x6) and center (3x3)
              const inCorner =
                (r < 6 && c < 6) ||
                (r < 6 && c >= 9) ||
                (r >= 9 && c < 6) ||
                (r >= 9 && c >= 9);
              const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

              if (inCorner || inCenter) return null;

              const x = c * cellSize;
              const y = r * cellSize;

              // Check if home path
              const isRedHome = r === 7 && c >= 1 && c <= 5;
              const isGreenHome = c === 7 && r >= 1 && r <= 5;
              const isYellowHome = r === 7 && c >= 9 && c <= 13;
              const isBlueHome = c === 7 && r >= 9 && r <= 13;

              // Starting cells
              const isRedStart = r === 6 && c === 1;
              const isGreenStart = r === 1 && c === 8;
              const isYellowStart = r === 8 && c === 13;
              const isBlueStart = r === 13 && c === 6;

              // Safe star cells
              const isSafe =
                (r === 6 && c === 1) ||
                (r === 2 && c === 6) ||
                (r === 1 && c === 8) ||
                (r === 6 && c === 12) ||
                (r === 8 && c === 13) ||
                (r === 12 && c === 8) ||
                (r === 13 && c === 6) ||
                (r === 8 && c === 2);

              let fillColor = '#1e293b';
              let strokeColor = '#334155';

              if (isRedHome || isRedStart) {
                fillColor = '#ef4444';
                strokeColor = '#dc2626';
              } else if (isGreenHome || isGreenStart) {
                fillColor = '#10b981';
                strokeColor = '#059669';
              } else if (isYellowHome || isYellowStart) {
                fillColor = '#f59e0b';
                strokeColor = '#d97706';
              } else if (isBlueHome || isBlueStart) {
                fillColor = '#3b82f6';
                strokeColor = '#2563eb';
              }

              return (
                <g key={`cell-${r}-${c}`}>
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx="4"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="1.5"
                  />
                  {isSafe && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 5}
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="16"
                      fontWeight="bold"
                    >
                      ★
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* 2. Red Yard Base (Top-Left 6x6: 0,0 to 240,240) */}
          <g>
            <rect x="2" y="2" width="236" height="236" rx="16" fill="url(#redBaseGrad)" stroke="#b91c1c" strokeWidth="3" />
            <rect x="24" y="24" width="192" height="192" rx="12" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
            <text x="120" y="52" textAnchor="middle" fill="#fca5a5" fontSize="13" fontWeight="900" letterSpacing="1">
              🔴 RED YARD
            </text>
            {/* 4 Inner White Circles */}
            {BASE_YARDS_COORDS.red.map(([r, c], idx) => (
              <circle
                key={`red-nest-${idx}`}
                cx={c * cellSize + cellSize / 2}
                cy={r * cellSize + cellSize / 2}
                r="18"
                fill="#1e293b"
                stroke="#ef4444"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* 3. Green Yard Base (Top-Right 6x6: 360,0 to 600,240) */}
          <g>
            <rect x="362" y="2" width="236" height="236" rx="16" fill="url(#greenBaseGrad)" stroke="#047857" strokeWidth="3" />
            <rect x="384" y="24" width="192" height="192" rx="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
            <text x="480" y="52" textAnchor="middle" fill="#6ee7b7" fontSize="13" fontWeight="900" letterSpacing="1">
              🟢 GREEN YARD
            </text>
            {/* 4 Inner White Circles */}
            {BASE_YARDS_COORDS.green.map(([r, c], idx) => (
              <circle
                key={`green-nest-${idx}`}
                cx={c * cellSize + cellSize / 2}
                cy={r * cellSize + cellSize / 2}
                r="18"
                fill="#1e293b"
                stroke="#10b981"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* 4. Yellow Yard Base (Bottom-Right 6x6: 360,360 to 600,600) */}
          <g opacity={state.totalPlayers < 3 ? 0.35 : 1}>
            <rect x="362" y="362" width="236" height="236" rx="16" fill="url(#yellowBaseGrad)" stroke="#b45309" strokeWidth="3" />
            <rect x="384" y="384" width="192" height="192" rx="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
            <text x="480" y="412" textAnchor="middle" fill="#fde047" fontSize="13" fontWeight="900" letterSpacing="1">
              {state.totalPlayers < 3 ? 'خاموش' : '🟡 YELLOW YARD'}
            </text>
            {BASE_YARDS_COORDS.yellow.map(([r, c], idx) => (
              <circle
                key={`yellow-nest-${idx}`}
                cx={c * cellSize + cellSize / 2}
                cy={r * cellSize + cellSize / 2}
                r="18"
                fill="#1e293b"
                stroke="#f59e0b"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* 5. Blue Yard Base (Bottom-Left 6x6: 0,360 to 240,600) */}
          <g opacity={state.totalPlayers < 4 ? 0.35 : 1}>
            <rect x="2" y="362" width="236" height="236" rx="16" fill="url(#blueBaseGrad)" stroke="#1d4ed8" strokeWidth="3" />
            <rect x="24" y="384" width="192" height="192" rx="12" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
            <text x="120" y="412" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="900" letterSpacing="1">
              {state.totalPlayers < 4 ? 'خاموش' : '🔵 BLUE YARD'}
            </text>
            {BASE_YARDS_COORDS.blue.map(([r, c], idx) => (
              <circle
                key={`blue-nest-${idx}`}
                cx={c * cellSize + cellSize / 2}
                cy={r * cellSize + cellSize / 2}
                r="18"
                fill="#1e293b"
                stroke="#3b82f6"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* 6. Center Home (3x3: 240,240 to 360,360) 4 Triangles + Golden Trophy */}
          <g>
            {/* Red Triangle */}
            <polygon points="240,240 300,300 240,360" fill="#ef4444" stroke="#dc2626" strokeWidth="1.5" />
            {/* Green Triangle */}
            <polygon points="240,240 300,300 360,240" fill="#10b981" stroke="#059669" strokeWidth="1.5" />
            {/* Yellow Triangle */}
            <polygon points="360,240 300,300 360,360" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
            {/* Blue Triangle */}
            <polygon points="240,360 300,300 360,360" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5" />

            {/* Central Badge */}
            <circle cx="300" cy="300" r="22" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
            <text x="300" y="306" textAnchor="middle" fill="#fde047" fontSize="18" fontWeight="bold">
              🏆
            </text>
          </g>

          {/* 7. Pawns / Tokens (Crisp Vector 3D Tokens with Exact Centering & Proportions) */}
          {allTokensWithCoords.map((item) => {
            const offsets = tokenOffsets[`${item.playerNum}-${item.tokenId}`] || { dx: 0, dy: 0 };
            const cx = item.c * cellSize + cellSize / 2 + offsets.dx;
            const cy = item.r * cellSize + cellSize / 2 + offsets.dy;
            const tokenGradId =
              item.color === 'red'
                ? 'url(#tokenRed)'
                : item.color === 'green'
                ? 'url(#tokenGreen)'
                : item.color === 'yellow'
                ? 'url(#tokenYellow)'
                : 'url(#tokenBlue)';

            return (
              <g
                key={`pawn-${item.playerNum}-${item.tokenId}`}
                onClick={() => handleTokenClick(item.playerNum, item.tokenId)}
                style={{
                  cursor: item.isMovable ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Movable Glow & Pulse Ring */}
                {item.isMovable && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="19"
                    fill="none"
                    stroke="#fde047"
                    strokeWidth="3.5"
                    strokeDasharray="4 2"
                    className="animate-spin"
                    filter="url(#glowMovable)"
                  />
                )}

                {/* Pawn Base Shadow */}
                <ellipse cx={cx} cy={cy + 3} rx="14" ry="7" fill="#000000" opacity="0.45" />

                {/* 3D Pawn Body */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="13.5"
                  fill={tokenGradId}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="url(#tokenShadow)"
                />

                {/* Glossy Specular Highlight on Head */}
                <ellipse cx={cx - 3.5} cy={cy - 4} rx="4.5" ry="2.5" fill="#ffffff" opacity="0.65" />

                {/* Token ID or Star Badge */}
                <text
                  x={cx}
                  y={cy + 4.5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="900"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {item.step === 56 ? '★' : item.tokenId + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Dice Roll Button & Action Center */}
      <div className="flex items-center justify-center gap-4 w-full pt-1">
        <button
          type="button"
          onClick={handleRollClick}
          disabled={disabled || !isMyTurn || state.hasRolled || currentSlot?.isAi}
          className={`h-14 px-8 rounded-2xl font-black text-base flex items-center gap-3 transition-all shadow-xl cursor-pointer ${
            !disabled && isMyTurn && !state.hasRolled && !currentSlot?.isAi
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 ring-4 ring-amber-400/40 hover:scale-105 active:scale-95 animate-pulse'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          <Dices className={`w-7 h-7 ${rollingAnim ? 'animate-spin' : ''}`} />
          <span>
            {currentSlot?.isAi
              ? 'نوبت ربات هوش مصنوعی...'
              : isMyTurn
              ? state.hasRolled
                ? 'مهره مورد نظر را لمس کنید'
                : 'پرتاب تاس (Roll Dice)'
              : 'منتظر حریف...'}
          </span>
        </button>
      </div>
    </div>
  );
};
