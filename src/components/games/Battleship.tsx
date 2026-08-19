import React, { useState } from 'react';
import { BattleshipState, Ship } from '../../types';
import { sounds } from '../../utils/audio';
import { Shuffle, CheckCircle, Crosshair, Anchor, ShieldAlert } from 'lucide-react';

interface BattleshipProps {
  state: BattleshipState;
  playerNum: 1 | 2;
  onSetReady: (ships: Ship[]) => void;
  onShoot: (r: number, c: number) => void;
  disabled?: boolean;
}

const DEFAULT_SHIPS = [
  { name: 'ناو هواپیمابر (Carrier)', size: 5 },
  { name: 'کشتی جنگی (Battleship)', size: 4 },
  { name: 'رزم‌ناو (Cruiser)', size: 3 },
  { name: 'زیردریایی (Submarine)', size: 3 },
  { name: 'ناوشکن (Destroyer)', size: 2 },
];

function generateRandomFleet(): Ship[] {
  const grid: boolean[][] = Array(10).fill(null).map(() => Array(10).fill(false));
  const ships: Ship[] = [];

  for (const def of DEFAULT_SHIPS) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const isHorizontal = Math.random() > 0.5;
      const r = Math.floor(Math.random() * (isHorizontal ? 10 : 10 - def.size));
      const c = Math.floor(Math.random() * (isHorizontal ? 10 - def.size : 10));

      const coords: { r: number; c: number }[] = [];
      let overlap = false;

      for (let i = 0; i < def.size; i++) {
        const nr = isHorizontal ? r : r + i;
        const nc = isHorizontal ? c + i : c;
        if (grid[nr][nc]) {
          overlap = true;
          break;
        }
        coords.push({ r: nr, c: nc });
      }

      if (!overlap) {
        coords.forEach((coord) => {
          grid[coord.r][coord.c] = true;
        });
        ships.push({
          name: def.name,
          size: def.size,
          placed: true,
          coords,
          sunk: false,
        });
        placed = true;
      }
    }
  }
  return ships;
}

export const Battleship: React.FC<BattleshipProps> = ({
  state,
  playerNum,
  onSetReady,
  onShoot,
  disabled = false,
}) => {
  const [myShips, setMyShips] = useState<Ship[]>(() => generateRandomFleet());
  const [hasSentReady, setHasSentReady] = useState(false);

  const isReady = playerNum === 1 ? state.p1Ready : state.p2Ready;
  const isPhaseBattle = state.phase === 'battle';

  const myGrid = playerNum === 1 ? state.p1Grid : state.p2Grid;
  const enemyGrid = playerNum === 1 ? state.p2Grid : state.p1Grid;
  const enemyShips = playerNum === 1 ? state.p2Ships : state.p1Ships;

  const handleRandomize = () => {
    sounds.playClick();
    setMyShips(generateRandomFleet());
  };

  const handleConfirmReady = () => {
    sounds.playClick();
    setHasSentReady(true);
    onSetReady(myShips);
  };

  const handleShootCell = (r: number, c: number) => {
    if (disabled || !isPhaseBattle) return;
    if (enemyGrid[r][c] === 'hit' || enemyGrid[r][c] === 'miss') return;
    onShoot(r, c);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 space-y-5">
      {/* Placement Phase Header */}
      {!isPhaseBattle && (
        <div className="w-full max-w-xl rounded-2xl bg-slate-950 border border-slate-800 p-4 text-center space-y-3 shadow-xl">
          <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold text-sm">
            <Anchor className="h-5 w-5" />
            <span>مرحله چیدمان ناوگان جنگی (۵ کشتی)</span>
          </div>
          <p className="text-xs text-slate-400">
            موقعیت کشتی‌های خود را تنظیم کنید و روی دکمه آماده کلیک کنید:
          </p>

          {!isReady && !hasSentReady ? (
            <div className="flex justify-center gap-3">
              <button
                onClick={handleRandomize}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                <Shuffle className="h-4 w-4 text-cyan-400" />
                چیدمان تصادفی مجدد
              </button>
              <button
                onClick={handleConfirmReady}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-2 text-xs transition shadow-lg shadow-cyan-600/30 cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                آماده شروع نبرد!
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 border border-cyan-500/40 px-4 py-1.5 text-xs text-cyan-300 animate-pulse">
              <CheckCircle className="h-4 w-4" />
              در انتظار آماده شدن حریف...
            </div>
          )}
        </div>
      )}

      {/* Last Shot Result Banner */}
      {isPhaseBattle && state.lastShotResult && (
        <div className="rounded-xl bg-slate-950 border border-slate-800 px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-md">
          {state.lastShotResult.result === 'hit' && (
            <span className="text-amber-400">💥 بمب شلیک شده به هدف اصابت کرد!</span>
          )}
          {state.lastShotResult.result === 'sunk' && (
            <span className="text-rose-400 font-black">
              🔥 ناو {state.lastShotResult.shipName} حریف غرق شد!
            </span>
          )}
          {state.lastShotResult.result === 'miss' && (
            <span className="text-sky-400">💧 بمب به آب خورد (تغییر نوبت).</span>
          )}
        </div>
      )}

      {/* Boards Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Enemy Radar / Attack Grid (When in battle) */}
        {isPhaseBattle && (
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-rose-400">
              <Crosshair className="h-4 w-4" />
              <span>صفحه رادار و حمله به ناوگان حریف</span>
            </div>

            <div className="grid grid-cols-10 gap-1 bg-slate-950 p-2 sm:p-3 rounded-2xl border-2 border-rose-500/40 shadow-xl shadow-rose-950/20">
              {enemyGrid.map((row, r) =>
                row.map((cell, c) => {
                  const isHit = cell === 'hit';
                  const isMiss = cell === 'miss';
                  return (
                    <button
                      key={`enemy-${r}-${c}`}
                      onClick={() => handleShootCell(r, c)}
                      disabled={disabled || isHit || isMiss}
                      className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                        isHit
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/50 scale-105'
                          : isMiss
                          ? 'bg-sky-900/60 text-sky-300'
                          : disabled
                          ? 'bg-slate-900/60'
                          : 'bg-slate-900 hover:bg-rose-500/30 hover:border hover:border-rose-400 cursor-pointer'
                      }`}
                    >
                      {isHit && '💥'}
                      {isMiss && '💧'}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* My Fleet Grid */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-cyan-400">
            <ShieldAlert className="h-4 w-4" />
            <span>ناوگان و دفاع شما</span>
          </div>

          <div className="grid grid-cols-10 gap-1 bg-slate-950 p-2 sm:p-3 rounded-2xl border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/20">
            {(!isPhaseBattle
              ? (() => {
                  const tempGrid: ('empty' | 'ship')[][] = Array(10).fill(null).map(() => Array(10).fill('empty'));
                  myShips.forEach((s) => s.coords.forEach((coord) => { tempGrid[coord.r][coord.c] = 'ship'; }));
                  return tempGrid;
                })()
              : myGrid
            ).map((row, r) =>
              row.map((cell, c) => {
                const isShip = cell === 'ship';
                const isHit = cell === 'hit';
                const isMiss = cell === 'miss';
                return (
                  <div
                    key={`my-${r}-${c}`}
                    className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isHit
                        ? 'bg-rose-600 text-white animate-pulse'
                        : isMiss
                        ? 'bg-sky-900/50 text-sky-400'
                        : isShip
                        ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-slate-950 shadow-inner'
                        : 'bg-slate-900/40'
                    }`}
                  >
                    {isHit && '💥'}
                    {isMiss && '💧'}
                    {isShip && !isHit && '⚓'}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
