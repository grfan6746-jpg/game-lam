import React, { useState } from 'react';
import { Play, LogIn, PlusCircle, Smartphone, Wifi, Gamepad2, ArrowLeft, Sparkles, User, RefreshCw, Zap } from 'lucide-react';
import { GAMES } from '../data/games';
import { GameInfo, GameType } from '../types';
import { sounds } from '../utils/audio';

interface LobbyProps {
  onCreateRoom: (gameType: GameType, name: string) => void;
  onJoinRoom: (roomId: string, name: string) => void;
  onStartPassAndPlay: (gameType: GameType) => void;
  onOpenTermuxGuide: () => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  onStartPassAndPlay,
  onOpenTermuxGuide,
  playerName,
  setPlayerName,
  errorMessage,
  setErrorMessage,
}) => {
  const [selectedGame, setSelectedGame] = useState<GameInfo>(GAMES[0]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'board' | 'arcade' | 'action'>('all');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const filteredGames = activeTab === 'all'
    ? GAMES
    : GAMES.filter((g) => g.category === activeTab);

  const handleCreateRoom = (game: GameInfo) => {
    sounds.playClick();
    onCreateRoom(game.id, playerName || 'Player 1');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    sounds.playClick();
    onJoinRoom(joinCodeInput.trim().toUpperCase(), playerName || 'Player 2');
    setIsJoinModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 p-5 sm:p-8 shadow-2xl backdrop-blur-sm">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-3 py-1 text-xs font-semibold text-cyan-300">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>مجموعه بازی‌های دونفره تحت شبکه محلی (LAN)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              🎮 سرور بازی دونفره Termux
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              گوشی اول سرور را در Termux یا مرورگر اجرا می‌کند؛ گوشی دوم بدون هیچ نصبی، فقط با وارد کردن IP یا کد اتاق در مرورگر متصل می‌شود.
            </p>
          </div>

          {/* Quick Actions & Nickname */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Player Name Input */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="نام شما (اختیاری)"
                maxLength={15}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pr-9 pl-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner"
              />
            </div>

            {/* Join Button */}
            <button
              onClick={() => {
                sounds.playClick();
                setIsJoinModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-100 transition shadow-md cursor-pointer"
            >
              <LogIn className="h-4 w-4 text-cyan-400" />
              ورود با کد اتاق
            </button>
          </div>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 font-bold hover:underline cursor-pointer">
              بستن
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-cyan-400" />
            انتخاب بازی (۸ بازی دونفره)
          </h2>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-slate-800 p-1 text-xs">
          {[
            { id: 'all', label: 'همه (۸)' },
            { id: 'board', label: 'تخته و فکری' },
            { id: 'arcade', label: 'آرکید و سرعتی' },
            { id: 'action', label: 'مبارزه‌ای' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(tab.id as any);
              }}
              className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 transition hover:border-cyan-500/50 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-cyan-950/20 backdrop-blur-sm"
          >
            {/* Top row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl p-2.5 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-105 transition">
                  {game.icon}
                </span>
                <span className="rounded-full bg-slate-950 border border-slate-800 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                  {game.badge}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-100 group-hover:text-cyan-300 transition">
                  {game.titleFa}
                </h3>
                <p className="text-[11px] font-mono text-slate-500">{game.titleEn}</p>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {game.descriptionFa}
                </p>
              </div>
            </div>

            {/* Bottom action buttons */}
            <div className="mt-5 space-y-2 pt-3 border-t border-slate-800/60">
              <button
                onClick={() => handleCreateRoom(game)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-2.5 text-xs transition shadow-lg shadow-cyan-600/20 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                ایجاد اتاق آنلاین (LAN)
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onStartPassAndPlay(game.id);
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white py-1.5 text-[11px] transition cursor-pointer font-medium"
                title="بازی دو نفره روی همین صفحه بدون نیاز به گوشی دوم"
              >
                <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                بازی نوبتی روی همین گوشی
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Join Room Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <LogIn className="h-5 w-5 text-cyan-400" />
              ورود به اتاق بازی دونفره
            </h3>
            <p className="text-xs text-slate-400">
              کد ۵ رقمی اتاق را که در گوشی میزبان نمایش داده شده وارد کنید:
            </p>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="مثال: TK72B"
                maxLength={8}
                autoFocus
                className="w-full rounded-xl border-2 border-cyan-500/40 bg-slate-950 px-4 py-3 text-center font-mono text-2xl font-black uppercase tracking-widest text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="flex-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer"
                >
                  پیوستن به بازی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
