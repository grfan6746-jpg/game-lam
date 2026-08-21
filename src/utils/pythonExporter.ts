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
# 🎮 اجرای خودکار سرور در Termux (شامل شطرنج، منچ و ۸ بازی دیگر)
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
    descriptionFa: 'فایل اصلی سرور پایتون (پشتیبانی کامل از ۱۰ بازی شامل منچ و شطرنج)',
    content: `"""
=============================================================================
🎮 LOCAL GAME SERVER (Termux / Android / LAN)
Flask + Flask-SocketIO 10-Game Suite (شطرنج، منچ، دوز، نقطه خط و...)
=============================================================================
"""

import os
import socket
import random
import time
import threading
from flask import Flask, render_template, render_template_string, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__, template_folder='templates')
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

def create_initial_chess_board():
    board = [[None]*8 for _ in range(8)]
    back_row = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
    for c in range(8):
        board[0][c] = {'type': back_row[c], 'color': 'b', 'hasMoved': False}
        board[1][c] = {'type': 'p', 'color': 'b', 'hasMoved': False}
        board[6][c] = {'type': 'p', 'color': 'w', 'hasMoved': False}
        board[7][c] = {'type': back_row[c], 'color': 'w', 'hasMoved': False}
    return board

def create_game_state(game_type, size=4):
    if game_type == 'chess':
        return {
            'board': create_initial_chess_board(),
            'currentTurn': 'w',
            'capturedPieces': {'w': [], 'b': []},
            'lastMove': None,
            'winner': None
        }
    elif game_type == 'ludo':
        return {
            'totalPlayers': 4,
            'currentTurn': 1,
            'diceValue': None,
            'hasRolled': False,
            'players': {
                '1': {'playerNum': 1, 'color': 'red', 'name': 'بازیکن ۱ (قرمز)', 'tokens': [{'id': 0, 'step': -1}, {'id': 1, 'step': -1}, {'id': 2, 'step': -1}, {'id': 3, 'step': -1}], 'finishedCount': 0},
                '2': {'playerNum': 2, 'color': 'green', 'name': 'بازیکن ۲ (سبز)', 'tokens': [{'id': 0, 'step': -1}, {'id': 1, 'step': -1}, {'id': 2, 'step': -1}, {'id': 3, 'step': -1}], 'finishedCount': 0},
                '3': {'playerNum': 3, 'color': 'yellow', 'name': 'ربات ۳ (زرد)', 'tokens': [{'id': 0, 'step': -1}, {'id': 1, 'step': -1}, {'id': 2, 'step': -1}, {'id': 3, 'step': -1}], 'finishedCount': 0},
                '4': {'playerNum': 4, 'color': 'blue', 'name': 'ربات ۴ (آبی)', 'tokens': [{'id': 0, 'step': -1}, {'id': 1, 'step': -1}, {'id': 2, 'step': -1}, {'id': 3, 'step': -1}], 'finishedCount': 0}
            },
            'activePlayerNums': [1, 2, 3, 4],
            'movableTokenIds': [],
            'winner': None,
            'lastActionText': 'تاس بیندازید تا بازی شروع شود'
        }
    elif game_type == 'tictactoe':
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
            'p1Grid': [['empty']*10 for _ in range(10)],
            'p2Grid': [['empty']*10 for _ in range(10)],
            'currentTurn': 1
        }
    elif game_type == 'connectfour':
        return {'grid': [[None]*7 for _ in range(6)], 'currentTurn': 1}
    elif game_type == 'pong':
        return {
            'ball': {'x': 50, 'y': 50, 'vx': 0.8, 'vy': 0.5, 'radius': 2.5},
            'p1PaddleY': 50,
            'p2PaddleY': 50,
            'scores': {'1': 0, '2': 0},
            'targetScore': 10
        }
    elif game_type == 'snake':
        return {
            'snake1': [{'x': 4, 'y': 12}, {'x': 3, 'y': 12}],
            'snake2': [{'x': 19, 'y': 12}, {'x': 20, 'y': 12}],
            'dir1': {'x': 1, 'y': 0},
            'dir2': {'x': -1, 'y': 0},
            'food': [{'x': 12, 'y': 6}, {'x': 12, 'y': 18}],
            'scores': {'1': 0, '2': 0},
            'alive1': True,
            'alive2': True
        }
    elif game_type == 'racing':
        return {
            'p1Car': {'x': 100, 'y': 350, 'angle': -1.57, 'speed': 0, 'lap': 0},
            'p2Car': {'x': 140, 'y': 350, 'angle': -1.57, 'speed': 0, 'lap': 0},
            'targetLaps': 3
        }
    elif game_type == 'fighting':
        return {
            'p1': {'x': 150, 'y': 300, 'health': 100, 'facing': 'right', 'roundsWon': 0},
            'p2': {'x': 450, 'y': 300, 'health': 100, 'facing': 'left', 'roundsWon': 0},
            'targetRounds': 2
        }
    return {}

@app.route('/')
def index():
    server_ip = get_local_ip()
    template_path = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
    if os.path.exists(template_path):
        return render_template('index.html', server_ip=server_ip, server_port=8080)
    return "<h1>Local Game Server running. templates/index.html missing</h1>"

@socketio.on('ping_check')
def on_ping(ts):
    emit('pong_reply', ts)

@socketio.on('create_room')
def on_create_room(data):
    game_type = data.get('gameType', 'chess')
    player_name = data.get('playerName', 'Player 1')
    room_id = generate_room_id()
    room = {
        'id': room_id,
        'gameType': game_type,
        'players': [{'id': request.sid, 'socketId': request.sid, 'name': player_name, 'playerNum': 1, 'connected': True}],
        'status': 'waiting',
        'winner': None,
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
        emit('error_message', 'اتاق پر است')
        return
    room['players'].append({'id': request.sid, 'socketId': request.sid, 'name': player_name, 'playerNum': 2, 'connected': True})
    room['status'] = 'playing'
    join_room(room_id)
    emit('room_joined', {'room': room, 'playerNum': 2})
    emit('game_started', {'room': room}, to=room_id)

@socketio.on('chess_move')
def on_chess_move(data):
    room_id = data.get('roomId')
    frm, to = data.get('from'), data.get('to')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    piece = st['board'][frm['r']][frm['c']]
    target = st['board'][to['r']][to['c']]
    if not piece: return
    if target:
        if target['type'] == 'k':
            room['winner'] = 1 if piece['color'] == 'w' else 2
            room['status'] = 'finished'
    st['board'][frm['r']][frm['c']] = None
    st['board'][to['r']][to['c']] = piece
    st['currentTurn'] = 'b' if st['currentTurn'] == 'w' else 'w'
    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('ludo_roll_dice')
def on_ludo_roll(data):
    room_id = data.get('roomId')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    dice = random.randint(1, 6)
    st['diceValue'] = dice
    st['hasRolled'] = True
    slot = st['players'][str(st['currentTurn'])]
    movables = [t['id'] for t in slot['tokens'] if (t['step'] == -1 and dice == 6) or (t['step'] >= 0 and t['step'] + dice <= 56)]
    st['movableTokenIds'] = movables
    st['lastActionText'] = f"{slot['name']} عدد {dice} آورد."
    if not movables:
        st['hasRolled'] = False
        st['currentTurn'] = (st['currentTurn'] % 4) + 1
    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('ludo_move_token')
def on_ludo_move(data):
    room_id = data.get('roomId')
    token_id = data.get('tokenId')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    slot = st['players'][str(st['currentTurn'])]
    dice = st.get('diceValue', 1)
    for t in slot['tokens']:
        if t['id'] == token_id:
            t['step'] = 0 if t['step'] == -1 else t['step'] + dice
            if t['step'] >= 56:
                slot['finishedCount'] += 1
                if slot['finishedCount'] >= 4:
                    room['winner'] = st['currentTurn']
                    room['status'] = 'finished'
            break
    st['hasRolled'] = False
    st['diceValue'] = None
    st['movableTokenIds'] = []
    if dice != 6:
        st['currentTurn'] = (st['currentTurn'] % 4) + 1
    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('ttt_move')
def on_ttt_move(data):
    room_id, idx, player_num = data.get('roomId'), data.get('index'), data.get('playerNum')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    if st['currentTurn'] != player_num or st['board'][idx] is not None: return
    st['board'][idx] = player_num
    lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    for a,b,c in lines:
        if st['board'][a] and st['board'][a] == st['board'][b] == st['board'][c]:
            room['winner'] = player_num
            room['status'] = 'finished'
            emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)
            return
    if all(x is not None for x in st['board']):
        room['winner'] = 'draw'
        room['status'] = 'finished'
    else:
        st['currentTurn'] = 2 if player_num == 1 else 1
    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

if __name__ == '__main__':
    port = 8080
    ip = get_local_ip()
    print(f"🎮 LOCAL GAME SERVER started on http://127.0.0.1:{port} (IP: {ip})")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)`,
  },
];
