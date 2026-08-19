import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Download, Smartphone, Wifi, Cpu, FileCode2, ExternalLink } from 'lucide-react';
import { PYTHON_FILES } from '../utils/pythonExporter';
import { sounds } from '../utils/audio';

interface TermuxGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermuxGuideModal: React.FC<TermuxGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'code' | 'commands'>('guide');
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    sounds.playClick();
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    sounds.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-cyan-950/40 text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                راهنمای کامل راه‌اندازی سرور پایتون در Termux
              </h3>
              <p className="text-xs text-slate-400">
                تبدیل گوشی اندروید به سرور بازی شبکه محلی (بدون نیاز به اینترنت)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 text-sm font-medium">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 transition cursor-pointer ${
              activeTab === 'guide'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            مراحل گام‌به‌گام
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 transition cursor-pointer ${
              activeTab === 'commands'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-4 w-4" />
            دستورات ترمینال
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 transition cursor-pointer ${
              activeTab === 'code'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="h-4 w-4" />
            فایل‌های پایتون (دانلود/کپی)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-slate-300">
          {activeTab === 'guide' && (
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold">۱</span>
                  <span>نصب Termux روی گوشی اول (Host)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  برنامه Termux را از F-Droid یا GitHub دانلود و نصب کنید. (ترجیحاً از گوگل‌پلی نصب نکنید چون نسخه‌های قدیمی را دارد).
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold">۲</span>
                  <span>اجرای دستورات اولیه پایتون</span>
                </div>
                <p className="text-xs text-slate-400">
                  برنامه Termux را باز کرده و دستورات زیر را کپی و پیست کنید:
                </p>
                <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-emerald-400">
                  <code>pkg update && pkg upgrade -y<br />pkg install python git -y<br />pip install flask flask-socketio eventlet</code>
                  <button
                    onClick={() => copyToClipboard('pkg update && pkg upgrade -y\npkg install python git -y\npip install flask flask-socketio eventlet', 'step2')}
                    className="absolute top-2.5 left-2.5 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'step2' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'step2' ? 'کپی شد' : 'کپی دستورات'}
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold">۳</span>
                  <span>اتصال به شبکه محلی (Wi-Fi یا هات‌اسپات)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                    <span className="text-cyan-300 font-semibold flex items-center gap-1 mb-1">
                      <Wifi className="h-3.5 w-3.5" /> روش وای‌فای خانگی
                    </span>
                    هر دو گوشی به یک مودم Wi-Fi متصل باشند. (اینترنت لازم نیست)
                  </div>
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                    <span className="text-amber-300 font-semibold flex items-center gap-1 mb-1">
                      <Smartphone className="h-3.5 w-3.5" /> روش هات‌اسپات گوشی
                    </span>
                    گوشی اول Hotspot روشن کند و گوشی دوم به آن وصل شود.
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold">۴</span>
                  <span>پیدا کردن IP و اتصال گوشی دوم</span>
                </div>
                <p className="text-xs text-slate-400">
                  سرور پس از اجرا، آدرس IP گوشی میزبان را نشان می‌دهد (مانند <code className="text-cyan-300 font-mono">http://192.168.1.10:8080</code>). گوشی دوم مرورگر کروم/سافاری را باز کرده و همین آدرس را وارد می‌کند!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                دستورات یکپارچه برای کپی سریع در ترموکس:
              </p>
              {[
                {
                  title: '۱. به‌روزرسانی بسته‌های Termux',
                  cmd: 'pkg update -y && pkg upgrade -y',
                  id: 'cmd1',
                },
                {
                  title: '۲. نصب پایتون و Git',
                  cmd: 'pkg install python git -y',
                  id: 'cmd2',
                },
                {
                  title: '۳. نصب کتابخانه‌های Flask و WebSocket',
                  cmd: 'pip install flask flask-socketio python-socketio eventlet qrcode',
                  id: 'cmd3',
                },
                {
                  title: '۴. اجرای فایل سرور پایتون',
                  cmd: 'python app.py',
                  id: 'cmd4',
                },
                {
                  title: '۵. مشاهده IP گوشی میزبان در ترموکس (در صورت نیاز)',
                  cmd: 'ifconfig wlan0 | grep "inet " || ip route get 1.1.1.1',
                  id: 'cmd5',
                },
              ].map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1.5">
                  <span className="text-xs font-semibold text-slate-200">{item.title}</span>
                  <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800/80 px-3 py-2 text-xs font-mono text-cyan-300 overflow-x-auto">
                    <code>{item.cmd}</code>
                    <button
                      onClick={() => copyToClipboard(item.cmd, item.id)}
                      className="ml-2 rounded bg-slate-800 p-1.5 text-slate-400 hover:text-white cursor-pointer"
                      title="کپی"
                    >
                      {copiedKey === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PYTHON_FILES.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIdx(idx)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-mono transition cursor-pointer ${
                      selectedFileIdx === idx
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {file.path}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 bg-slate-900/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-300">{PYTHON_FILES[selectedFileIdx].path}</span>
                    <span className="text-slate-400 text-[11px]">— {PYTHON_FILES[selectedFileIdx].descriptionFa}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(PYTHON_FILES[selectedFileIdx].content, `file-${selectedFileIdx}`)}
                      className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                    >
                      {copiedKey === `file-${selectedFileIdx}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      کپی کد
                    </button>
                    <button
                      onClick={() => downloadFile(PYTHON_FILES[selectedFileIdx].path, PYTHON_FILES[selectedFileIdx].content)}
                      className="flex items-center gap-1 rounded bg-cyan-600/80 hover:bg-cyan-500 px-2 py-1 text-[11px] text-slate-950 font-bold cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      دانلود فایل
                    </button>
                  </div>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-300 max-h-72 overflow-y-auto leading-relaxed">
                  <code>{PYTHON_FILES[selectedFileIdx].content}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-5 py-3 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>پروژه بدون وابستگی به اینترنت در شبکه محلی کار می‌کند.</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-slate-200 font-medium cursor-pointer"
          >
            متوجه شدم و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
