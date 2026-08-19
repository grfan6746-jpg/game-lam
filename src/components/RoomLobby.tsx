import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Users, ArrowRight, Share2, Play, AlertCircle, ShieldCheck } from 'lucide-react';
import { Room, GameInfo } from '../types';
import { sounds } from '../utils/audio';

interface RoomLobbyProps {
  room: Room;
  playerNum: 1 | 2;
  gameInfo: GameInfo;
  onStartGame?: () => void;
  onLeaveRoom: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  playerNum,
  gameInfo,
  onLeaveRoom,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${room.id}`
    : `http://localhost:3000?room=${room.id}`;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [shareUrl]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    sounds.playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    sounds.playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const player1 = room.players.find((p) => p.playerNum === 1);
  const player2 = room.players.find((p) => p.playerNum === 2);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Game Banner */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="text-3xl sm:text-4xl p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
            {gameInfo.icon}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100">{gameInfo.titleFa}</h2>
            <p className="text-xs text-slate-400 font-medium">{gameInfo.titleEn} — اتاق بازی دونفره</p>
          </div>
        </div>
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          خروج از لابی
        </button>
      </div>

      {/* Room Code Card */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-6 text-center space-y-4 shadow-xl shadow-cyan-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-sky-400" />
        
        <p className="text-xs font-semibold text-cyan-400 tracking-wider">کد اختصاصی اتاق (ROOM ID)</p>
        
        <div className="flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-slate-950 border-2 border-cyan-500/40 px-6 py-3 font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-cyan-300 shadow-inner select-all">
            {room.id}
          </div>
          <button
            onClick={copyRoomCode}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition shadow-lg shadow-cyan-600/30 cursor-pointer"
            title="کپی کد اتاق"
          >
            {copied ? <Check className="h-6 w-6 text-slate-950" /> : <Copy className="h-6 w-6" />}
          </button>
        </div>

        <p className="text-xs text-slate-400 max-w-md mx-auto">
          این کد را به بازیکن دوم بدهید، یا گوشی دوم کد QR زیر را اسکن کند:
        </p>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="rounded-xl bg-white p-2.5 shadow-md border-2 border-cyan-500/20">
              <img src={qrDataUrl} alt="Room QR Code" className="h-36 w-36" />
            </div>
            <button
              onClick={copyShareLink}
              className="mt-3 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium hover:underline cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              کپی لینک مستقیم اتصال
            </button>
          </div>
        )}
      </div>

      {/* Players Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Player 1 */}
        <div className="rounded-xl border border-blue-500/40 bg-slate-900/80 p-4 space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400">بازیکن ۱ (میزبان)</span>
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-lg">
              P1
            </div>
            <div>
              <p className="font-bold text-sm text-slate-100">{player1?.name || 'میزبان'}</p>
              <p className="text-xs text-blue-300/80 font-mono">{playerNum === 1 ? '(شما)' : '(حریف)'}</p>
            </div>
          </div>
        </div>

        {/* Player 2 */}
        <div className={`rounded-xl border p-4 space-y-2 relative transition ${
          player2
            ? 'border-rose-500/40 bg-slate-900/80'
            : 'border-dashed border-slate-700 bg-slate-950/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${player2 ? 'text-rose-400' : 'text-slate-500'}`}>
              بازیکن ۲ {player2 ? '(ملحق شده)' : '(در انتظار اتصال...)'}
            </span>
            <span className={`flex h-2.5 w-2.5 rounded-full ${player2 ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`} />
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-lg border ${
              player2
                ? 'bg-rose-600/20 border-rose-500/40 text-rose-400'
                : 'bg-slate-800/40 border-slate-700 text-slate-600'
            }`}>
              P2
            </div>
            <div>
              <p className={`font-bold text-sm ${player2 ? 'text-slate-100' : 'text-slate-500 animate-pulse'}`}>
                {player2 ? player2.name : 'در حال انتظار برای بازیکن دوم...'}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {player2 ? (playerNum === 2 ? '(شما)' : '(حریف)') : 'گوشی دوم وارد شود'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Waiting hint */}
      {!player2 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>به محض اینکه گوشی دوم با کد اتاق یا اسکن QR وارد شود، بازی به صورت خودکار شروع خواهد شد.</span>
        </div>
      )}
    </div>
  );
};
