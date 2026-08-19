import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GameType, Room, BattleshipState, Ship, PongState, SnakeState, RacingState, FightingState } from './src/types';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const PORT = 3000;

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/server-info', (req, res) => {
  res.json({
    name: 'Local Game Server (Termux LAN)',
    activeRooms: Object.keys(rooms).length,
    connectedSockets: io.engine.clientsCount,
  });
});

// ----------------- Room & Game Engine -----------------
const rooms: { [roomId: string]: Room } = {};
const roomLoops: { [roomId: string]: NodeJS.Timeout } = {};

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function initGameState(gameType: GameType) {
  switch (gameType) {
    case 'tictactoe':
      return {
        board: Array(9).fill(null),
        currentTurn: 1,
        winningLine: null,
      };
    case 'dotsboxes':
      return {
        gridSize: 4, // 4x4 dots = 3x3 boxes
        hLines: Array(4).fill(null).map(() => Array(3).fill(false)),
        vLines: Array(3).fill(null).map(() => Array(4).fill(false)),
        boxes: Array(3).fill(null).map(() => Array(3).fill(null)),
        currentTurn: 1,
        scores: { 1: 0, 2: 0 },
      };
    case 'battleship':
      return {
        phase: 'placement',
        p1Ready: false,
        p2Ready: false,
        p1Ships: [],
        p2Ships: [],
        p1Grid: Array(10).fill(null).map(() => Array(10).fill('empty')),
        p2Grid: Array(10).fill(null).map(() => Array(10).fill('empty')),
        currentTurn: 1,
        lastShotResult: null,
      } as BattleshipState;
    case 'connectfour':
      return {
        grid: Array(6).fill(null).map(() => Array(7).fill(null)),
        currentTurn: 1,
        winningCoords: null,
        lastDrop: null,
      };
    case 'pong':
      return {
        ball: { x: 50, y: 50, vx: 0.8, vy: 0.5, radius: 2 },
        p1PaddleY: 50,
        p2PaddleY: 50,
        paddleHeight: 20,
        paddleWidth: 3,
        scores: { 1: 0, 2: 0 },
        targetScore: 10,
        isPaused: false,
      } as PongState;
    case 'snake':
      return {
        gridWidth: 24,
        gridHeight: 24,
        snake1: [{ x: 4, y: 12 }, { x: 3, y: 12 }, { x: 2, y: 12 }],
        snake2: [{ x: 19, y: 12 }, { x: 20, y: 12 }, { x: 21, y: 12 }],
        dir1: { x: 1, y: 0 },
        dir2: { x: -1, y: 0 },
        food: [{ x: 12, y: 6 }, { x: 12, y: 18 }],
        scores: { 1: 0, 2: 0 },
        alive1: true,
        alive2: true,
      } as SnakeState;
    case 'racing':
      return {
        p1Car: { x: 100, y: 350, angle: -Math.PI / 2, speed: 0, lap: 0, currentCheckpoint: 0, totalCheckpoints: 8 },
        p2Car: { x: 140, y: 350, angle: -Math.PI / 2, speed: 0, lap: 0, currentCheckpoint: 0, totalCheckpoints: 8 },
        targetLaps: 3,
      } as RacingState;
    case 'fighting':
      return {
        p1: {
          x: 150,
          y: 300,
          vx: 0,
          vy: 0,
          health: 100,
          isGrounded: true,
          isAttacking: false,
          attackCooldown: 0,
          isDefending: false,
          facing: 'right',
          roundsWon: 0,
          animState: 'idle',
        },
        p2: {
          x: 450,
          y: 300,
          vx: 0,
          vy: 0,
          health: 100,
          isGrounded: true,
          isAttacking: false,
          attackCooldown: 0,
          isDefending: false,
          facing: 'left',
          roundsWon: 0,
          animState: 'idle',
        },
        targetRounds: 2,
      } as FightingState;
    default:
      return {};
  }
}

