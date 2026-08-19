"""
=============================================================================
🎮 LOCAL GAME SERVER (Termux / Android / LAN)
Flask + Flask-SocketIO 2-Player Real-Time Game Suite
=============================================================================
"""

import os
import socket
import random
import string
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'local-game-termux-secret-key-2026'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# ----------------- In-Memory Rooms State -----------------
rooms = {}

def get_local_ip():
    """Finds the LAN IP address of the Termux Android phone."""
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

def create_game_state(game_type):
    if game_type == 'tictactoe':
        return {'board': [None] * 9, 'currentTurn': 1, 'winningLine': None}
    elif game_type == 'dotsboxes':
        return {
            'gridSize': 4,
            'hLines': [[False]*3 for _ in range(4)],
            'vLines': [[False]*4 for _ in range(3)],
            'boxes': [[None]*3 for _ in range(3)],
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
            'ball': {'x': 50, 'y': 50, 'vx': 0.8, 'vy': 0.5, 'radius': 2},
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

# ----------------- HTTP Routes -----------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/info')
def server_info():
    return jsonify({
        'name': 'Termux Local Game Server',
        'ip': get_local_ip(),
        'port': 8080,
        'active_rooms': len(rooms)
    })

# ----------------- WebSocket Events -----------------
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
        emit('error_message', 'اتاق مورد نظر یافت نشد (Room not found)')
        return

    room = rooms[room_id]
    if len(room['players']) >= 2:
        emit('error_message', 'اتاق پر است (حداکثر ۲ بازیکن)')
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
            st['winningLine'] = [a,b,c]
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

@socketio.on('disconnect')
def on_disconnect():
    for room_id, room in list(rooms.items()):
        for p in room['players']:
            if p['socketId'] == request.sid:
                p['connected'] = False
                emit('player_disconnected', {'playerNum': p['playerNum']}, to=room_id)

# ----------------- Server Boot -----------------
if __name__ == '__main__':
    port = 8080
    ip = get_local_ip()

    print("\n" + "=" * 50)
    print("🎮 LOCAL GAME SERVER (Termux / Android LAN)")
    print("=" * 50)
    print("🚀 Server started successfully!")
    print(f"\n📱 Open on this phone (Termux Host):")
    print(f"   http://127.0.0.1:{port}")
    print(f"\n🌐 Open on other phones/tablets in same Wi-Fi:")
    print(f"   http://{ip}:{port}")
    print("=" * 50 + "\n")

    socketio.run(app, host='0.0.0.0', port=port, debug=False)
