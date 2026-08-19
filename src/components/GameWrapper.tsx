import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, LogOut, Trophy, AlertTriangle, MessageSquare, Volume2, Sparkles } from 'lucide-react';
import { GameInfo, Room, EmoteMessage } from '../types';
import { sounds } from '../utils/audio';

interface GameWrapperProps {
  room: Room;
  playerNum: 1 | 2;
  gameInfo: GameInfo;
  currentTurn?: 1 | 2;
  onLeaveRoom: () => void;
  onRequestRematch: () => void;
  onSendEmote: (emoji: string) => void;
  activeEmotes: EmoteMessage[];
  opponentDisconnected: boolean;
  isPassAndPlay?: boolean;
  children: React.ReactNode;
}

const QUICK_EMOJIS = ['🔥', '👏', '😅', '👑', '💥', '💀', '🎯', '⚡'];

export const GameWrapper: React.FC<GameWrapperProps> = ({
  room,
  playerNum,
  gameInfo,
  currentTurn,
  onLeaveRoom,
  onRequestRematch,
  onSendEmote,
  activeEmotes,
  opponentDisconnected,
  isPassAndPlay = false,
  children,
}) => {
  const p1 = room.players.find((p) => p.playerNum === 1) || { name: 'Player 1', score: 0 };
  const p2 = room.players.find((p) => p.playerNum === 2) || { name: 'Player 2', score: 0 };

  const isMyTurn = currentTurn === playerNum || isPassAndPlay;
  const isFinished = room.status === 'finished' || room.winner !== null;
  const isWinner = room.winner === playerNum;

  // Trigger confetti when won
  useEffect(() => {
    if (isFinished && isWinner) {
      sounds.playWin();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else if (isFinished && room.winner && !isWinner && room.winner !== 'draw') {
      sounds.playLose();
    }
  }, [isFinished, isWinner, room.winner]);

  const p1Rematch = !!room.rematchRequested[1];
  const p2Rematch = !!room.rematchRequested[2];

  return (
    <div className="mx-auto max-w-4xl px-2 sm:px-4 py-4 space-y-4">
      {/* Top Header: Scoreboard & Turn */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Game Title */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{gameInfo.icon}</span>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-100">{gameInfo.titleFa}</h2>
              <p className="text-[11px] font-mono text-slate-400">
                {isPassAndPlay ? 'حالت دو نفره روی یک گوشی (Pass & Play)' : `اتاق: ${room.id}`}
              </p>
            </div>
          </div>

          {/* Versus Header */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-950 border border-slate-800/80 px-3 py-1.5 text-xs">
            {/* Player 1 */}
            <div className={`flex items-center gap-1.5 font-bold ${currentTurn === 1 ? 'text-blue-400' : 'text-slate-400'}`}>
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>{p1.name} {playerNum === 1 && !isPassAndPlay && '(شما)'}</span>
            </div>

            <span className="text-slate-600 font-mono font-bold">VS</span>

            {/* Player 2 */}
            <div className={`flex items-center gap-1.5 font-bold ${currentTurn === 2 ? 'text-rose-400' : 'text-slate-400'}`}>
              <span>{p2.name} {playerNum === 2 && !isPassAndPlay && '(شما)'}</span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700/80 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            خروج
          </button>
        </div>

        {/* Turn Status Alert */}
        {currentTurn && !isFinished && (
          <div className="mt-3 flex items-center justify-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-bold transition shadow-md ${
                isPassAndPlay
                  ? currentTurn === 1
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : isMyTurn
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${currentTurn === 1 ? 'bg-blue-400' : 'bg-rose-400'}`} />
              {isPassAndPlay ? (
                <span>نوبت {currentTurn === 1 ? `بازیکن ۱ (${p1.name}) 🔵` : `بازیکن ۲ (${p2.name}) 🔴`}</span>
              ) : isMyTurn ? (
                <span>نوبت شماست! حرکت کنید</span>
              ) : (
                <span>در انتظار حرکت حریف...</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Alert */}
      {opponentDisconnected && !isPassAndPlay && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 p-3 text-xs text-amber-300 animate-pulse">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>⚠️ اتصال بازیکن مقابل قطع شده است. منتظر اتصال مجدد...</span>
        </div>
      )}

      {/* Active Floating Emotes */}
      {activeEmotes.length > 0 && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex gap-2 pointer-events-none">
          {activeEmotes.map((em) => (
            <div
              key={em.id}
              className="animate-bounce rounded-2xl bg-slate-900/90 border border-cyan-500/40 px-3 py-1.5 text-2xl shadow-xl shadow-cyan-500/20"
            >
              {em.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Main Game Arena */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-6 shadow-2xl backdrop-blur-sm min-h-[360px] flex flex-col items-center justify-center overflow-hidden">
        {children}

        {/* Finished / Winner Modal Overlay */}
        {isFinished && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-5xl animate-bounce">
              {room.winner === 'draw' ? '🤝' : isPassAndPlay ? (room.winner === 1 ? '🔵🏆' : '🔴🏆') : isWinner ? '🏆👑' : '💀'}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">
                {room.winner === 'draw'
                  ? 'بازی مساوی شد!'
                  : isPassAndPlay
                  ? `بازیکن ${room.winner} برنده شد!`
                  : isWinner
                  ? 'تبریک! شما برنده شدید!'
                  : 'حریف شما برنده شد!'}
              </h3>
              <p className="text-xs text-slate-400">
                {room.winner === 1 ? `${p1.name} پیروز میدان شد` : room.winner === 2 ? `${p2.name} پیروز میدان شد` : 'رقابت بسیار پایاپای بود'}
              </p>
            </div>

            {/* Rematch button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  sounds.playClick();
                  onRequestRematch();
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-6 py-3 text-sm transition shadow-lg shadow-cyan-600/30 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                {isPassAndPlay
                  ? 'بازی مجدد'
                  : (playerNum === 1 ? p1Rematch : p2Rematch)
                  ? 'در انتظار تایید حریف...'
                  : 'درخواست بازی مجدد (Rematch)'}
              </button>

              <button
                onClick={onLeaveRoom}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                بازگشت به لابی
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Quick Reaction Emotes */}
      {!isPassAndPlay && (
        <div className="flex items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800/80 px-3 py-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
            ارسال واکنش سریع:
          </span>
          <div className="flex items-center gap-1.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  sounds.playClick();
                  onSendEmote(emoji);
                }}
                className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-sm transition hover:scale-110 active:scale-95 cursor-pointer"
                title={`ارسال ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