// ----------------- Game Physics Loops -----------------
function startRealtimeGameLoop(roomId: string) {
  if (roomLoops[roomId]) {
    clearInterval(roomLoops[roomId]);
  }

  const room = rooms[roomId];
  if (!room) return;

  if (room.gameType === 'pong') {
    roomLoops[roomId] = setInterval(() => {
      const r = rooms[roomId];
      if (!r || r.status !== 'playing' || r.winner !== null) {
        clearInterval(roomLoops[roomId]);
        return;
      }
      const st = r.gameState as PongState;
      if (st.isPaused) return;

      st.ball.x += st.ball.vx;
      st.ball.y += st.ball.vy;

      // Bounce top & bottom
      if (st.ball.y <= st.ball.radius) {
        st.ball.y = st.ball.radius;
        st.ball.vy = -st.ball.vy;
      } else if (st.ball.y >= 100 - st.ball.radius) {
        st.ball.y = 100 - st.ball.radius;
        st.ball.vy = -st.ball.vy;
      }

      // Check paddle 1 (Left: x=4)
      if (st.ball.x <= 4 + st.paddleWidth && st.ball.x >= 2) {
        const top = st.p1PaddleY - st.paddleHeight / 2;
        const bottom = st.p1PaddleY + st.paddleHeight / 2;
        if (st.ball.y >= top && st.ball.y <= bottom) {
          const hitOffset = (st.ball.y - st.p1PaddleY) / (st.paddleHeight / 2);
          st.ball.vx = Math.min(Math.abs(st.ball.vx) * 1.05, 2.0);
          st.ball.vy = hitOffset * 1.2;
          st.ball.x = 4 + st.paddleWidth + 0.1;
        }
      }

      // Check paddle 2 (Right: x=96)
      if (st.ball.x >= 96 - st.paddleWidth && st.ball.x <= 98) {
        const top = st.p2PaddleY - st.paddleHeight / 2;
        const bottom = st.p2PaddleY + st.paddleHeight / 2;
        if (st.ball.y >= top && st.ball.y <= bottom) {
          const hitOffset = (st.ball.y - st.p2PaddleY) / (st.paddleHeight / 2);
          st.ball.vx = -Math.min(Math.abs(st.ball.vx) * 1.05, 2.0);
          st.ball.vy = hitOffset * 1.2;
          st.ball.x = 96 - st.paddleWidth - 0.1;
        }
      }

      // Score check
      if (st.ball.x < 0) {
        st.scores[2] += 1;
        if (st.scores[2] >= st.targetScore) {
          r.winner = 2;
          r.status = 'finished';
        } else {
          st.ball = { x: 50, y: 50, vx: 0.8, vy: (Math.random() - 0.5) * 0.8, radius: 2 };
        }
      } else if (st.ball.x > 100) {
        st.scores[1] += 1;
        if (st.scores[1] >= st.targetScore) {
          r.winner = 1;
          r.status = 'finished';
        } else {
          st.ball = { x: 50, y: 50, vx: -0.8, vy: (Math.random() - 0.5) * 0.8, radius: 2 };
        }
      }

      io.to(roomId).emit('game_update', {
        gameState: r.gameState,
        winner: r.winner,
        status: r.status,
      });
    }, 1000 / 40); // 40 FPS
  } else if (room.gameType === 'snake') {
    roomLoops[roomId] = setInterval(() => {
      const r = rooms[roomId];
      if (!r || r.status !== 'playing' || r.winner !== null) {
        clearInterval(roomLoops[roomId]);
        return;
      }
      const st = r.gameState as SnakeState;

      // Move Snake 1
      if (st.alive1) {
        const head1 = {
          x: st.snake1[0].x + st.dir1.x,
          y: st.snake1[0].y + st.dir1.y,
        };
        // Wall wrap or collision
        if (head1.x < 0 || head1.x >= st.gridWidth || head1.y < 0 || head1.y >= st.gridHeight) {
          st.alive1 = false;
        } else {
          // Check self collision
          if (st.snake1.some((segment) => segment.x === head1.x && segment.y === head1.y)) {
            st.alive1 = false;
          }
          // Check other snake collision
          if (st.snake2.some((segment) => segment.x === head1.x && segment.y === head1.y)) {
            st.alive1 = false;
          }
        }

        if (st.alive1) {
          st.snake1.unshift(head1);
          // Check food
          const foodIdx = st.food.findIndex((f) => f.x === head1.x && f.y === head1.y);
          if (foodIdx >= 0) {
            st.scores[1] += 10;
            st.food.splice(foodIdx, 1);
            // Spawn new food
            st.food.push({
              x: Math.floor(Math.random() * st.gridWidth),
              y: Math.floor(Math.random() * st.gridHeight),
            });
          } else {
            st.snake1.pop();
          }
        }
      }

      // Move Snake 2
      if (st.alive2) {
        const head2 = {
          x: st.snake2[0].x + st.dir2.x,
          y: st.snake2[0].y + st.dir2.y,
        };
        if (head2.x < 0 || head2.x >= st.gridWidth || head2.y < 0 || head2.y >= st.gridHeight) {
          st.alive2 = false;
        } else {
          if (st.snake2.some((segment) => segment.x === head2.x && segment.y === head2.y)) {
            st.alive2 = false;
          }
          if (st.snake1.some((segment) => segment.x === head2.x && segment.y === head2.y)) {
            st.alive2 = false;
          }
        }

        if (st.alive2) {
          st.snake2.unshift(head2);
          const foodIdx = st.food.findIndex((f) => f.x === head2.x && f.y === head2.y);
          if (foodIdx >= 0) {
            st.scores[2] += 10;
            st.food.splice(foodIdx, 1);
            st.food.push({
              x: Math.floor(Math.random() * st.gridWidth),
              y: Math.floor(Math.random() * st.gridHeight),
            });
          } else {
            st.snake2.pop();
          }
        }
      }

      // Determine winner if dead
      if (!st.alive1 && !st.alive2) {
        r.winner = 'draw';
        r.status = 'finished';
      } else if (!st.alive1) {
        r.winner = 2;
        r.status = 'finished';
      } else if (!st.alive2) {
        r.winner = 1;
        r.status = 'finished';
      }

      io.to(roomId).emit('game_update', {
        gameState: r.gameState,
        winner: r.winner,
        status: r.status,
      });
    }, 120); // ~8.3 steps/sec
  } else if (room.gameType === 'fighting') {
    roomLoops[roomId] = setInterval(() => {
      const r = rooms[roomId];
      if (!r || r.status !== 'playing' || r.winner !== null) {
        clearInterval(roomLoops[roomId]);
        return;
      }
      const st = r.gameState as FightingState;

      // Update cooldowns & animations
      if (st.p1.attackCooldown > 0) st.p1.attackCooldown -= 1;
      if (st.p2.attackCooldown > 0) st.p2.attackCooldown -= 1;

      // Physics P1
      st.p1.x += st.p1.vx;
      st.p1.y += st.p1.vy;
      st.p1.vx *= 0.85; // friction
      if (!st.p1.isGrounded) {
        st.p1.vy += 0.8; // gravity
      }
      if (st.p1.y >= 300) {
        st.p1.y = 300;
        st.p1.vy = 0;
        st.p1.isGrounded = true;
      }
      if (st.p1.x < 30) st.p1.x = 30;
      if (st.p1.x > 570) st.p1.x = 570;

      // Physics P2
      st.p2.x += st.p2.vx;
      st.p2.y += st.p2.vy;
      st.p2.vx *= 0.85;
      if (!st.p2.isGrounded) {
        st.p2.vy += 0.8;
      }
      if (st.p2.y >= 300) {
        st.p2.y = 300;
        st.p2.vy = 0;
        st.p2.isGrounded = true;
      }
      if (st.p2.x < 30) st.p2.x = 30;
      if (st.p2.x > 570) st.p2.x = 570;

      // Auto face each other
      if (st.p1.x < st.p2.x) {
        st.p1.facing = 'right';
        st.p2.facing = 'left';
      } else {
        st.p1.facing = 'left';
        st.p2.facing = 'right';
      }

      // Check KO
      if (st.p1.health <= 0 || st.p2.health <= 0) {
        if (st.p1.health <= 0 && st.p2.health <= 0) {
          r.winner = 'draw';
          r.status = 'finished';
        } else if (st.p1.health <= 0) {
          st.p2.roundsWon += 1;
          if (st.p2.roundsWon >= st.targetRounds) {
            r.winner = 2;
            r.status = 'finished';
          } else {
            // Reset round
            st.p1.health = 100;
            st.p2.health = 100;
            st.p1.x = 150;
            st.p2.x = 450;
          }
        } else if (st.p2.health <= 0) {
          st.p1.roundsWon += 1;
          if (st.p1.roundsWon >= st.targetRounds) {
            r.winner = 1;
            r.status = 'finished';
          } else {
            // Reset round
            st.p1.health = 100;
            st.p2.health = 100;
            st.p1.x = 150;
            st.p2.x = 450;
          }
        }
      }

      io.to(roomId).emit('game_update', {
        gameState: r.gameState,
        winner: r.winner,
        status: r.status,
      });
    }, 1000 / 30);
  }
}

