import React from 'react';
import { Volume2, VolumeX, Terminal, Wifi, Users, Gamepad2, Globe } from 'lucide-react';
import { sounds } from '../utils/audio';

interface NavbarProps {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  onOpenTermuxGuide: () => void;
  ping: number | null;
  activeRoomId?: string;
  onLeaveRoom?: () => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  soundEnabled,
  setSoundEnabled,
  onOpenTermuxGuide,
  ping,
  activeRoomId,
  onLeaveRoom,
  playerName,
  setPlayerName,
}) => {
  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      sounds.playClick();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-3 sm:px-6 py-2.5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20 text-slate-950 font-black">
            <Gamepad2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                LOCAL GAME
              </span>
              <span className="rounded bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                LAN 2P
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              سرور بازی دونفره محلی (Termux / Wi-Fi)
            </p>
          </div>
        </div>

        {/* Middle Status (if in room) */}
        {activeRoomId && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 border border-cyan-500/30 px-3 py-1 text-xs">
            <span className="text-slate-400">کد اتاق:</span>
            <span className="font-mono font-bold text-cyan-400 tracking-wider text-sm">{activeRoomId}</span>
            {onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="ml-2 text-rose-400 hover:text-rose-300 hover:underline text-[11px] cursor-pointer"
                title="خروج از اتاق"
              >
                خروج
              </button>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Ping indicator */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-[11px] font-mono text-slate-300">
            <span className={`inline-block h-2 w-2 rounded-full ${ping !== null && ping < 80 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{ping !== null ? `${ping}ms` : 'آنلاین'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition cursor-pointer"
            title={soundEnabled ? 'صدا روشن' : 'صدا خاموش'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>

          {/* Termux Guide Button */}
          <button
            onClick={onOpenTermuxGuide}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 transition cursor-pointer shadow-sm"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">راهنمای Termux</span>
            <span className="sm:hidden">Termux</span>
          </button>
        </div>
      </div>
    </header>
  );
};
