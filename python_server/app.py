"""
=============================================================================
🎮 LOCAL GAME SERVER (Termux / Android / LAN)
Flask + Flask-SocketIO 2-Player & Multi-Player Real-Time Game Suite (10 Games)
Includes: Chess (شطرنج), Ludo (منچ), TicTacToe, Dots & Boxes, Battleship,
Connect Four, Pong, Snake, Racing, Fighting.
Author: Google AI Studio Build
=============================================================================
"""

import os
import socket
import random
import time
import math
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
    # 8x8 standard chess layout
    board = [[None]*8 for _ in range(8)]
    back_row = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
    # Black pieces (row 0, 1)
    for c in range(8):
        board[0][c] = {'type': back_row[c], 'color': 'b', 'hasMoved': False}
        board[1][c] = {'type': 'p', 'color': 'b', 'hasMoved': False}
    # White pieces (row 6, 7)
    for c in range(8):
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
            'isCheck': False,
            'isCheckmate': False,
            'isStalemate': False,
            'winner': None
        }
    elif game_type == 'ludo':
        return {
            'totalPlayers': 4,
            'humanCount': 2,
            'aiCount': 2,
            'currentTurn': 1,
            'diceValue': None,
            'diceRolling': False,
            'hasRolled': False,
            'consecutiveSixes': 0,
            'players': {
                '1': {'playerNum': 1, 'color': 'red', 'name': 'بازیکن ۱ (قرمز)', 'isAi': False, 'tokens': [{'id': 0, 'step': -1}, {'id': 1, 'step': -1}, {'id': 2, 'step': -1}, {'id': 3, 'step': -1}], 'finishedCount': 0},
                '2': {'playerNum': 2, 'color': 'green', 'name': 'بازیکن ۲ (سبز)', 'isAi': False, 'tokens': [{'id': 0, 'step': -1}, {'id': 1, 'step': -1}, {'id': 2, 'step': -1}, {'id': 3, 'step': -1}], 'finishedCount': 0},
                '3': {'playerNum': 3, 'color': 'yellow', 'name': 'ربات ۳ (زرد)', 'isAi': True, 'tokens': [{'id': 0, 'step': -1}, {'id': 1, 'step': -1}, {'id': 2, 'step': -1}, {'id': 3, 'step': -1}], 'finishedCount': 0},
                '4': {'playerNum': 4, 'color': 'blue', 'name': 'ربات ۴ (آبی)', 'isAi': True, 'tokens': [{'id': 0, 'step': -1}, {'id': 1, 'step': -1}, {'id': 2, 'step': -1}, {'id': 3, 'step': -1}], 'finishedCount': 0}
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

            if not st['alive1'] or not st['alive2']:
                room['status'] = 'finished'
                if not st['alive1'] and not st['alive2']: room['winner'] = 'draw'
                elif not st['alive1']: room['winner'] = 2
                else: room['winner'] = 1

            socketio.emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, room=room_id)

@app.route('/')
def index():
    server_ip = get_local_ip()
    template_path = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
    if os.path.exists(template_path):
        return render_template('index.html', server_ip=server_ip, server_port=8080)
    return "<h1>Local Game Server running. templates/index.html not found.</h1>"

@app.route('/api/info')
def server_info():
    return jsonify({
        'name': 'Termux Local Game Server',
        'ip': get_local_ip(),
        'port': 8080,
        'active_rooms': len(rooms),
        'supported_games': ['chess', 'ludo', 'tictactoe', 'dotsboxes', 'battleship', 'connectfour', 'pong', 'snake', 'racing', 'fighting']
    })

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

    # Start real-time background loop for Pong or Snake
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

# ----------------- Game Specific Socket Handlers -----------------

# 1. CHESS
@socketio.on('chess_move')
def on_chess_move(data):
    room_id = data.get('roomId')
    frm = data.get('from')
    to = data.get('to')
    promotion = data.get('promotion', 'q')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']

    from_r, from_c = frm['r'], frm['c']
    to_r, to_c = to['r'], to['c']
    piece = st['board'][from_r][from_c]
    target_piece = st['board'][to_r][to_c]

    if not piece: return

    # Capture piece
    if target_piece:
        cap_color = 'b' if target_piece['color'] == 'w' else 'w'
        st['capturedPieces'][cap_color].append(target_piece['type'])
        if target_piece['type'] == 'k':
            room['winner'] = 1 if piece['color'] == 'w' else 2
            room['status'] = 'finished'

    # Move piece
    st['board'][from_r][from_c] = None
    piece['hasMoved'] = True

    # Pawn promotion
    if piece['type'] == 'p' and (to_r == 0 or to_r == 7):
        piece['type'] = promotion

    st['board'][to_r][to_c] = piece
    st['lastMove'] = {'from': frm, 'to': to}
    st['currentTurn'] = 'b' if st['currentTurn'] == 'w' else 'w'

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

# 2. LUDO (MANCH)
@socketio.on('ludo_roll_dice')
def on_ludo_roll(data):
    room_id = data.get('roomId')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']

    dice = random.randint(1, 6)
    st['diceValue'] = dice
    st['hasRolled'] = True

    cur_p = str(st['currentTurn'])
    slot = st['players'][cur_p]

    # Calculate movable tokens
    movables = []
    for t in slot['tokens']:
        if t['step'] == -1:
            if dice == 6: movables.append(t['id'])
        elif t['step'] + dice <= 56:
            movables.append(t['id'])

    st['movableTokenIds'] = movables
    st['lastActionText'] = f"{slot['name']} عدد {dice} آورد."

    if len(movables) == 0:
        # Pass turn if no moves
        st['hasRolled'] = False
        st['diceValue'] = None
        st['currentTurn'] = (st['currentTurn'] % 4) + 1
        st['lastActionText'] += " حرکتی ممکن نبود. نوبت بعدی!"

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

@socketio.on('ludo_move_token')
def on_ludo_move(data):
    room_id = data.get('roomId')
    token_id = data.get('tokenId')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']

    cur_p = str(st['currentTurn'])
    slot = st['players'][cur_p]
    dice = st.get('diceValue', 1)

    for t in slot['tokens']:
        if t['id'] == token_id:
            if t['step'] == -1:
                t['step'] = 0
            else:
                t['step'] += dice
                if t['step'] == 56:
                    slot['finishedCount'] += 1
                    if slot['finishedCount'] >= 4:
                        room['winner'] = st['currentTurn']
                        room['status'] = 'finished'
            break

    # Check bonus turn on 6
    if dice == 6 and room['status'] != 'finished':
        st['hasRolled'] = False
        st['movableTokenIds'] = []
        st['lastActionText'] = f"{slot['name']} جایزه گرفت! دوباره تاس بیندازید."
    else:
        st['hasRolled'] = False
        st['diceValue'] = None
        st['movableTokenIds'] = []
        st['currentTurn'] = (st['currentTurn'] % 4) + 1
        st['lastActionText'] = f"نوبت بازیکن بعدی است."

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

# 3. TIC TAC TOE
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

# 4. DOTS & BOXES
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
                top = st['hLines'][br][bc] is not None
                bottom = st['hLines'][br+1][bc] is not None
                left = st['vLines'][br][bc] is not None
                right = st['vLines'][br][bc+1] is not None
                if top and bottom and left and right:
                    st['boxes'][br][bc] = player_num
                    st['scores'][str(player_num)] += 1
                    completed_box = True

    all_filled = all(st['boxes'][br][bc] is not None for br in range(num_boxes) for bc in range(num_boxes))
    if all_filled:
        room['status'] = 'finished'
        s1 = st['scores']['1']
        s2 = st['scores']['2']
        if s1 > s2: room['winner'] = 1
        elif s2 > s1: room['winner'] = 2
        else: room['winner'] = 'draw'
    elif not completed_box:
        st['currentTurn'] = 2 if player_num == 1 else 1

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

# 5. CONNECT FOUR
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

# 6. BATTLESHIP
@socketio.on('battleship_shoot')
def on_bs_shoot(data):
    room_id = data.get('roomId')
    r = data.get('r')
    c = data.get('c')
    player_num = data.get('playerNum')
    if room_id not in rooms: return
    room = rooms[room_id]
    st = room['gameState']
    if st['currentTurn'] != player_num: return

    target_grid = st['p2Grid'] if player_num == 1 else st['p1Grid']
    if target_grid[r][c] in ['hit', 'miss']: return

    is_hit = random.random() > 0.6
    target_grid[r][c] = 'hit' if is_hit else 'miss'

    hit_count = sum(row.count('hit') for row in target_grid)
    if hit_count >= 5:
        room['winner'] = player_num
        room['status'] = 'finished'
    else:
        st['currentTurn'] = 2 if player_num == 1 else 1

    emit('game_update', {'gameState': st, 'winner': room['winner'], 'status': room['status']}, to=room_id)

# 7. PONG PADDLE
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

# 8. SNAKE DIRECTION
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

# 9. RACING SYNC
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

# 10. FIGHTING ACTION
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
    print("🎮 LOCAL GAME SERVER (Termux / Android LAN - 10 Games)")
    print("   Includes: Chess (شطرنج) and Ludo (منچ) ✨")
    print("=" * 55)
    print("🚀 Server started successfully!")
    print(f"\n📱 Open on this phone: http://127.0.0.1:{port}")
    print(f"🌐 Open on another phone: http://{ip}:{port}")
    print("=" * 55 + "\n")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