// ----------------- Socket Event Handlers -----------------
io.on('connection', (socket: Socket) => {
  // Ping
  socket.on('ping_check', (clientTimestamp: number) => {
    socket.emit('pong_reply', clientTimestamp);
  });

  // Create room
  socket.on('create_room', (data: { gameType: GameType; playerName: string }) => {
    const roomId = generateRoomId();
    const playerNum = 1;
    const room: Room = {
      id: roomId,
      gameType: data.gameType,
      players: [
        {
          id: socket.id,
          socketId: socket.id,
          name: data.playerName || 'Player 1',
          playerNum: 1,
          connected: true,
          score: 0,
        },
      ],
      status: 'waiting',
      winner: null,
      rematchRequested: {},
      gameState: initGameState(data.gameType),
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    rooms[roomId] = room;
    socket.join(roomId);
    (socket as any).roomId = roomId;
    (socket as any).playerNum = playerNum;

    socket.emit('room_created', {
      room,
      playerNum,
    });
  });

  // Join room
  socket.on('join_room', (data: { roomId: string; playerName: string }) => {
    const roomId = data.roomId.trim().toUpperCase();
    const room = rooms[roomId];

    if (!room) {
      socket.emit('error_message', 'اتاق مورد نظر یافت نشد (Room not found)');
      return;
    }

    if (room.players.length >= 2) {
      // Check if reconnecting
      const existing = room.players.find((p) => p.name === data.playerName && !p.connected);
      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        socket.join(roomId);
        (socket as any).roomId = roomId;
        (socket as any).playerNum = existing.playerNum;
        socket.emit('room_joined', { room, playerNum: existing.playerNum });
        io.to(roomId).emit('player_reconnected', { playerNum: existing.playerNum });
        return;
      }
      socket.emit('error_message', 'اتاق پر است (حداکثر ۲ بازیکن)');
      return;
    }

    const playerNum = 2;
    room.players.push({
      id: socket.id,
      socketId: socket.id,
      name: data.playerName || 'Player 2',
      playerNum: 2,
      connected: true,
      score: 0,
    });
    room.status = 'playing';
    room.lastActive = Date.now();

    socket.join(roomId);
    (socket as any).roomId = roomId;
    (socket as any).playerNum = playerNum;

    socket.emit('room_joined', {
      room,
      playerNum,
    });

    io.to(roomId).emit('game_started', {
      room,
    });

    startRealtimeGameLoop(roomId);
  });

  // Emotes
  socket.on('send_emote', (data: { emoji: string }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    if (!roomId || !playerNum) return;
    io.to(roomId).emit('receive_emote', {
      playerNum,
      emoji: data.emoji,
      id: Math.random().toString(36).substring(7),
    });
  });

  // Rematch
  socket.on('request_rematch', () => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room) return;

    room.rematchRequested[playerNum] = true;
    io.to(roomId).emit('rematch_update', room.rematchRequested);

    if (room.rematchRequested[1] && room.rematchRequested[2]) {
      // Reset game
      room.gameState = initGameState(room.gameType);
      room.winner = null;
      room.status = 'playing';
      room.rematchRequested = {};
      io.to(roomId).emit('game_reset', {
        room,
      });
      startRealtimeGameLoop(roomId);
    }
  });

  // 1. Tic Tac Toe Move
  socket.on('ttt_move', (data: { index: number }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || room.winner !== null) return;

    const st = room.gameState;
    if (st.currentTurn !== playerNum) return;
    if (st.board[data.index] !== null) return;

    st.board[data.index] = playerNum;

    // Check Win
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    let hasWon = false;
    for (const [a, b, c] of lines) {
      if (st.board[a] && st.board[a] === st.board[b] && st.board[a] === st.board[c]) {
        st.winningLine = [a, b, c];
        room.winner = playerNum;
        room.status = 'finished';
        hasWon = true;
        break;
      }
    }

    if (!hasWon) {
      if (st.board.every((cell: any) => cell !== null)) {
        room.winner = 'draw';
        room.status = 'finished';
      } else {
        st.currentTurn = playerNum === 1 ? 2 : 1;
      }
    }

    io.to(roomId).emit('game_update', {
      gameState: room.gameState,
      winner: room.winner,
      status: room.status,
    });
  });

  // 2. Dots and Boxes
  socket.on('dots_move', (data: { type: 'h' | 'v'; r: number; c: number }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || room.winner !== null) return;

    const st = room.gameState;
    if (st.currentTurn !== playerNum) return;

    if (data.type === 'h') {
      if (st.hLines[data.r][data.c]) return;
      st.hLines[data.r][data.c] = true;
    } else {
      if (st.vLines[data.r][data.c]) return;
      st.vLines[data.r][data.c] = true;
    }

    // Check newly completed boxes
    let completedAny = false;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (st.boxes[r][c] === null) {
          const top = st.hLines[r][c];
          const bottom = st.hLines[r + 1][c];
          const left = st.vLines[r][c];
          const right = st.vLines[r][c + 1];
          if (top && bottom && left && right) {
            st.boxes[r][c] = playerNum;
            st.scores[playerNum] += 1;
            completedAny = true;
          }
        }
      }
    }

    // If completed box, player gets another turn! Otherwise switch
    if (!completedAny) {
      st.currentTurn = playerNum === 1 ? 2 : 1;
    }

    // Check game over (9 total boxes)
    const totalClaimed = st.scores[1] + st.scores[2];
    if (totalClaimed >= 9) {
      room.status = 'finished';
      if (st.scores[1] > st.scores[2]) room.winner = 1;
      else if (st.scores[2] > st.scores[1]) room.winner = 2;
      else room.winner = 'draw';
    }

    io.to(roomId).emit('game_update', {
      gameState: room.gameState,
      winner: room.winner,
      status: room.status,
    });
  });

  // 3. Battleship Set Ships & Attack
  socket.on('battleship_ready', (data: { ships: Ship[] }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;

    const st = room.gameState as BattleshipState;
    if (playerNum === 1) {
      st.p1Ships = data.ships;
      st.p1Ready = true;
      // Mark grid
      data.ships.forEach((s) => {
        s.coords.forEach((coord) => {
          st.p1Grid[coord.r][coord.c] = 'ship';
        });
      });
    } else {
      st.p2Ships = data.ships;
      st.p2Ready = true;
      data.ships.forEach((s) => {
        s.coords.forEach((coord) => {
          st.p2Grid[coord.r][coord.c] = 'ship';
        });
      });
    }

    if (st.p1Ready && st.p2Ready) {
      st.phase = 'battle';
    }

    io.to(roomId).emit('game_update', {
      gameState: room.gameState,
      winner: room.winner,
      status: room.status,
    });
  });

  socket.on('battleship_shoot', (data: { r: number; c: number }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || room.winner !== null) return;

    const st = room.gameState as BattleshipState;
    if (st.phase !== 'battle' || st.currentTurn !== playerNum) return;

    const targetGrid = playerNum === 1 ? st.p2Grid : st.p1Grid;
    const targetShips = playerNum === 1 ? st.p2Ships : st.p1Ships;
    const cell = targetGrid[data.r][data.c];

    if (cell === 'hit' || cell === 'miss') return; // already shot

    if (cell === 'ship') {
      targetGrid[data.r][data.c] = 'hit';
      // Find ship
      let sunkShipName: string | undefined;
      for (const ship of targetShips) {
        const isPart = ship.coords.some((c) => c.r === data.r && c.c === data.c);
        if (isPart) {
          const allHit = ship.coords.every((c) => targetGrid[c.r][c.c] === 'hit');
          if (allHit && !ship.sunk) {
            ship.sunk = true;
            sunkShipName = ship.name;
          }
        }
      }

      st.lastShotResult = {
        player: playerNum,
        r: data.r,
        c: data.c,
        result: sunkShipName ? 'sunk' : 'hit',
        shipName: sunkShipName,
      };

      // Check all ships sunk (total 17 segments: 5+4+3+3+2)
      const allSunk = targetShips.every((s) => s.sunk);
      if (allSunk) {
        room.winner = playerNum;
        room.status = 'finished';
      }
    } else {
      targetGrid[data.r][data.c] = 'miss';
      st.lastShotResult = {
        player: playerNum,
        r: data.r,
        c: data.c,
        result: 'miss',
      };
      // Miss switches turn
      st.currentTurn = playerNum === 1 ? 2 : 1;
    }

    io.to(roomId).emit('game_update', {
      gameState: room.gameState,
      winner: room.winner,
      status: room.status,
    });
  });

  // 4. Connect Four Drop
  socket.on('connectfour_drop', (data: { col: number }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || room.winner !== null) return;

    const st = room.gameState;
    if (st.currentTurn !== playerNum) return;
    if (data.col < 0 || data.col >= 7) return;

    // Find lowest available row in column
    let targetRow = -1;
    for (let r = 5; r >= 0; r--) {
      if (st.grid[r][data.col] === null) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) return; // column full

    st.grid[targetRow][data.col] = playerNum;
    st.lastDrop = { r: targetRow, c: data.col };

    // Check 4 in a row
    const directions = [
      [0, 1], // horizontal
      [1, 0], // vertical
      [1, 1], // diagonal down-right
      [1, -1], // diagonal down-left
    ];

    let won = false;
    for (const [dr, dc] of directions) {
      const coords: [number, number][] = [[targetRow, data.col]];

      // Positive direction
      for (let i = 1; i < 4; i++) {
        const nr = targetRow + dr * i;
        const nc = data.col + dc * i;
        if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && st.grid[nr][nc] === playerNum) {
          coords.push([nr, nc]);
        } else break;
      }

      // Negative direction
      for (let i = 1; i < 4; i++) {
        const nr = targetRow - dr * i;
        const nc = data.col - dc * i;
        if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && st.grid[nr][nc] === playerNum) {
          coords.push([nr, nc]);
        } else break;
      }

      if (coords.length >= 4) {
        st.winningCoords = coords.slice(0, 4);
        room.winner = playerNum;
        room.status = 'finished';
        won = true;
        break;
      }
    }

    if (!won) {
      // Check full board draw
      const isFull = st.grid[0].every((cell: any) => cell !== null);
      if (isFull) {
        room.winner = 'draw';
        room.status = 'finished';
      } else {
        st.currentTurn = playerNum === 1 ? 2 : 1;
      }
    }

    io.to(roomId).emit('game_update', {
      gameState: room.gameState,
      winner: room.winner,
      status: room.status,
    });
  });

  // 5. Pong Paddle Move
  socket.on('pong_paddle', (data: { y: number }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    const st = room.gameState as PongState;

    const clampedY = Math.max(10, Math.min(90, data.y));
    if (playerNum === 1) {
      st.p1PaddleY = clampedY;
    } else {
      st.p2PaddleY = clampedY;
    }
  });

  // 6. Snake Direction
  socket.on('snake_dir', (data: { dir: { x: number; y: number } }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    const st = room.gameState as SnakeState;

    // Prevent immediate 180 reverse
    if (playerNum === 1) {
      if (st.dir1.x + data.dir.x !== 0 || st.dir1.y + data.dir.y !== 0) {
        st.dir1 = data.dir;
      }
    } else {
      if (st.dir2.x + data.dir.x !== 0 || st.dir2.y + data.dir.y !== 0) {
        st.dir2 = data.dir;
      }
    }
  });

  // 7. Racing Car Position Sync
  socket.on('racing_sync', (data: { car: any }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    const st = room.gameState as RacingState;

    if (playerNum === 1) {
      st.p1Car = data.car;
      if (data.car.lap >= st.targetLaps && room.winner === null) {
        room.winner = 1;
        room.status = 'finished';
      }
    } else {
      st.p2Car = data.car;
      if (data.car.lap >= st.targetLaps && room.winner === null) {
        room.winner = 2;
        room.status = 'finished';
      }
    }

    io.to(roomId).emit('racing_update', {
      gameState: st,
      winner: room.winner,
      status: room.status,
    });
  });

  // 8. Fighting Action
  socket.on('fighting_action', (data: { action: 'move' | 'jump' | 'attack' | 'defend_start' | 'defend_end'; dir?: number }) => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    const st = room.gameState as FightingState;

    const me = playerNum === 1 ? st.p1 : st.p2;
    const opponent = playerNum === 1 ? st.p2 : st.p1;

    if (data.action === 'move' && data.dir !== undefined) {
      me.vx = data.dir * 6;
      me.animState = 'run';
    } else if (data.action === 'jump') {
      if (me.isGrounded) {
        me.vy = -14;
        me.isGrounded = false;
        me.animState = 'jump';
      }
    } else if (data.action === 'defend_start') {
      me.isDefending = true;
      me.animState = 'defend';
    } else if (data.action === 'defend_end') {
      me.isDefending = false;
      me.animState = 'idle';
    } else if (data.action === 'attack') {
      if (me.attackCooldown <= 0) {
        me.attackCooldown = 12; // cooldown frames
        me.isAttacking = true;
        me.animState = 'attack';

        // Check if opponent is in range (80px)
        const dist = Math.abs(me.x - opponent.x);
        const inFront = (me.facing === 'right' && opponent.x > me.x) || (me.facing === 'left' && opponent.x < me.x);

        if (dist < 85 && inFront && Math.abs(me.y - opponent.y) < 50) {
          const dmg = opponent.isDefending ? 3 : 15;
          opponent.health = Math.max(0, opponent.health - dmg);
          opponent.vx = me.facing === 'right' ? 8 : -8; // knockback
          opponent.animState = 'hit';
        }
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomId = (socket as any).roomId;
    const playerNum = (socket as any).playerNum;
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      const player = room.players.find((p) => p.playerNum === playerNum);
      if (player) {
        player.connected = false;
      }
      io.to(roomId).emit('player_disconnected', { playerNum });

      // Clean up after 15 minutes of inactivity if all players left
      const allLeft = room.players.every((p) => !p.connected);
      if (allLeft) {
        setTimeout(() => {
          if (rooms[roomId] && rooms[roomId].players.every((p) => !p.connected)) {
            if (roomLoops[roomId]) clearInterval(roomLoops[roomId]);
            delete rooms[roomId];
            delete roomLoops[roomId];
          }
        }, 15 * 60 * 1000);
      }
    }
  });
});

// ----------------- Vite Integration -----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🎮 LOCAL GAME SERVER (Termux / LAN / Web)`);
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`===============================================`);
  });
}

startServer();
