"""
=============================================================================
🎮 LOCAL GAME SERVER (Termux / Android / LAN)
Flask + Flask-SocketIO 2-Player Real-Time Game Suite (8 Games)
Author: Google AI Studio Build
=============================================================================
"""

import os
import socket
import random
import time
import math
import threading
from flask import Flask, render_template_string, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'local-game-termux-secret-key-2026'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

rooms = {}
room_threads = {}

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
            'ball': {'x': 50, 'y': 50, 'vx': 0.8, 'vy': 0.5, 'radius': 2.5},
            'p1PaddleY': 50,
            'p2PaddleY': 50,
            'paddleHeight': 22,
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

def run_game_loop(room_id):
    """Background real-time loop for Pong and Snake"""
    while True:
        time.sleep(0.04) # ~25 FPS
        if room_id not in rooms:
            break
        room = rooms[room_id]
        if room['status'] != 'playing' or room['winner'] is not None:
            continue

        g_type = room['gameType']
        st = room['gameState']

        if g_type == 'pong':
            ball = st['ball']
            ball['x'] += ball['vx']
            ball['y'] += ball['vy']

            if ball['y'] <= 3 or ball['y'] >= 97:
                ball['vy'] *= -1

            # Left paddle check (P1)
            if ball['x'] <= 6:
                if abs(ball['y'] - st['p1PaddleY']) <= 14:
                    ball['vx'] = abs(ball['vx']) * 1.04
                    ball['vy'] += (ball['y'] - st['p1PaddleY']) * 0.05
                    ball['x'] = 6.1
                elif ball['x'] < 0:
                    st['scores']['2'] += 1
                    if st['scores']['2'] >= st['targetScore']:
                        room['winner'] = 2
                        room['status'] = 'finished'
                    else:
                        ball['x'], ball['y'], ball['vx'], ball['vy'] = 50, 50, 0.8, 0.5

            # Right paddle check (P2)
            elif ball['x'] >= 94:
                if abs(ball['y'] - st['p2PaddleY']) <= 14:
                    ball['vx'] = -abs(ball['vx']) * 1.04
                    ball['vy'] += (ball['y'] - st['p2PaddleY']) * 0.05
                    ball['x'] = 93.9
                elif ball['x'] > 100:
                    st['scores']['1'] += 1
                    if st['scores']['1'] >= st['targetScore']:
                        room['winner'] = 1
                        room['status'] = 'finished'
                    else:
                        ball['x'], ball['y'], ball['vx'], ball['vy'] = 50, 50, -0.8, 0.5

            socketio.emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, room=room_id)

        elif g_type == 'snake':
            # Run snake step every ~120ms
            time.sleep(0.08)
            if st['alive1']:
                h1 = {'x': st['snake1'][0]['x'] + st['dir1']['x'], 'y': st['snake1'][0]['y'] + st['dir1']['y']}
                if h1['x'] < 0 or h1['x'] >= 24 or h1['y'] < 0 or h1['y'] >= 24 or any(s['x'] == h1['x'] and s['y'] == h1['y'] for s in st['snake1'] + st['snake2']):
                    st['alive1'] = False
                else:
                    st['snake1'].insert(0, h1)
                    eaten = False
                    for idx, f in enumerate(st['food']):
                        if f['x'] == h1['x'] and f['y'] == h1['y']:
                            st['scores']['1'] += 10
                            st['food'][idx] = {'x': random.randint(0, 23), 'y': random.randint(0, 23)}
                            eaten = True
                            break
                    if not eaten:
                        st['snake1'].pop()

            if st['alive2']:
                h2 = {'x': st['snake2'][0]['x'] + st['dir2']['x'], 'y': st['snake2'][0]['y'] + st['dir2']['y']}
                if h2['x'] < 0 or h2['x'] >= 24 or h2['y'] < 0 or h2['y'] >= 24 or any(s['x'] == h2['x'] and s['y'] == h2['y'] for s in st['snake1'] + st['snake2']):
                    st['alive2'] = False
                else:
                    st['snake2'].insert(0, h2)
                    eaten = False
                    for idx, f in enumerate(st['food']):
                        if f['x'] == h2['x'] and f['y'] == h2['y']:
                            st['scores']['2'] += 10
                            st['food'][idx] = {'x': random.randint(0, 23), 'y': random.randint(0, 23)}
                            eaten = True
                            break
                    if not eaten:
                        st['snake2'].pop()

            if not st['alive1'] and not st['alive2']:
                room['winner'] = 'draw'
                room['status'] = 'finished'
            elif not st['alive1']:
                room['winner'] = 2
                room['status'] = 'finished'
            elif not st['alive2']:
                room['winner'] = 1
                room['status'] = 'finished'

            socketio.emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, room=room_id)

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
  <style>
    body { font-family: 'Vazirmatn', system-ui, sans-serif; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  <header class="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg">🎮</div>
        <div>
          <h1 class="text-sm font-black text-slate-100">سرور بازی محلی Termux (۸ بازی)</h1>
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

  <main class="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 flex flex-col items-center justify-center">
    
    <!-- VIEW 1: LOBBY -->
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
        <h2 class="text-sm font-black text-slate-400">انتخاب بازی برای ساخت اتاق جدید (۸ بازی کامل):</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" id="games-list-grid"></div>
      </div>
    </div>

    <!-- VIEW 2: ROOM LOBBY -->
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

    <!-- VIEW 3: GAME ARENA -->
    <div id="view-game" class="hidden w-full flex flex-col items-center space-y-4">
      <div class="w-full max-w-xl flex items-center justify-between px-5 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-bold shadow-lg">
        <div id="game-player1-badge" class="flex items-center gap-2 text-cyan-400">
          <span class="h-3 w-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span>
          <span id="game-p1-name">بازیکن ۱</span>
        </div>
        <div id="game-status-text" class="px-3 py-1 rounded-full bg-slate-950 text-slate-200 border border-slate-800 font-mono">نوبت بازی</div>
        <div id="game-player2-badge" class="flex items-center gap-2 text-rose-400">
          <span id="game-p2-name">بازیکن ۲</span>
          <span class="h-3 w-3 rounded-full bg-rose-400 shadow-sm shadow-rose-400"></span>
        </div>
      </div>

      <!-- Active Arena Component -->
      <div id="game-arena-container" class="w-full flex justify-center"></div>

      <!-- Emotes Bar -->
      <div class="flex items-center gap-2 pt-2">
        <span class="text-xs text-slate-500 font-bold">واکنش:</span>
        <button onclick="sendEmote('🔥')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">🔥</button>
        <button onclick="sendEmote('👏')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">👏</button>
        <button onclick="sendEmote('😂')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">😂</button>
        <button onclick="sendEmote('😎')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">😎</button>
        <button onclick="sendEmote('🎯')" class="text-xl p-2 rounded-xl bg-slate-900 hover:bg-slate-800">🎯</button>
      </div>

      <!-- Game Over Panel -->
      <div id="game-over-panel" class="hidden w-full max-w-sm p-5 rounded-3xl bg-slate-900 border-2 border-cyan-500/50 shadow-2xl text-center space-y-4">
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
      { id: 'dotsboxes', title: 'نقطه و خط', icon: '🔵', desc: 'خطوط نازک و رنگی' },
      { id: 'battleship', title: 'نبرد کشتی‌ها', icon: '🚢', desc: 'چیدمان ناوگان و شلیک' },
      { id: 'connectfour', title: 'چهاردرخط', icon: '🔴🟡', desc: '۴ مهره متوالی' },
      { id: 'pong', title: 'پینگ‌پنگ', icon: '🏓', desc: 'راکت و توپ دوبعدی' },
      { id: 'snake', title: 'مار دونفره', icon: '🐍', desc: 'رقابت مار آبی و قرمز' },
      { id: 'racing', title: 'مسابقه ماشین', icon: '🏎️', desc: 'پیست و ۳ دور مسابقه' },
      { id: 'fighting', title: 'مبارزه تن‌به‌تن', icon: '⚔️', desc: 'مشت، پرش، دفاع' }
    ];

    let socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    let currentRoom = null, myPlayerNum = 1;
    let playerName = localStorage.getItem('localgame_name') || 'بازیکن';
    let myShips = [];

    document.getElementById('player-name-input').value = playerName;
    document.getElementById('player-name-input').addEventListener('input', e => {
      playerName = e.target.value; localStorage.setItem('localgame_name', playerName);
    });

    // Sound FX Synth
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playBeep(freq = 440, type = 'sine', duration = 0.1) {
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {}
    }

    // Ping loop
    setInterval(() => { if (socket.connected) socket.emit('ping_check', Date.now()); }, 3000);
    socket.on('pong_reply', start => { document.getElementById('ping-text').innerText = (Date.now() - start) + ' ms'; });

    // Render lobby games
    document.getElementById('games-list-grid').innerHTML = GAMES.map(g => `
      <div onclick="createRoomForGame('${g.id}')" class="group rounded-3xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 p-4 transition cursor-pointer shadow-lg">
        <div class="flex items-center gap-3">
          <div class="text-3xl p-2.5 rounded-2xl bg-slate-950">${g.icon}</div>
          <div><h3 class="text-sm font-black text-slate-100 group-hover:text-cyan-400">${g.title}</h3><p class="text-[11px] text-slate-400">${g.desc}</p></div>
        </div>
      </div>
    `).join('');

    // Socket events
    socket.on('room_created', data => { currentRoom = data.room; myPlayerNum = data.playerNum; showRoomLobby(); });
    socket.on('room_joined', data => { currentRoom = data.room; myPlayerNum = data.playerNum; if (data.room.status === 'playing') startGameView(); else showRoomLobby(); });
    socket.on('game_started', data => { currentRoom = data.room; playBeep(587, 'triangle', 0.2); startGameView(); });
    socket.on('game_update', data => { if (!currentRoom) return; currentRoom.gameState = data.gameState; currentRoom.winner = data.winner; currentRoom.status = data.status; renderCurrentGame(); updateStatusHeader(); });
    socket.on('racing_update', data => { if (!currentRoom) return; currentRoom.gameState = data.gameState; currentRoom.winner = data.winner; currentRoom.status = data.status; renderCurrentGame(); updateStatusHeader(); });
    socket.on('game_reset', data => { currentRoom = data.room; document.getElementById('game-over-panel').classList.add('hidden'); renderCurrentGame(); updateStatusHeader(); });
    socket.on('error_message', msg => { const b = document.getElementById('error-banner'); b.innerText = msg; b.classList.remove('hidden'); setTimeout(() => b.classList.add('hidden'), 4000); });
    socket.on('receive_emote', data => {
      playBeep(880, 'sine', 0.1);
      const d = document.createElement('div');
      d.className = 'fixed top-20 left-1/2 -translate-x-1/2 text-4xl p-3 rounded-full bg-slate-900 border border-cyan-500 shadow-2xl animate-bounce z-50';
      d.innerText = data.emoji; document.body.appendChild(d); setTimeout(() => d.remove(), 2000);
    });

    function createRoomForGame(t) { playBeep(440); socket.emit('create_room', { gameType: t, playerName }); }
    function joinRoomFromInput() { const c = document.getElementById('join-code-input').value.trim().toUpperCase(); if (c) { playBeep(440); socket.emit('join_room', { roomId: c, playerName }); } }
    function leaveCurrentRoom() { if (currentRoom) socket.emit('leave_room'); currentRoom = null; document.getElementById('view-lobby').classList.remove('hidden'); document.getElementById('view-room-lobby').classList.add('hidden'); document.getElementById('view-game').classList.add('hidden'); document.getElementById('leave-room-btn').classList.add('hidden'); }
    function requestRematch() { playBeep(659, 'triangle', 0.15); socket.emit('request_rematch'); }
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
      document.getElementById('game-p1-name').innerText = (p1 ? p1.name : 'بازیکن ۱') + (myPlayerNum === 1 ? ' (شما: 🔵)' : '');
      document.getElementById('game-p2-name').innerText = (p2 ? p2.name : 'بازیکن ۲') + (myPlayerNum === 2 ? ' (شما: 🔴)' : '');
      if (currentRoom.gameType === 'battleship') randomizeFleet();
      renderCurrentGame(); updateStatusHeader();
    }

    function updateStatusHeader() {
      const txt = document.getElementById('game-status-text');
      if (currentRoom.status === 'finished') {
        document.getElementById('game-over-panel').classList.remove('hidden');
        if (currentRoom.winner === 'draw') {
          txt.innerText = '🤝 مساوی شد!';
          document.getElementById('game-over-title').innerText = '🤝 بازی مساوی شد!';
        } else if (currentRoom.winner === myPlayerNum) {
          txt.innerText = '🏆 شما بردید!';
          document.getElementById('game-over-title').innerText = '🏆 شما برنده شدید!';
          playBeep(784, 'triangle', 0.3);
        } else {
          txt.innerText = '💔 حریف برد!';
          document.getElementById('game-over-title').innerText = '💔 حریف برنده شد!';
        }
      } else {
        const t = currentRoom.gameState ? currentRoom.gameState.currentTurn : null;
        if (t) {
          txt.innerText = t === myPlayerNum ? '👉 نوبت شماست' : '⏳ نوبت حریف...';
        } else {
          txt.innerText = '⚔️ در حال بازی';
        }
      }
    }

    // Battleship Fleet Randomizer
    function randomizeFleet() {
      const sizes = [5, 4, 3, 3, 2];
      const grid = Array(10).fill(null).map(() => Array(10).fill(false));
      myShips = [];
      sizes.forEach((sz, idx) => {
        let placed = false, attempts = 0;
        while (!placed && attempts < 200) {
          attempts++;
          const horiz = Math.random() > 0.5;
          const r = Math.floor(Math.random() * (horiz ? 10 : 10 - sz));
          const c = Math.floor(Math.random() * (horiz ? 10 - sz : 10));
          const coords = [];
          let overlap = false;
          for (let i = 0; i < sz; i++) {
            const nr = horiz ? r : r + i, nc = horiz ? c + i : c;
            if (grid[nr][nc]) { overlap = true; break; }
            coords.push({ r: nr, c: nc });
          }
          if (!overlap) {
            coords.forEach(pt => { grid[pt.r][pt.c] = true; });
            myShips.push({ name: 'Ship ' + (idx+1), size: sz, coords, sunk: false });
            placed = true;
          }
        }
      });
    }

    function confirmBattleshipFleet() {
      playBeep(520);
      socket.emit('battleship_ready', { roomId: currentRoom.id, playerNum: myPlayerNum, ships: myShips });
    }

    // ----------------- RENDERERS -----------------
    function renderCurrentGame() {
      const c = document.getElementById('game-arena-container'), st = currentRoom.gameState, t = currentRoom.gameType;
      const myTurn = st.currentTurn === myPlayerNum && currentRoom.status !== 'finished';

      if (t === 'tictactoe') {
        c.innerHTML = `
          <div class="grid grid-cols-3 gap-3 bg-slate-950 p-5 rounded-3xl border-2 border-slate-800 shadow-2xl">
            ${st.board.map((cell, idx) => `
              <button onclick="playBeep(450); socket.emit('ttt_move', { roomId: currentRoom.id, index: ${idx}, playerNum: myPlayerNum })" ${cell !== null || !myTurn ? 'disabled' : ''} class="h-24 w-24 rounded-2xl flex items-center justify-center text-5xl font-black bg-slate-900 border border-slate-800 ${cell === null && myTurn ? 'hover:border-cyan-400 hover:bg-slate-850 cursor-pointer' : ''}">
                ${cell === 1 ? '<span class="text-cyan-400">✕</span>' : (cell === 2 ? '<span class="text-rose-400">○</span>' : '')}
              </button>
            `).join('')}
          </div>
        `;
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

        const gridColsCss = Array.from({ length: totalCols }, (_, i) => i % 2 === 0 ? `${dotSz}px` : `${boxSz}px`).join(' ');
        const gridRowsCss = Array.from({ length: totalRows }, (_, i) => i % 2 === 0 ? `${dotSz}px` : `${boxSz}px`).join(' ');

        let gridCellsHtml = '';
        for (let gr = 0; gr < totalRows; gr++) {
          for (let gc = 0; gc < totalCols; gc++) {
            const isEvenR = gr % 2 === 0;
            const isEvenC = gc % 2 === 0;

            if (isEvenR && isEvenC) {
              // Dot
              gridCellsHtml += `
                <div class="w-full h-full flex items-center justify-center pointer-events-none">
                  <div style="width:${dotSz}px; height:${dotSz}px;" class="rounded-full bg-slate-200 border-2 border-slate-900 shadow-sm shadow-cyan-500/30"></div>
                </div>
              `;
            } else if (isEvenR && !isEvenC) {
              // Horizontal Line
              const r = gr / 2;
              const c = (gc - 1) / 2;
              const val = st.hLines[r] ? st.hLines[r][c] : null;
              const claimed = val !== null;
              const cls = val === 1 ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : (val === 2 ? 'bg-rose-500 shadow-sm shadow-rose-500' : (myTurn ? 'bg-slate-800 hover:bg-cyan-500/40 cursor-pointer' : 'bg-slate-850 cursor-default'));
              gridCellsHtml += `
                <div class="w-full h-full flex items-center justify-center px-0.5">
                  <button onclick="playBeep(480); socket.emit('dots_move', { roomId: currentRoom.id, type: 'h', r: ${r}, c: ${c}, playerNum: myPlayerNum })" ${claimed || !myTurn ? 'disabled' : ''} style="height:${lineThick}px;" class="w-full rounded-full transition-all ${cls}"></button>
                </div>
              `;
            } else if (!isEvenR && isEvenC) {
              // Vertical Line (EXACT SAME COLUMN AS THE DOT -> 100% CENTERED!)
              const r = (gr - 1) / 2;
              const c = gc / 2;
              const val = st.vLines[r] ? st.vLines[r][c] : null;
              const claimed = val !== null;
              const cls = val === 1 ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : (val === 2 ? 'bg-rose-500 shadow-sm shadow-rose-500' : (myTurn ? 'bg-slate-800 hover:bg-cyan-500/40 cursor-pointer' : 'bg-slate-850 cursor-default'));
              gridCellsHtml += `
                <div class="w-full h-full flex items-center justify-center py-0.5">
                  <button onclick="playBeep(480); socket.emit('dots_move', { roomId: currentRoom.id, type: 'v', r: ${r}, c: ${c}, playerNum: myPlayerNum })" ${claimed || !myTurn ? 'disabled' : ''} style="width:${lineThick}px;" class="h-full rounded-full transition-all ${cls}"></button>
                </div>
              `;
            } else {
              // Box
              const r = (gr - 1) / 2;
              const c = (gc - 1) / 2;
              const owner = st.boxes[r] ? st.boxes[r][c] : null;
              const cls = owner === 1 ? 'bg-cyan-500/25 border border-cyan-500/40 text-cyan-300' : (owner === 2 ? 'bg-rose-500/25 border border-rose-500/40 text-rose-300' : 'bg-slate-900/30');
              gridCellsHtml += `
                <div class="w-full h-full m-0.5 rounded-lg flex items-center justify-center font-black ${cls}">
                  ${owner === 1 ? `<span class="${txtSz} text-cyan-400">P1</span>` : (owner === 2 ? `<span class="${txtSz} text-rose-400">P2</span>` : '')}
                </div>
              `;
            }
          }
        }

        c.innerHTML = `
          <div class="flex flex-col items-center space-y-3 max-w-full">
            <!-- Size Selector -->
            <div class="flex flex-col items-center space-y-1 bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-800">
              <span class="text-[11px] text-slate-400 font-bold">اندازه زمین:</span>
              <div class="flex gap-1 flex-wrap justify-center">
                ${[4,5,6,7,8,9].map(sz => `
                  <button onclick="playBeep(500); socket.emit('dots_set_size', { roomId: currentRoom.id, size: ${sz} })" class="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold ${sz === numDots ? 'bg-cyan-500 text-slate-950 shadow' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'}">
                    ${sz}×${sz}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Score overview -->
            <div class="flex gap-6 bg-slate-950 px-5 py-2 rounded-2xl border border-slate-800 text-xs font-mono shadow-inner">
              <span class="text-cyan-400 font-bold">🔵 آبی (P1): ${st.scores['1']}</span>
              <span class="text-rose-400 font-bold">🔴 قرمز (P2): ${st.scores['2']}</span>
            </div>

            <!-- CSS Grid Board -->
            <div class="bg-slate-950 p-4 sm:p-6 rounded-3xl border-2 border-slate-800 shadow-2xl overflow-x-auto max-w-full">
              <div style="display:grid; grid-template-columns:${gridColsCss}; grid-template-rows:${gridRowsCss}; width:max-content;" class="mx-auto select-none">
                ${gridCellsHtml}
              </div>
            </div>

            <div class="flex gap-4 text-[11px] font-mono">
              <span class="text-cyan-400">■ خطوط بازیکن آبی</span>
              <span class="text-rose-400">■ خطوط بازیکن قرمز</span>
            </div>
          </div>
        `;
      } else if (t === 'battleship') {
        const isBattle = st.phase === 'battle';
        const isReady = myPlayerNum === 1 ? st.p1Ready : st.p2Ready;
        const oppGrid = myPlayerNum === 1 ? st.p2Grid : st.p1Grid;
        const myGrid = myPlayerNum === 1 ? st.p1Grid : st.p2Grid;

        if (!isBattle) {
          c.innerHTML = `
            <div class="flex flex-col items-center space-y-4 w-full max-w-md">
              <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2 w-full">
                <p class="text-xs font-bold text-cyan-400">⚓ مرحله چیدمان ناوگان جنگی (۵ کشتی)</p>
                <div class="flex justify-center gap-3">
                  <button onclick="randomizeFleet(); renderCurrentGame();" class="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200">🔀 چیدمان تصادفی</button>
                  <button onclick="confirmBattleshipFleet()" ${isReady ? 'disabled' : ''} class="px-4 py-2 rounded-xl ${isReady ? 'bg-slate-700 text-slate-400' : 'bg-cyan-500 text-slate-950 font-black'} text-xs shadow-lg">
                    ${isReady ? 'در انتظار حریف...' : '✅ تایید و آماده نبرد'}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-10 gap-1 bg-slate-950 p-2.5 rounded-2xl border-2 border-cyan-500/40">
                ${(() => {
                  const g = Array(10).fill(null).map(() => Array(10).fill(false));
                  myShips.forEach(s => s.coords.forEach(pt => { g[pt.r][pt.c] = true; }));
                  return g.map(row => row.map(cell => `<div class="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-xs ${cell ? 'bg-cyan-600 text-slate-950' : 'bg-slate-900/60'}">${cell ? '⚓' : ''}</div>`).join('')).join('');
                })()}
              </div>
            </div>
          `;
        } else {
          c.innerHTML = `
            <div class="flex flex-col sm:flex-row gap-4 items-center">
              <div class="flex flex-col items-center space-y-1">
                <span class="text-xs text-rose-400 font-bold">🎯 رادار و شلیک به حریف</span>
                <div class="grid grid-cols-10 gap-1 bg-slate-950 p-2 rounded-2xl border-2 border-rose-500/40">
                  ${oppGrid.map((row, r) => row.map((cell, col) => `
                    <button onclick="playBeep(600); socket.emit('battleship_shoot', { roomId: currentRoom.id, r: ${r}, c: ${col}, playerNum: myPlayerNum })" ${cell === 'hit' || cell === 'miss' || !myTurn ? 'disabled' : ''} class="h-7 w-7 rounded flex items-center justify-center text-xs ${cell === 'hit' ? 'bg-rose-600 text-white' : (cell === 'miss' ? 'bg-sky-900 text-sky-300' : (myTurn ? 'bg-slate-900 hover:bg-rose-500/30' : 'bg-slate-900/60'))}">
                      ${cell === 'hit' ? '💥' : (cell === 'miss' ? '💧' : '')}
                    </button>
                  `).join('')).join('')}
                </div>
              </div>
              <div class="flex flex-col items-center space-y-1">
                <span class="text-xs text-cyan-400 font-bold">🛡️ ناوگان و دفاع شما</span>
                <div class="grid grid-cols-10 gap-1 bg-slate-950 p-2 rounded-2xl border-2 border-cyan-500/40">
                  ${myGrid.map(row => row.map(cell => `
                    <div class="h-7 w-7 rounded flex items-center justify-center text-xs ${cell === 'hit' ? 'bg-rose-600 text-white animate-pulse' : (cell === 'miss' ? 'bg-sky-900/50 text-sky-400' : (cell === 'ship' ? 'bg-cyan-600 text-slate-950' : 'bg-slate-900/40'))}">
                      ${cell === 'hit' ? '💥' : (cell === 'miss' ? '💧' : (cell === 'ship' ? '⚓' : ''))}
                    </div>
                  `).join('')).join('')}
                </div>
              </div>
            </div>
          `;
        }
      } else if (t === 'connectfour') {
        c.innerHTML = `
          <div class="flex flex-col items-center space-y-3">
            <div class="grid grid-cols-7 gap-1.5 sm:gap-2.5 w-full max-w-sm px-2">
              ${[0,1,2,3,4,5,6].map(col => `
                <button onclick="playBeep(500); socket.emit('connectfour_drop', { roomId: currentRoom.id, col: ${col}, playerNum: myPlayerNum })" ${!myTurn || st.grid[0][col] !== null ? 'disabled' : ''} class="h-9 sm:h-10 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 font-bold border border-slate-700 flex items-center justify-center transition">↓</button>
              `).join('')}
            </div>
            <div class="grid grid-cols-7 gap-1.5 sm:gap-2.5 bg-blue-950/80 p-3 sm:p-4 rounded-3xl border-4 border-blue-600 shadow-2xl">
              ${st.grid.map(row => row.map(cell => `
                <div class="h-11 w-11 sm:h-14 sm:w-14 rounded-full flex items-center justify-center ${cell === 1 ? 'bg-rose-500 border-2 border-red-300 shadow-md shadow-red-500/50' : (cell === 2 ? 'bg-yellow-400 border-2 border-yellow-200 shadow-md shadow-yellow-500/50' : 'bg-slate-950')}"></div>
              `).join('')).join('')}
            </div>
            <div class="flex gap-6 text-xs font-mono">
              <span class="text-rose-400">🔴 بازیکن ۱ (قرمز)</span>
              <span class="text-yellow-400">🟡 بازیکن ۲ (زرد)</span>
            </div>
          </div>
        `;
      } else if (t === 'pong') {
        c.innerHTML = `
          <div class="flex flex-col items-center space-y-3 w-full max-w-lg">
            <div class="flex justify-between w-full px-5 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span class="text-cyan-400 font-bold">🔵 P1: ${st.scores['1']}</span>
              <span class="text-slate-500">هدف: ۱۰</span>
              <span class="text-rose-400 font-bold">🔴 P2: ${st.scores['2']}</span>
            </div>
            <canvas id="pong-canvas" width="560" height="320" class="w-full rounded-3xl border-2 border-slate-800 bg-slate-950 shadow-2xl"></canvas>
            <div class="flex gap-4 w-full justify-center">
              <button onclick="playBeep(400); socket.emit('pong_paddle', { roomId: currentRoom.id, y: Math.max(12, (myPlayerNum === 1 ? st.p1PaddleY : st.p2PaddleY) - 14), playerNum: myPlayerNum })" class="flex-1 max-w-[140px] h-12 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 font-bold text-cyan-400 border border-slate-700 shadow-lg">▲ بالا</button>
              <button onclick="playBeep(400); socket.emit('pong_paddle', { roomId: currentRoom.id, y: Math.min(88, (myPlayerNum === 1 ? st.p1PaddleY : st.p2PaddleY) + 14), playerNum: myPlayerNum })" class="flex-1 max-w-[140px] h-12 rounded-2xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 font-bold text-cyan-400 border border-slate-700 shadow-lg">▼ پایین</button>
            </div>
          </div>
        `;
        const cvs = document.getElementById('pong-canvas');
        if (cvs) {
          const ctx = cvs.getContext('2d');
          ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, 560, 320);
          ctx.setLineDash([6, 6]); ctx.strokeStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(280, 0); ctx.lineTo(280, 320); ctx.stroke(); ctx.setLineDash([]);
          // P1 Paddle
          ctx.fillStyle = '#38bdf8'; ctx.fillRect(16, (st.p1PaddleY/100)*320 - 32, 10, 64);
          // P2 Paddle
          ctx.fillStyle = '#fb7185'; ctx.fillRect(560 - 26, (st.p2PaddleY/100)*320 - 32, 10, 64);
          // Ball
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((st.ball.x/100)*560, (st.ball.y/100)*320, 8, 0, Math.PI*2); ctx.fill();
        }
      } else if (t === 'snake') {
        c.innerHTML = `
          <div class="flex flex-col items-center space-y-3 w-full max-w-md">
            <div class="flex justify-between w-full px-5 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span class="text-cyan-400 font-bold">🔵 مار ۱: ${st.scores['1']}</span>
              <span class="text-rose-400 font-bold">🔴 مار ۲: ${st.scores['2']}</span>
            </div>
            <canvas id="snake-canvas" width="380" height="380" class="w-full aspect-square rounded-3xl border-2 border-slate-800 bg-slate-950 shadow-2xl"></canvas>
            <div class="grid grid-cols-3 gap-1.5 w-40 pt-1">
              <div></div>
              <button onclick="playBeep(400); socket.emit('snake_dir', { roomId: currentRoom.id, playerNum: myPlayerNum, dir: {x: 0, y: -1} })" class="h-11 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">▲</button>
              <div></div>
              <button onclick="playBeep(400); socket.emit('snake_dir', { roomId: currentRoom.id, playerNum: myPlayerNum, dir: {x: -1, y: 0} })" class="h-11 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">◀</button>
              <button onclick="playBeep(400); socket.emit('snake_dir', { roomId: currentRoom.id, playerNum: myPlayerNum, dir: {x: 0, y: 1} })" class="h-11 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">▼</button>
              <button onclick="playBeep(400); socket.emit('snake_dir', { roomId: currentRoom.id, playerNum: myPlayerNum, dir: {x: 1, y: 0} })" class="h-11 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">▶</button>
            </div>
          </div>
        `;
        const cvs = document.getElementById('snake-canvas');
        if (cvs) {
          const ctx = cvs.getContext('2d');
          const sz = 380 / 24;
          ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, 380, 380);
          // Food
          st.food.forEach(f => { ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(f.x*sz + sz/2, f.y*sz + sz/2, sz/2 - 1, 0, Math.PI*2); ctx.fill(); });
          // Snake 1
          st.snake1.forEach(s => { ctx.fillStyle = '#38bdf8'; ctx.fillRect(s.x*sz + 1, s.y*sz + 1, sz - 2, sz - 2); });
          // Snake 2
          st.snake2.forEach(s => { ctx.fillStyle = '#fb7185'; ctx.fillRect(s.x*sz + 1, s.y*sz + 1, sz - 2, sz - 2); });
        }
      } else if (t === 'racing') {
        c.innerHTML = `
          <div class="flex flex-col items-center space-y-3 w-full max-w-lg">
            <div class="flex justify-between w-full px-5 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span class="text-cyan-400 font-bold">🏁 دور: ${(myPlayerNum === 1 ? st.p1Car.lap : st.p2Car.lap)} / 3</span>
              <span class="text-amber-400 font-bold">🏎️ سرعت: ${Math.round(Math.abs((myPlayerNum === 1 ? st.p1Car.speed : st.p2Car.speed)*25))} km/h</span>
            </div>
            <canvas id="racing-canvas" width="560" height="360" class="w-full rounded-3xl border-2 border-slate-800 bg-slate-950 shadow-2xl"></canvas>
            <div class="flex justify-between w-full max-w-xs gap-3">
              <div class="flex gap-2">
                <button onpointerdown="startSteer(-1)" onpointerup="stopSteer()" class="h-12 w-12 rounded-xl bg-slate-800 text-cyan-400 font-bold text-lg border border-slate-700">◀</button>
                <button onpointerdown="startSteer(1)" onpointerup="stopSteer()" class="h-12 w-12 rounded-xl bg-slate-800 text-cyan-400 font-bold text-lg border border-slate-700">▶</button>
              </div>
              <div class="flex gap-2">
                <button onpointerdown="startThrottle(-1)" onpointerup="stopThrottle()" class="h-12 w-12 rounded-xl bg-slate-800 text-rose-400 font-bold text-lg border border-slate-700">▼</button>
                <button onpointerdown="startThrottle(1)" onpointerup="stopThrottle()" class="h-12 w-14 rounded-xl bg-emerald-600 text-slate-950 font-black text-lg border border-emerald-500">▲ گاز</button>
              </div>
            </div>
          </div>
        `;
        drawRacingCanvas(st);
      } else if (t === 'fighting') {
        c.innerHTML = `
          <div class="flex flex-col items-center space-y-3 w-full max-w-lg">
            <div class="grid grid-cols-2 gap-4 w-full px-2 text-xs font-bold">
              <div class="text-cyan-400">P1 (${st.p1.health}% HP)<div class="h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden"><div class="h-full bg-cyan-400" style="width:${st.p1.health}%"></div></div></div>
              <div class="text-rose-400 text-left">P2 (${st.p2.health}% HP)<div class="h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden"><div class="h-full bg-rose-500 ml-auto" style="width:${st.p2.health}%"></div></div></div>
            </div>
            <canvas id="fighting-canvas" width="560" height="320" class="w-full rounded-3xl border-2 border-slate-800 bg-slate-950 shadow-2xl"></canvas>
            <div class="flex justify-between w-full max-w-xs gap-3">
              <div class="flex gap-2">
                <button onpointerdown="sendFightMove(-1)" onpointerup="sendFightMove(0)" class="h-12 w-12 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">◀</button>
                <button onpointerdown="sendFightMove(1)" onpointerup="sendFightMove(0)" class="h-12 w-12 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">▶</button>
                <button onclick="sendFightAction('jump')" class="h-12 w-12 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">▲ پرش</button>
              </div>
              <div class="flex gap-2">
                <button onpointerdown="sendFightAction('defend_start')" onpointerup="sendFightAction('defend_end')" class="h-12 w-12 rounded-xl bg-sky-950 text-sky-400 font-bold border border-sky-600/40">🛡️</button>
                <button onclick="playBeep(200, 'sawtooth'); sendFightAction('attack')" class="h-12 w-14 rounded-xl bg-amber-500 text-slate-950 font-black shadow-lg">⚔️ مشت</button>
              </div>
            </div>
          </div>
        `;
        drawFightingCanvas(st);
      }
    }

    function drawRacingCanvas(st) {
      const cvs = document.getElementById('racing-canvas');
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 560, 360);
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(30, 30, 500, 300, 80); ctx.fill();
      ctx.fillStyle = '#064e3b'; ctx.beginPath(); ctx.roundRect(160, 120, 240, 120, 40); ctx.fill();
      // Draw P1 Car
      drawCar(ctx, st.p1Car.x, st.p1Car.y, st.p1Car.angle, '#38bdf8', 'P1');
      // Draw P2 Car
      drawCar(ctx, st.p2Car.x, st.p2Car.y, st.p2Car.angle, '#fb7185', 'P2');
    }

    function drawCar(ctx, x, y, angle, color, label) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.fillStyle = color; ctx.fillRect(-12, -6, 24, 12);
      ctx.fillStyle = '#fff'; ctx.fillRect(-4, -4, 6, 8);
      ctx.restore();
    }

    let steerVal = 0, throttleVal = 0;
    function startSteer(dir) { steerVal = dir; updateCarPhysics(); }
    function stopSteer() { steerVal = 0; }
    function startThrottle(dir) { throttleVal = dir; updateCarPhysics(); }
    function stopThrottle() { throttleVal = 0; }

    function updateCarPhysics() {
      if (!currentRoom || currentRoom.gameType !== 'racing') return;
      const car = myPlayerNum === 1 ? currentRoom.gameState.p1Car : currentRoom.gameState.p2Car;
      if (throttleVal > 0) car.speed = Math.min(car.speed + 0.3, 4.0);
      else if (throttleVal < 0) car.speed = Math.max(car.speed - 0.2, -1.5);
      else car.speed *= 0.95;

      if (Math.abs(car.speed) > 0.1) car.angle += steerVal * 0.08 * (car.speed > 0 ? 1 : -1);
      car.x += Math.cos(car.angle) * car.speed;
      car.y += Math.sin(car.angle) * car.speed;
      if (car.x < 30) car.x = 30; if (car.x > 530) car.x = 530;
      if (car.y < 30) car.y = 30; if (car.y > 330) car.y = 330;
      socket.emit('racing_sync', { roomId: currentRoom.id, playerNum: myPlayerNum, car });
    }

    function drawFightingCanvas(st) {
      const cvs = document.getElementById('fighting-canvas');
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, 560, 320);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 260, 560, 60);
      drawFighter(ctx, st.p1, '#38bdf8', 'P1');
      drawFighter(ctx, st.p2, '#fb7185', 'P2');
    }

    function drawFighter(ctx, f, color, name) {
      ctx.save(); ctx.translate(f.x, f.y - 40);
      if (f.isDefending) { ctx.strokeStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI*2); ctx.stroke(); }
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -20, 12, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 20); ctx.lineTo(-10, 40); ctx.moveTo(0, 20); ctx.lineTo(10, 40); ctx.stroke();
      const fd = f.facing === 'right' ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(f.isAttacking ? fd*25 : fd*10, 0); ctx.stroke();
      ctx.restore();
    }

    function sendFightMove(dir) { socket.emit('fighting_action', { roomId: currentRoom.id, playerNum: myPlayerNum, action: 'move', dir }); }
    function sendFightAction(act) { socket.emit('fighting_action', { roomId: currentRoom.id, playerNum: myPlayerNum, action: act }); }
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

    # Start game loop if Pong or Snake
    if room['gameType'] in ['pong', 'snake'] and room_id not in room_threads:
        t = threading.Thread(target=run_game_loop, args=(room_id,), daemon=True)
        room_threads[room_id] = t
        t.start()

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

# 1. Tic Tac Toe Move
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
            st['winningLine'] = [a,b,c]
            won = True
            break
    if not won:
        if all(cell is not None for cell in st['board']):
            room['winner'] = 'draw'
            room['status'] = 'finished'
        else:
            st['currentTurn'] = 2 if player_num == 1 else 1

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

# 2. Dots & Boxes Move (Stores player_num: 1 for Blue, 2 for Red)
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

# 3. Battleship Ready & Shoot
@socketio.on('battleship_ready')
def on_bs_ready(data):
    room_id = data.get('roomId')
    player_num = data.get('playerNum')
    ships = data.get('ships', [])
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']

    if player_num == 1:
        st['p1Ships'] = ships
        st['p1Ready'] = True
        for s in ships:
            for pt in s['coords']:
                st['p1Grid'][pt['r']][pt['c']] = 'ship'
    else:
        st['p2Ships'] = ships
        st['p2Ready'] = True
        for s in ships:
            for pt in s['coords']:
                st['p2Grid'][pt['r']][pt['c']] = 'ship'

    if st['p1Ready'] and st['p2Ready']:
        st['phase'] = 'battle'

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('battleship_shoot')
def on_bs_shoot(data):
    room_id = data.get('roomId')
    r = data.get('r')
    c = data.get('c')
    player_num = data.get('playerNum')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    if st.get('phase') != 'battle' or st['currentTurn'] != player_num: return

    target_grid = st['p2Grid'] if player_num == 1 else st['p1Grid']
    target_ships = st['p2Ships'] if player_num == 1 else st['p1Ships']
    cell = target_grid[r][c]

    if cell in ['hit', 'miss']: return

    if cell == 'ship':
        target_grid[r][c] = 'hit'
        for s in target_ships:
            if any(pt['r'] == r and pt['c'] == c for pt in s['coords']):
                if all(target_grid[pt['r']][pt['c']] == 'hit' for pt in s['coords']):
                    s['sunk'] = True
        if all(s.get('sunk', False) for s in target_ships):
            room['winner'] = player_num
            room['status'] = 'finished'
    else:
        target_grid[r][c] = 'miss'
        st['currentTurn'] = 2 if player_num == 1 else 1

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

# 4. Connect Four Drop
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

# 5. Pong Paddle
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

# 6. Snake Direction
@socketio.on('snake_dir')
def on_snake_dir(data):
    room_id = data.get('roomId')
    player_num = data.get('playerNum')
    dir_vec = data.get('dir')
    if room_id not in rooms: return
    st = rooms[room_id]['gameState']
    if player_num == 1:
        if st['dir1']['x'] + dir_vec['x'] != 0 or st['dir1']['y'] + dir_vec['y'] != 0:
            st['dir1'] = dir_vec
    else:
        if st['dir2']['x'] + dir_vec['x'] != 0 or st['dir2']['y'] + dir_vec['y'] != 0:
            st['dir2'] = dir_vec

# 7. Racing Sync
@socketio.on('racing_sync')
def on_racing_sync(data):
    room_id = data.get('roomId')
    player_num = data.get('playerNum')
    car = data.get('car')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']

    if player_num == 1:
        st['p1Car'] = car
        if car.get('lap', 0) >= st.get('targetLaps', 3) and room['winner'] is None:
            room['winner'] = 1
            room['status'] = 'finished'
    else:
        st['p2Car'] = car
        if car.get('lap', 0) >= st.get('targetLaps', 3) and room['winner'] is None:
            room['winner'] = 2
            room['status'] = 'finished'

    emit('racing_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

# 8. Fighting Action
@socketio.on('fighting_action')
def on_fight_action(data):
    room_id = data.get('roomId')
    player_num = data.get('playerNum')
    act = data.get('action')
    dir_val = data.get('dir', 0)
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']

    me = st['p1'] if player_num == 1 else st['p2']
    opp = st['p2'] if player_num == 1 else st['p1']

    if act == 'move':
        me['x'] = max(40, min(520, me['x'] + dir_val * 12))
        me['facing'] = 'right' if dir_val > 0 else ('left' if dir_val < 0 else me['facing'])
    elif act == 'jump':
        me['y'] = 220
    elif act == 'defend_start':
        me['isDefending'] = True
    elif act == 'defend_end':
        me['isDefending'] = False
    elif act == 'attack':
        me['isAttacking'] = True
        dist = abs(me['x'] - opp['x'])
        if dist < 65:
            dmg = 4 if opp.get('isDefending', False) else 15
            opp['health'] = max(0, opp['health'] - dmg)
            if opp['health'] <= 0:
                me['roundsWon'] += 1
                if me['roundsWon'] >= st['targetRounds']:
                    room['winner'] = player_num
                    room['status'] = 'finished'
                else:
                    st['p1']['health'] = 100
                    st['p2']['health'] = 100
                    st['p1']['x'] = 150
                    st['p2']['x'] = 450

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
    print("\n" + "=" * 55)
    print("🎮 LOCAL GAME SERVER (Termux / Android LAN - 8 Games)")
    print("=" * 55)
    print("🚀 Server started successfully!")
    print(f"\n📱 Open on this phone: http://127.0.0.1:{port}")
    print(f"🌐 Open on another phone: http://{ip}:{port}")
    print("=" * 55 + "\n")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
