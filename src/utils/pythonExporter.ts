export interface PythonFile {
  path: string;
  descriptionFa: string;
  content: string;
}

export const PYTHON_FILES: PythonFile[] = [
  {
    path: 'requirements.txt',
    descriptionFa: 'کتابخانه‌های پایتون مورد نیاز',
    content: `flask>=3.0.0
flask-socketio>=5.3.6
python-socketio>=5.11.0
eventlet>=0.35.0
qrcode>=7.4.2`,
  },
  {
    path: 'run_termux.sh',
    descriptionFa: 'اسکریپت نصب و راه‌اندازی سریع در Termux',
    content: `#!/bin/bash
# 🎮 اجرای خودکار سرور در Termux (بدون نیاز به تنظیمات دستی)
echo "========================================"
echo "🚀 آماده‌سازی مخازن و نصب پیش‌نیازها..."
echo "========================================"
pkg update -y && pkg upgrade -y
pkg install python git -y

echo "🐍 نصب کتابخانه‌های Flask و WebSocket..."
pip install flask flask-socketio eventlet qrcode

echo "🎮 شروع سرور بازی محلی..."
python app.py`,
  },
  {
    path: 'app.py',
    descriptionFa: 'فایل اصلی سرور پایتون (تک‌فایل و کاملاً مستقل)',
    content: `"""
=============================================================================
🎮 LOCAL GAME SERVER (Termux / Android / LAN)
Flask + Flask-SocketIO 2-Player Real-Time Game Suite (8 Games)
=============================================================================
"""

import os
import socket
import random
from flask import Flask, render_template_string, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'local-game-termux-secret-key-2026'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

rooms = {}

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def generate_room_id():
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(chars, k=5))

def create_game_state(game_type, size=4):
    if game_type == 'tictactoe':
        return {'board': [None] * 9, 'currentTurn': 1, 'winningLine': None}
    elif game_type == 'dotsboxes':
        grid_size = max(4, min(int(size or 4), 9))
        num_boxes = grid_size - 1
        return {
            'gridSize': grid_size,
            'hLines': [[None]*num_boxes for _ in range(grid_size)],
            'vLines': [[None]*grid_size for _ in range(num_boxes)],
            'boxes': [[None]*num_boxes for _ in range(num_boxes)],
            'currentTurn': 1,
            'scores': {'1': 0, '2': 0}
        }
    elif game_type == 'battleship':
        return {
            'phase': 'placement',
            'p1Ready': False,
            'p2Ready': False,
            'p1Ships': [],
            'p2Ships': [],
            'p1Grid': [['empty']*10 for _ in range(10)],
            'p2Grid': [['empty']*10 for _ in range(10)],
            'currentTurn': 1,
            'lastShotResult': None
        }
    elif game_type == 'connectfour':
        return {'grid': [[None]*7 for _ in range(6)], 'currentTurn': 1, 'winningCoords': None, 'lastDrop': None}
    elif game_type == 'pong':
        return {
            'ball': {'x': 50, 'y': 50, 'vx': 0.9, 'vy': 0.6, 'radius': 2},
            'p1PaddleY': 50,
            'p2PaddleY': 50,
            'paddleHeight': 20,
            'paddleWidth': 3,
            'scores': {'1': 0, '2': 0},
            'targetScore': 10,
            'isPaused': False
        }
    elif game_type == 'snake':
        return {
            'gridWidth': 24,
            'gridHeight': 24,
            'snake1': [{'x': 4, 'y': 12}, {'x': 3, 'y': 12}, {'x': 2, 'y': 12}],
            'snake2': [{'x': 19, 'y': 12}, {'x': 20, 'y': 12}, {'x': 21, 'y': 12}],
            'dir1': {'x': 1, 'y': 0},
            'dir2': {'x': -1, 'y': 0},
            'food': [{'x': 12, 'y': 6}, {'x': 12, 'y': 18}],
            'scores': {'1': 0, '2': 0},
            'alive1': True,
            'alive2': True
        }
    elif game_type == 'racing':
        return {
            'p1Car': {'x': 100, 'y': 350, 'angle': -1.57, 'speed': 0, 'lap': 0, 'currentCheckpoint': 0, 'totalCheckpoints': 8},
            'p2Car': {'x': 140, 'y': 350, 'angle': -1.57, 'speed': 0, 'lap': 0, 'currentCheckpoint': 0, 'totalCheckpoints': 8},
            'targetLaps': 3
        }
    elif game_type == 'fighting':
        return {
            'p1': {'x': 150, 'y': 300, 'vx': 0, 'vy': 0, 'health': 100, 'isGrounded': True, 'isAttacking': False, 'attackCooldown': 0, 'isDefending': False, 'facing': 'right', 'roundsWon': 0, 'animState': 'idle'},
            'p2': {'x': 450, 'y': 300, 'vx': 0, 'vy': 0, 'health': 100, 'isGrounded': True, 'isAttacking': False, 'attackCooldown': 0, 'isDefending': False, 'facing': 'left', 'roundsWon': 0, 'animState': 'idle'},
            'targetRounds': 2
        }
    return {}

EMBEDDED_HTML = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>سرور بازی دونفره محلی (Termux LAN)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;800;900&display=swap" rel="stylesheet">
  <style>body { font-family: 'Vazirmatn', system-ui, sans-serif; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; }</style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  <header class="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg">🎮</div>
        <div>
          <h1 class="text-sm font-black text-slate-100">سرور بازی محلی Termux</h1>
          <p class="text-[10px] text-cyan-400 font-mono">IP: {{ server_ip }}:{{ server_port }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono">
          <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span id="ping-text">... ms</span>
        </div>
        <button id="leave-room-btn" onclick="leaveCurrentRoom()" class="hidden px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">خروج از اتاق</button>
      </div>
    </div>
  </header>

  <div id="error-banner" class="hidden max-w-md mx-auto my-2 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs text-center font-bold"></div>

  <main class="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col items-center justify-center">
    <div id="view-lobby" class="w-full space-y-6">
      <div class="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-2xl backdrop-blur">
        <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div class="w-full sm:w-1/2 space-y-1.5">
            <label class="text-xs font-bold text-slate-300">نام مستعار شما:</label>
            <input type="text" id="player-name-input" value="بازیکن" class="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 transition" />
          </div>
          <div class="w-full sm:w-1/2 space-y-1.5">
            <label class="text-xs font-bold text-slate-300">ورود به اتاق حریف (کد ۵ رقمی):</label>
            <div class="flex gap-2">
              <input type="text" id="join-code-input" placeholder="کد اتاق..." maxlength="5" class="flex-1 uppercase font-mono tracking-widest text-center rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-cyan-500 transition" />
              <button onclick="joinRoomFromInput()" class="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow-lg">ورود</button>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-black text-slate-400">انتخاب بازی برای ساخت اتاق (۸ بازی):</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" id="games-list-grid"></div>
      </div>
    </div>

    <div id="view-room-lobby" class="hidden w-full max-w-md space-y-5 text-center">
      <div class="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
          <span class="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>در انتظار ورود گوشی دوم...</span>
        </div>
        <h3 id="room-game-title" class="text-lg font-black text-slate-100">بازی</h3>
        <div class="py-2">
          <p class="text-xs text-slate-400 mb-1">کد اختصاصی اتاق:</p>
          <div id="room-code-display" class="font-mono text-3xl font-black text-cyan-400 tracking-widest bg-slate-950 py-3 rounded-2xl border border-slate-800">-----</div>
        </div>
        <div class="flex flex-col items-center justify-center p-3 bg-white rounded-2xl w-44 h-44 mx-auto shadow-xl">
          <div id="qrcode-container"></div>
        </div>
        <p class="text-[11px] text-slate-400">گوشی دوم با اسکن بارکد یا باز کردن آدرس زیر متصل می‌شود:</p>
        <p class="text-xs font-mono text-cyan-300 bg-slate-950 p-2 rounded-xl border border-slate-800/80 break-all" id="room-url-display"></p>
      </div>
    </div>

    <div id="view-game" class="hidden w-full flex flex-col items-center space-y-4">
      <div class="w-full max-w-xl flex items-center justify-between px-5 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-bold shadow-lg">
        <div id="game-player1-badge" class="flex items-center gap-2 text-cyan-400">
          <span class="h-3 w-3 rounded-full bg-cyan-400"></span>
          <span id="game-p1-name">بازیکن ۱</span>
        </div>
        <div id="game-status-text" class="px-3 py-1 rounded-full bg-slate-950 text-slate-200 border border-slate-800">نوبت بازی</div>
        <div id="game-player2-badge" class="flex items-center gap-2 text-rose-400">
          <span id="game-p2-name">بازیکن ۲</span>
          <span class="h-3 w-3 rounded-full bg-rose-400"></span>
        </div>
      </div>
      <div id="game-arena-container" class="w-full flex justify-center"></div>
      <div class="flex items-center gap-2 pt-2">
        <span class="text-xs text-slate-500 font-bold">واکنش:</span>
        <button onclick="sendEmote('🔥')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">🔥</button>
        <button onclick="sendEmote('👏')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">👏</button>
        <button onclick="sendEmote('😂')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">😂</button>
        <button onclick="sendEmote('😎')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">😎</button>
      </div>
      <div id="game-over-panel" class="hidden w-full max-w-sm p-4 rounded-3xl bg-slate-900 border-2 border-cyan-500/50 shadow-2xl text-center space-y-3">
        <h4 id="game-over-title" class="text-lg font-black text-slate-100">پایان بازی!</h4>
        <div class="flex gap-3 justify-center">
          <button onclick="requestRematch()" class="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg">🔄 بازی مجدد</button>
          <button onclick="leaveCurrentRoom()" class="px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-200 font-bold text-xs">خروج به لابی</button>
        </div>
      </div>
    </div>
  </main>

  <script>
    const GAMES = [
      { id: 'tictactoe', title: 'ضربدر و دایره', icon: '❌⭕', desc: 'کلاسیک ۳×۳' },
      { id: 'dotsboxes', title: 'نقطه و خط', icon: '🔵', desc: 'تصاحب مربع‌ها' },
      { id: 'battleship', title: 'نبرد کشتی‌ها', icon: '🚢', desc: 'شلیک به ناوگان' },
      { id: 'connectfour', title: 'چهاردرخط', icon: '🔴🟡', desc: '۴ مهره متوالی' },
      { id: 'pong', title: 'پینگ‌پنگ', icon: '🏓', desc: 'راکت و توپ' },
      { id: 'snake', title: 'مار دونفره', icon: '🐍', desc: 'رقابت مارها' },
      { id: 'racing', title: 'مسابقه ماشین', icon: '🏎️', desc: 'پیست و سرعت' },
      { id: 'fighting', title: 'مبارزه تن‌به‌تن', icon: '⚔️', desc: 'مشت، پرش، دفاع' }
    ];

    let socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    let currentRoom = null, myPlayerNum = 1;
    let playerName = localStorage.getItem('localgame_name') || 'بازیکن';

    document.getElementById('player-name-input').value = playerName;
    document.getElementById('player-name-input').addEventListener('input', e => {
      playerName = e.target.value; localStorage.setItem('localgame_name', playerName);
    });

    setInterval(() => { if (socket.connected) socket.emit('ping_check', Date.now()); }, 3000);
    socket.on('pong_reply', start => { document.getElementById('ping-text').innerText = (Date.now() - start) + ' ms'; });

    document.getElementById('games-list-grid').innerHTML = GAMES.map(g => \`
      <div onclick="createRoomForGame('\${g.id}')" class="group rounded-3xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 p-4 transition cursor-pointer shadow-lg">
        <div class="flex items-center gap-3">
          <div class="text-3xl p-2.5 rounded-2xl bg-slate-950">\${g.icon}</div>
          <div><h3 class="text-sm font-black text-slate-100 group-hover:text-cyan-400">\${g.title}</h3><p class="text-[11px] text-slate-400">\${g.desc}</p></div>
        </div>
      </div>
    \`).join('');

    socket.on('room_created', data => { currentRoom = data.room; myPlayerNum = data.playerNum; showRoomLobby(); });
    socket.on('room_joined', data => { currentRoom = data.room; myPlayerNum = data.playerNum; if (data.room.status === 'playing') startGameView(); else showRoomLobby(); });
    socket.on('game_started', data => { currentRoom = data.room; startGameView(); });
    socket.on('game_update', data => { if (!currentRoom) return; currentRoom.gameState = data.gameState; currentRoom.winner = data.winner; currentRoom.status = data.status; renderCurrentGame(); updateStatusHeader(); });
    socket.on('game_reset', data => { currentRoom = data.room; document.getElementById('game-over-panel').classList.add('hidden'); renderCurrentGame(); updateStatusHeader(); });
    socket.on('error_message', msg => { const b = document.getElementById('error-banner'); b.innerText = msg; b.classList.remove('hidden'); setTimeout(() => b.classList.add('hidden'), 4000); });
    socket.on('receive_emote', data => {
      const d = document.createElement('div');
      d.className = 'fixed top-20 left-1/2 -translate-x-1/2 text-4xl p-3 rounded-full bg-slate-900 border border-cyan-500 shadow-2xl animate-bounce z-50';
      d.innerText = data.emoji; document.body.appendChild(d); setTimeout(() => d.remove(), 2000);
    });

    function createRoomForGame(t) { socket.emit('create_room', { gameType: t, playerName }); }
    function joinRoomFromInput() { const c = document.getElementById('join-code-input').value.trim().toUpperCase(); if (c) socket.emit('join_room', { roomId: c, playerName }); }
    function leaveCurrentRoom() { if (currentRoom) socket.emit('leave_room'); currentRoom = null; document.getElementById('view-lobby').classList.remove('hidden'); document.getElementById('view-room-lobby').classList.add('hidden'); document.getElementById('view-game').classList.add('hidden'); document.getElementById('leave-room-btn').classList.add('hidden'); }
    function requestRematch() { socket.emit('request_rematch'); }
    function sendEmote(e) { if (currentRoom) socket.emit('send_emote', { roomId: currentRoom.id, playerNum: myPlayerNum, emoji: e }); }

    function showRoomLobby() {
      document.getElementById('view-lobby').classList.add('hidden');
      document.getElementById('view-room-lobby').classList.remove('hidden');
      document.getElementById('view-game').classList.add('hidden');
      document.getElementById('leave-room-btn').classList.remove('hidden');
      const g = GAMES.find(x => x.id === currentRoom.gameType);
      document.getElementById('room-game-title').innerText = (g ? g.title : 'بازی') + ' ' + (g ? g.icon : '');
      document.getElementById('room-code-display').innerText = currentRoom.id;
      const url = window.location.origin + '?room=' + currentRoom.id;
      document.getElementById('room-url-display').innerText = url;
      const qr = document.getElementById('qrcode-container'); qr.innerHTML = '';
      new QRCode(qr, { text: url, width: 140, height: 140, colorDark: '#020617', colorLight: '#ffffff' });
    }

    function startGameView() {
      document.getElementById('view-lobby').classList.add('hidden');
      document.getElementById('view-room-lobby').classList.add('hidden');
      document.getElementById('view-game').classList.remove('hidden');
      document.getElementById('leave-room-btn').classList.remove('hidden');
      document.getElementById('game-over-panel').classList.add('hidden');
      const p1 = currentRoom.players[0], p2 = currentRoom.players[1];
      document.getElementById('game-p1-name').innerText = (p1 ? p1.name : 'بازیکن ۱') + (myPlayerNum === 1 ? ' (شما)' : '');
      document.getElementById('game-p2-name').innerText = (p2 ? p2.name : 'بازیکن ۲') + (myPlayerNum === 2 ? ' (شما)' : '');
      renderCurrentGame(); updateStatusHeader();
    }

    function updateStatusHeader() {
      const txt = document.getElementById('game-status-text');
      if (currentRoom.status === 'finished') {
        document.getElementById('game-over-panel').classList.remove('hidden');
        txt.innerText = currentRoom.winner === 'draw' ? '🤝 مساوی!' : (currentRoom.winner === myPlayerNum ? '🏆 شما بردید!' : '💔 باختید!');
      } else {
        const t = currentRoom.gameState ? currentRoom.gameState.currentTurn : null;
        txt.innerText = t ? (t === myPlayerNum ? '👉 نوبت شما' : '⏳ نوبت حریف') : '⚔️ در حال بازی';
      }
    }

    function renderCurrentGame() {
      const c = document.getElementById('game-arena-container'), st = currentRoom.gameState, t = currentRoom.gameType;
      const myTurn = st.currentTurn === myPlayerNum && currentRoom.status !== 'finished';
      if (t === 'tictactoe') {
        c.innerHTML = \`<div class="grid grid-cols-3 gap-3 bg-slate-950 p-5 rounded-3xl border-2 border-slate-800">\${st.board.map((cell, idx) => \`<button onclick="socket.emit('ttt_move', { roomId: currentRoom.id, index: \${idx}, playerNum: myPlayerNum })" \${cell !== null || !myTurn ? 'disabled' : ''} class="h-24 w-24 rounded-2xl flex items-center justify-center text-5xl font-black bg-slate-900 border border-slate-800">\${cell === 1 ? '<span class="text-cyan-400">✕</span>' : (cell === 2 ? '<span class="text-rose-400">○</span>' : '')}</button>\`).join('')}</div>\`;
      } else if (t === 'connectfour') {
        c.innerHTML = \`<div class="flex flex-col items-center space-y-3"><div class="grid grid-cols-7 gap-2">\${[0,1,2,3,4,5,6].map(col => \`<button onclick="socket.emit('connectfour_drop', { roomId: currentRoom.id, col: \${col}, playerNum: myPlayerNum })" \${!myTurn || st.grid[0][col] !== null ? 'disabled' : ''} class="h-10 w-10 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">↓</button>\`).join('')}</div><div class="grid grid-cols-7 gap-2 bg-blue-950/80 p-4 rounded-3xl border-4 border-blue-600">\${st.grid.map(row => row.map(cell => \`<div class="h-11 w-11 rounded-full \${cell === 1 ? 'bg-rose-500' : (cell === 2 ? 'bg-yellow-400' : 'bg-slate-950')}"></div>\`).join('')).join('')}</div></div>\`;
      } else if (t === 'dotsboxes') {
        const numDots = Math.min(Math.max(st.gridSize || 4, 4), 9);
        const numBoxes = numDots - 1;
        const totalRows = 2 * numDots - 1;
        const totalCols = 2 * numDots - 1;
        let dotSz = 16, boxSz = 60, lineThick = 4, txtSz = 'text-xl';
        if (numDots === 5) { dotSz = 14; boxSz = 50; lineThick = 4; txtSz = 'text-lg'; }
        else if (numDots === 6) { dotSz = 13; boxSz = 40; lineThick = 3.5; txtSz = 'text-base'; }
        else if (numDots === 7) { dotSz = 12; boxSz = 34; lineThick = 3.5; txtSz = 'text-sm'; }
        else if (numDots === 8) { dotSz = 11; boxSz = 29; lineThick = 3; txtSz = 'text-xs'; }
        else if (numDots >= 9) { dotSz = 10; boxSz = 25; lineThick = 3; txtSz = 'text-[11px]'; }

        const gridColsCss = Array.from({ length: totalCols }, (_, i) => i % 2 === 0 ? \`\${dotSz}px\` : \`\${boxSz}px\`).join(' ');
        const gridRowsCss = Array.from({ length: totalRows }, (_, i) => i % 2 === 0 ? \`\${dotSz}px\` : \`\${boxSz}px\`).join(' ');

        let gridCellsHtml = '';
        for (let gr = 0; gr < totalRows; gr++) {
          for (let gc = 0; gc < totalCols; gc++) {
            const isEvenR = gr % 2 === 0, isEvenC = gc % 2 === 0;
            if (isEvenR && isEvenC) {
              gridCellsHtml += \`<div class="w-full h-full flex items-center justify-center pointer-events-none"><div style="width:\${dotSz}px; height:\${dotSz}px;" class="rounded-full bg-slate-200 border-2 border-slate-900 shadow-sm shadow-cyan-500/30"></div></div>\`;
            } else if (isEvenR && !isEvenC) {
              const r = gr / 2, c = (gc - 1) / 2;
              const val = st.hLines[r] ? st.hLines[r][c] : null;
              const cls = val === 1 ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : (val === 2 ? 'bg-rose-500 shadow-sm shadow-rose-500' : (myTurn ? 'bg-slate-800 hover:bg-cyan-500/40 cursor-pointer' : 'bg-slate-850 cursor-default'));
              gridCellsHtml += \`<div class="w-full h-full flex items-center justify-center px-0.5"><button onclick="socket.emit('dots_move', { roomId: currentRoom.id, type: 'h', r: \${r}, c: \${c}, playerNum: myPlayerNum })" \${val !== null || !myTurn ? 'disabled' : ''} style="height:\${lineThick}px;" class="w-full rounded-full transition-all \${cls}"></button></div>\`;
            } else if (!isEvenR && isEvenC) {
              const r = (gr - 1) / 2, c = gc / 2;
              const val = st.vLines[r] ? st.vLines[r][c] : null;
              const cls = val === 1 ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : (val === 2 ? 'bg-rose-500 shadow-sm shadow-rose-500' : (myTurn ? 'bg-slate-800 hover:bg-cyan-500/40 cursor-pointer' : 'bg-slate-850 cursor-default'));
              gridCellsHtml += \`<div class="w-full h-full flex items-center justify-center py-0.5"><button onclick="socket.emit('dots_move', { roomId: currentRoom.id, type: 'v', r: \${r}, c: \${c}, playerNum: myPlayerNum })" \${val !== null || !myTurn ? 'disabled' : ''} style="width:\${lineThick}px;" class="h-full rounded-full transition-all \${cls}"></button></div>\`;
            } else {
              const r = (gr - 1) / 2, c = (gc - 1) / 2;
              const owner = st.boxes[r] ? st.boxes[r][c] : null;
              const cls = owner === 1 ? 'bg-cyan-500/25 border border-cyan-500/40 text-cyan-300' : (owner === 2 ? 'bg-rose-500/25 border border-rose-500/40 text-rose-300' : 'bg-slate-900/30');
              gridCellsHtml += \`<div class="w-full h-full m-0.5 rounded-lg flex items-center justify-center font-black \${cls}">\${owner === 1 ? \`<span class="\${txtSz} text-cyan-400">P1</span>\` : (owner === 2 ? \`<span class="\${txtSz} text-rose-400">P2</span>\` : '')}</div>\`;
            }
          }
        }
        c.innerHTML = \`<div class="flex flex-col items-center space-y-3 max-w-full"><div class="flex flex-col items-center space-y-1 bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-800"><span class="text-[11px] text-slate-400 font-bold">اندازه زمین:</span><div class="flex gap-1 flex-wrap justify-center">\${[4,5,6,7,8,9].map(sz => \`<button onclick="socket.emit('dots_set_size', { roomId: currentRoom.id, size: \${sz} })" class="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold \${sz === numDots ? 'bg-cyan-500 text-slate-950 shadow' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'}">\${sz}×\${sz}</button>\`).join('')}</div></div><div class="flex gap-6 bg-slate-950 px-5 py-2 rounded-2xl border border-slate-800 text-xs font-mono shadow-inner"><span class="text-cyan-400 font-bold">🔵 آبی (P1): \${st.scores['1']}</span><span class="text-rose-400 font-bold">🔴 قرمز (P2): \${st.scores['2']}</span></div><div class="bg-slate-950 p-4 sm:p-6 rounded-3xl border-2 border-slate-800 shadow-2xl overflow-x-auto max-w-full"><div style="display:grid; grid-template-columns:\${gridColsCss}; grid-template-rows:\${gridRowsCss}; width:max-content;" class="mx-auto select-none">\${gridCellsHtml}</div></div><div class="flex gap-4 text-[11px] font-mono"><span class="text-cyan-400">■ خطوط بازیکن آبی</span><span class="text-rose-400">■ خطوط بازیکن قرمز</span></div></div>\`;
      } else {
        c.innerHTML = \`<div class="flex flex-col items-center space-y-3"><canvas id="c-arc" width="480" height="300" class="rounded-3xl border-2 border-slate-800 bg-slate-950"></canvas><div class="flex gap-4"><button onclick="socket.emit('pong_paddle', { roomId: currentRoom.id, y: Math.max(15, (myPlayerNum === 1 ? st.p1PaddleY : st.p2PaddleY) - 15), playerNum: myPlayerNum })" class="px-6 py-3 rounded-2xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">▲ بالا</button><button onclick="socket.emit('pong_paddle', { roomId: currentRoom.id, y: Math.min(85, (myPlayerNum === 1 ? st.p1PaddleY : st.p2PaddleY) + 15), playerNum: myPlayerNum })" class="px-6 py-3 rounded-2xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">▼ پایین</button></div></div>\`;
        const cv = document.getElementById('c-arc');
        if (cv && t === 'pong') {
          const cx = cv.getContext('2d');
          cx.fillStyle = '#090d16'; cx.fillRect(0,0,480,300);
          cx.fillStyle = '#38bdf8'; cx.fillRect(15, (st.p1PaddleY/100)*300 - 30, 8, 60);
          cx.fillStyle = '#fb7185'; cx.fillRect(480 - 23, (st.p2PaddleY/100)*300 - 30, 8, 60);
          cx.fillStyle = '#fff'; cx.beginPath(); cx.arc((st.ball.x/100)*480, (st.ball.y/100)*300, 7, 0, Math.PI*2); cx.fill();
        }
      }
    }
  </script>
</body>
</html>
"""

@app.route('/')
def index():
    server_ip = get_local_ip()
    return render_template_string(EMBEDDED_HTML, server_ip=server_ip, server_port=8080)

@app.route('/api/info')
def server_info():
    return jsonify({
        'name': 'Termux Local Game Server',
        'ip': get_local_ip(),
        'port': 8080,
        'active_rooms': len(rooms)
    })

@socketio.on('ping_check')
def on_ping(ts):
    emit('pong_reply', ts)

@socketio.on('create_room')
def on_create_room(data):
    game_type = data.get('gameType', 'tictactoe')
    player_name = data.get('playerName', 'Player 1')
    room_id = generate_room_id()

    room = {
        'id': room_id,
        'gameType': game_type,
        'players': [{
            'id': request.sid,
            'socketId': request.sid,
            'name': player_name,
            'playerNum': 1,
            'connected': True,
            'score': 0
        }],
        'status': 'waiting',
        'winner': None,
        'rematchRequested': {},
        'gameState': create_game_state(game_type)
    }

    rooms[room_id] = room
    join_room(room_id)
    emit('room_created', {'room': room, 'playerNum': 1})

@socketio.on('join_room')
def on_join_room(data):
    room_id = data.get('roomId', '').strip().upper()
    player_name = data.get('playerName', 'Player 2')

    if room_id not in rooms:
        emit('error_message', 'اتاق مورد نظر یافت نشد')
        return

    room = rooms[room_id]
    if len(room['players']) >= 2:
        emit('error_message', 'اتاق پر است (حداکثر ۲ نفر)')
        return

    room['players'].append({
        'id': request.sid,
        'socketId': request.sid,
        'name': player_name,
        'playerNum': 2,
        'connected': True,
        'score': 0
    })
    room['status'] = 'playing'
    join_room(room_id)
    emit('room_joined', {'room': room, 'playerNum': 2})
    emit('game_started', {'room': room}, to=room_id)

@socketio.on('leave_room')
def on_leave():
    for room_id, room in list(rooms.items()):
        for p in room['players']:
            if p['socketId'] == request.sid:
                leave_room(room_id)
                room['players'] = [x for x in room['players'] if x['socketId'] != request.sid]
                if len(room['players']) == 0:
                    rooms.pop(room_id, None)
                else:
                    emit('player_disconnected', {'playerNum': p['playerNum']}, to=room_id)

@socketio.on('request_rematch')
def on_rematch():
    for room_id, room in rooms.items():
        for p in room['players']:
            if p['socketId'] == request.sid:
                room['gameState'] = create_game_state(room['gameType'])
                room['status'] = 'playing'
                room['winner'] = None
                emit('game_reset', {'room': room}, to=room_id)

@socketio.on('send_emote')
def on_send_emote(data):
    room_id = data.get('roomId')
    player_num = data.get('playerNum')
    emoji = data.get('emoji')
    if room_id in rooms:
        emit('receive_emote', {'playerNum': player_num, 'emoji': emoji}, to=room_id)

@socketio.on('ttt_move')
def on_ttt_move(data):
    room_id = data.get('roomId')
    idx = data.get('index')
    player_num = data.get('playerNum')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    if st['currentTurn'] != player_num or st['board'][idx] is not None: return

    st['board'][idx] = player_num
    lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    won = False
    for a,b,c in lines:
        if st['board'][a] and st['board'][a] == st['board'][b] == st['board'][c]:
            room['winner'] = player_num
            room['status'] = 'finished'
            won = True
            break
    if not won:
        if all(cell is not None for cell in st['board']):
            room['winner'] = 'draw'
            room['status'] = 'finished'
        else:
            st['currentTurn'] = 2 if player_num == 1 else 1

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('dots_set_size')
def on_dots_set_size(data):
    room_id = data.get('roomId')
    size = max(4, min(int(data.get('size', 4)), 9))
    if room_id in rooms and rooms[room_id]['gameType'] == 'dotsboxes':
        rooms[room_id]['gameState'] = create_game_state('dotsboxes', size)
        rooms[room_id]['winner'] = None
        rooms[room_id]['status'] = 'playing'
        rooms[room_id]['rematchRequested'] = {}
        emit('game_update', {'gameState': rooms[room_id]['gameState'], 'winner': None, 'status': 'playing'}, to=room_id)

@socketio.on('dots_move')
def on_dots_move(data):
    room_id = data.get('roomId')
    m_type = data.get('type')
    r = data.get('r')
    c = data.get('c')
    player_num = data.get('playerNum')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    if st['currentTurn'] != player_num: return

    if m_type == 'h':
        if st['hLines'][r][c] is not None: return
        st['hLines'][r][c] = player_num
    else:
        if st['vLines'][r][c] is not None: return
        st['vLines'][r][c] = player_num

    grid_size = st.get('gridSize', 4)
    num_boxes = grid_size - 1

    completed_box = False
    for br in range(num_boxes):
        for bc in range(num_boxes):
            if st['boxes'][br][bc] is None:
                top = st['hLines'][br][bc]
                bottom = st['hLines'][br+1][bc]
                left = st['vLines'][br][bc]
                right = st['vLines'][br][bc+1]
                if top is not None and bottom is not None and left is not None and right is not None:
                    st['boxes'][br][bc] = player_num
                    st['scores'][str(player_num)] += 1
                    completed_box = True

    if not completed_box:
        st['currentTurn'] = 2 if player_num == 1 else 1

    total_claimed = st['scores']['1'] + st['scores']['2']
    total_boxes = num_boxes * num_boxes
    if total_claimed >= total_boxes:
        room['status'] = 'finished'
        room['winner'] = 1 if st['scores']['1'] > st['scores']['2'] else (2 if st['scores']['2'] > st['scores']['1'] else 'draw')

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('connectfour_drop')
def on_c4_drop(data):
    room_id = data.get('roomId')
    col = data.get('col')
    player_num = data.get('playerNum')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    if st['currentTurn'] != player_num: return

    target_r = -1
    for r in range(5, -1, -1):
        if st['grid'][r][col] is None:
            target_r = r
            break
    if target_r == -1: return

    st['grid'][target_r][col] = player_num
    grid = st['grid']
    won = False
    for r in range(6):
        for c in range(7):
            if grid[r][c] == player_num:
                if c + 3 < 7 and all(grid[r][c+i] == player_num for i in range(4)): won = True
                if r + 3 < 6 and all(grid[r+i][c] == player_num for i in range(4)): won = True
                if r + 3 < 6 and c + 3 < 7 and all(grid[r+i][c+i] == player_num for i in range(4)): won = True
                if r + 3 < 6 and c - 3 >= 0 and all(grid[r+i][c-i] == player_num for i in range(4)): won = True

    if won:
        room['winner'] = player_num
        room['status'] = 'finished'
    else:
        if all(grid[0][c] is not None for c in range(7)):
            room['winner'] = 'draw'
            room['status'] = 'finished'
        else:
            st['currentTurn'] = 2 if player_num == 1 else 1

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('pong_paddle')
def on_pong_paddle(data):
    room_id = data.get('roomId')
    y = data.get('y')
    player_num = data.get('playerNum')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']

    if player_num == 1: st['p1PaddleY'] = y
    else: st['p2PaddleY'] = y

    st['ball']['x'] += st['ball']['vx']
    st['ball']['y'] += st['ball']['vy']
    if st['ball']['y'] <= 5 or st['ball']['y'] >= 95: st['ball']['vy'] *= -1

    if st['ball']['x'] <= 10:
        if abs(st['ball']['y'] - st['p1PaddleY']) < 18:
            st['ball']['vx'] = abs(st['ball']['vx']) * 1.05
        else:
            st['scores']['2'] += 1
            st['ball'] = {'x': 50, 'y': 50, 'vx': 0.9, 'vy': 0.6, 'radius': 2}
    elif st['ball']['x'] >= 90:
        if abs(st['ball']['y'] - st['p2PaddleY']) < 18:
            st['ball']['vx'] = -abs(st['ball']['vx']) * 1.05
        else:
            st['scores']['1'] += 1
            st['ball'] = {'x': 50, 'y': 50, 'vx': -0.9, 'vy': 0.6, 'radius': 2}

    if st['scores']['1'] >= 10 or st['scores']['2'] >= 10:
        room['status'] = 'finished'
        room['winner'] = 1 if st['scores']['1'] >= 10 else 2

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('disconnect')
def on_disconnect():
    for room_id, room in list(rooms.items()):
        for p in room['players']:
            if p['socketId'] == request.sid:
                p['connected'] = False
                emit('player_disconnected', {'playerNum': p['playerNum']}, to=room_id)

if __name__ == '__main__':
    port = 8080
    ip = get_local_ip()
    print("\n" + "=" * 50)
    print("🎮 LOCAL GAME SERVER (Termux / Android LAN)")
    print("=" * 50)
    print("🚀 Server started successfully!")
    print(f"\n📱 Open on this phone: http://127.0.0.1:{port}")
    print(f"🌐 Open on another phone: http://{ip}:{port}")
    print("=" * 50 + "\n")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)`,
  },
];
