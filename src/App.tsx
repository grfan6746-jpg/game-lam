import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { RoomLobby } from './components/RoomLobby';
import { TermuxGuideModal } from './components/TermuxGuideModal';
import { GameWrapper } from './components/GameWrapper';
import { GAMES } from './data/games';
import { GameType, Room, EmoteMessage, Ship, CarState } from './types';
import { sounds } from './utils/audio';

// Import 8 games
import { TicTacToe } from './components/games/TicTacToe';
import { DotsAndBoxes } from './components/games/DotsAndBoxes';
import { Battleship } from './components/games/Battleship';
import { ConnectFour } from './components/games/ConnectFour';
import { Pong } from './components/games/Pong';
import { Snake } from './components/games/Snake';
import { Racing } from './components/games/Racing';
import { Fighting } from './components/games/Fighting';

export function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [ping, setPing] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTermuxModalOpen, setIsTermuxModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('localgame_name') || 'بازیکن');

  // Room state
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [playerNum, setPlayerNum] = useState<1 | 2>(1);
  const [view, setView] = useState<'lobby' | 'room_lobby' | 'game'>('lobby');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<EmoteMessage[]>([]);
  const [isPassAndPlay, setIsPassAndPlay] = useState(false);

  // Save nickname
  useEffect(() => {
    localStorage.setItem('localgame_name', playerName);
  }, [playerName]);

  // Socket.IO Initialization
  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      console.log('Connected to game server socket');
    });

    // Ping check
    const pingInterval = setInterval(() => {
      if (s.connected) {
        const start = Date.now();
        s.emit('ping_check', start);
      }
    }, 4000);

    s.on('pong_reply', (start: number) => {
      setPing(Date.now() - start);
    });

    // Room created
    s.on('room_created', (data: { room: Room; playerNum: 1 | 2 }) => {
      setCurrentRoom(data.room);
      setPlayerNum(data.playerNum);
      setView('room_lobby');
      setIsPassAndPlay(false);
      setErrorMessage(null);
    });

    // Room joined
    s.on('room_joined', (data: { room: Room; playerNum: 1 | 2 }) => {
      setCurrentRoom(data.room);
      setPlayerNum(data.playerNum);
      setView(data.room.status === 'playing' ? 'game' : 'room_lobby');
      setIsPassAndPlay(false);
      setErrorMessage(null);
    });

    // Game Started (both players ready)
    s.on('game_started', (data: { room: Room }) => {
      setCurrentRoom(data.room);
      setView('game');
      sounds.playCapture();
    });

    // Game State Update
    s.on('game_update', (data: { gameState: any; winner: any; status: any }) => {
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          gameState: data.gameState,
          winner: data.winner,
          status: data.status,
        };
      });
    });

    // Racing sync
    s.on('racing_update', (data: { gameState: any; winner: any; status: any }) => {
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          gameState: data.gameState,
          winner: data.winner,
          status: data.status,
        };
      });
    });

    // Rematch update
    s.on('rematch_update', (rematches: { [key: number]: boolean }) => {
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return { ...prev, rematchRequested: rematches };
      });
    });

    // Game Reset for Rematch
    s.on('game_reset', (data: { room: Room }) => {
      setCurrentRoom(data.room);
      sounds.playMove();
    });

    // Emote received
    s.on('receive_emote', (emote: EmoteMessage) => {
      sounds.playClick();
      setActiveEmotes((prev) => [...prev, emote]);
      setTimeout(() => {
        setActiveEmotes((prev) => prev.filter((e) => e.id !== emote.id));
      }, 2500);
    });

    // Disconnects
    s.on('player_disconnected', () => {
      setOpponentDisconnected(true);
    });

    s.on('player_reconnected', () => {
      setOpponentDisconnected(false);
    });

    s.on('error_message', (msg: string) => {
      setErrorMessage(msg);
      sounds.playMiss();
    });

    setSocket(s);

    // Check URL parameters for ?room=CODE
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      s.emit('join_room', { roomId: roomParam, playerName: playerName || 'Player 2' });
    }

    return () => {
      clearInterval(pingInterval);
      s.disconnect();
    };
  }, []);

  // ----------------- Room Actions -----------------
  const handleCreateRoom = (gameType: GameType, name: string) => {
    if (!socket || !socket.connected) {
      // If offline/local fallback, start pass and play
      handleStartPassAndPlay(gameType);
      return;
    }
    socket.emit('create_room', { gameType, playerName: name });
  };

  const handleJoinRoom = (roomId: string, name: string) => {
    if (!socket || !socket.connected) {
      setErrorMessage('سرور هنوز در دسترس نیست');
      return;
    }
    socket.emit('join_room', { roomId, playerName: name });
  };

  const handleLeaveRoom = () => {
    sounds.playClick();
    if (socket && currentRoom) {
      socket.emit('leave_room');
    }
    setCurrentRoom(null);
    setView('lobby');
    setIsPassAndPlay(false);
    setOpponentDisconnected(false);
  };

  const handleRequestRematch = () => {
    if (isPassAndPlay && currentRoom) {
      // Local reset
      const gameType = currentRoom.gameType;
      // Re-init game
      handleStartPassAndPlay(gameType);
      return;
    }
    if (socket) {
      socket.emit('request_rematch');
    }
  };

  const handleSendEmote = (emoji: string) => {
    if (socket) {
      socket.emit('send_emote', { emoji });
    }
  };

  // ----------------- Pass & Play (Local 2P on 1 phone) -----------------
  const handleStartPassAndPlay = (gameType: GameType) => {
    setIsPassAndPlay(true);
    setPlayerNum(1);
    const localRoom: Room = {
      id: 'LOCAL-PASS-PLAY',
      gameType,
      players: [
        { id: 'p1', socketId: 'p1', name: playerName || 'بازیکن ۱', playerNum: 1, connected: true, score: 0 },
        { id: 'p2', socketId: 'p2', name: 'بازیکن ۲', playerNum: 2, connected: true, score: 0 },
      ],
      status: 'playing',
      winner: null,
      rematchRequested: {},
      gameState: (() => {
        switch (gameType) {
          case 'tictactoe':
            return { board: Array(9).fill(null), currentTurn: 1, winningLine: null };
          case 'dotsboxes':
            return {
              gridSize: 4,
              hLines: Array(4).fill(null).map(() => Array(3).fill(false)),
              vLines: Array(3).fill(null).map(() => Array(4).fill(false)),
              boxes: Array(3).fill(null).map(() => Array(3).fill(null)),
              currentTurn: 1,
              scores: { 1: 0, 2: 0 },
            };
          case 'battleship':
            return {
              phase: 'battle',
              p1Ready: true,
              p2Ready: true,
              p1Ships: [],
              p2Ships: [],
              p1Grid: Array(10).fill(null).map(() => Array(10).fill('empty')),
              p2Grid: Array(10).fill(null).map(() => Array(10).fill('empty')),
              currentTurn: 1,
              lastShotResult: null,
            };
          case 'connectfour':
            return { grid: Array(6).fill(null).map(() => Array(7).fill(null)), currentTurn: 1, winningCoords: null, lastDrop: null };
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
            };
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
            };
          case 'racing':
            return {
              p1Car: { x: 100, y: 350, angle: -Math.PI / 2, speed: 0, lap: 0, currentCheckpoint: 0, totalCheckpoints: 8 },
              p2Car: { x: 140, y: 350, angle: -Math.PI / 2, speed: 0, lap: 0, currentCheckpoint: 0, totalCheckpoints: 8 },
              targetLaps: 3,
            };
          case 'fighting':
            return {
              p1: { x: 150, y: 300, vx: 0, vy: 0, health: 100, isGrounded: true, isAttacking: false, attackCooldown: 0, isDefending: false, facing: 'right', roundsWon: 0, animState: 'idle' },
              p2: { x: 450, y: 300, vx: 0, vy: 0, health: 100, isGrounded: true, isAttacking: false, attackCooldown: 0, isDefending: false, facing: 'left', roundsWon: 0, animState: 'idle' },
              targetRounds: 2,
            };
        }
      })(),
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    setCurrentRoom(localRoom);
    setView('game');
  };

  // ----------------- Game Specific Moves (Socket or Local) -----------------
  // 1. Tic Tac Toe
  const handleTTTMove = (index: number) => {
    if (!isPassAndPlay && socket) {
      socket.emit('ttt_move', { index });
    } else if (currentRoom) {
      // Local state update
      const st = { ...currentRoom.gameState };
      const turn = st.currentTurn;
      if (st.board[index] !== null) return;
      st.board[index] = turn;

      const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
      ];
      let won = false;
      for (const [a, b, c] of lines) {
        if (st.board[a] && st.board[a] === st.board[b] && st.board[a] === st.board[c]) {
          st.winningLine = [a, b, c];
          setCurrentRoom({ ...currentRoom, gameState: st, winner: turn, status: 'finished' });
          won = true;
          break;
        }
      }
      if (!won) {
        if (st.board.every((c: any) => c !== null)) {
          setCurrentRoom({ ...currentRoom, gameState: st, winner: 'draw', status: 'finished' });
        } else {
          st.currentTurn = turn === 1 ? 2 : 1;
          setCurrentRoom({ ...currentRoom, gameState: st });
        }
      }
    }
  };

  // 2. Dots and Boxes
  const handleDotsMove = (type: 'h' | 'v', r: number, c: number) => {
    if (!isPassAndPlay && socket) {
      socket.emit('dots_move', { type, r, c });
    } else if (currentRoom) {
      const st = { ...currentRoom.gameState };
      const turn = st.currentTurn;
      if (type === 'h') st.hLines[r][c] = true;
      else st.vLines[r][c] = true;

      let completedAny = false;
      for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
          if (st.boxes[br][bc] === null) {
            if (st.hLines[br][bc] && st.hLines[br + 1][bc] && st.vLines[br][bc] && st.vLines[br][bc + 1]) {
              st.boxes[br][bc] = turn;
              st.scores[turn] += 1;
              completedAny = true;
            }
          }
        }
      }

      if (!completedAny) {
        st.currentTurn = turn === 1 ? 2 : 1;
      }

      let winner = currentRoom.winner;
      let status = currentRoom.status;
      if (st.scores[1] + st.scores[2] >= 9) {
        status = 'finished';
        winner = st.scores[1] > st.scores[2] ? 1 : st.scores[2] > st.scores[1] ? 2 : 'draw';
      }

      setCurrentRoom({ ...currentRoom, gameState: st, winner, status });
    }
  };

  // 3. Battleship
  const handleBattleshipReady = (ships: Ship[]) => {
    if (!isPassAndPlay && socket) {
      socket.emit('battleship_ready', { ships });
    } else if (currentRoom) {
      const st = { ...currentRoom.gameState };
      st.p1Ships = ships;
      st.phase = 'battle';
      setCurrentRoom({ ...currentRoom, gameState: st });
    }
  };

  const handleBattleshipShoot = (r: number, c: number) => {
    if (!isPassAndPlay && socket) {
      socket.emit('battleship_shoot', { r, c });
    } else if (currentRoom) {
      sounds.playHit();
      const st = { ...currentRoom.gameState };
      st.p2Grid[r][c] = Math.random() > 0.5 ? 'hit' : 'miss';
      setCurrentRoom({ ...currentRoom, gameState: st });
    }
  };

  // 4. Connect Four
  const handleConnectFourDrop = (col: number) => {
    if (!isPassAndPlay && socket) {
      socket.emit('connectfour_drop', { col });
    } else if (currentRoom) {
      const st = { ...currentRoom.gameState };
      const turn = st.currentTurn;
      let targetRow = -1;
      for (let r = 5; r >= 0; r--) {
        if (st.grid[r][col] === null) {
          targetRow = r;
          break;
        }
      }
      if (targetRow === -1) return;
      st.grid[targetRow][col] = turn;
      st.currentTurn = turn === 1 ? 2 : 1;
      setCurrentRoom({ ...currentRoom, gameState: st });
    }
  };

  // 5. Pong
  const handlePongPaddleMove = (y: number) => {
    if (!isPassAndPlay && socket) {
      socket.emit('pong_paddle', { y });
    } else if (currentRoom) {
      const st = { ...currentRoom.gameState };
      st.p1PaddleY = y;
      setCurrentRoom({ ...currentRoom, gameState: st });
    }
  };

  // 6. Snake
  const handleSnakeDir = (dir: { x: number; y: number }) => {
    if (!isPassAndPlay && socket) {
      socket.emit('snake_dir', { dir });
    } else if (currentRoom) {
      const st = { ...currentRoom.gameState };
      st.dir1 = dir;
      setCurrentRoom({ ...currentRoom, gameState: st });
    }
  };

  // 7. Racing
  const handleRacingSync = (car: CarState) => {
    if (!isPassAndPlay && socket) {
      socket.emit('racing_sync', { car });
    }
  };

  // 8. Fighting
  const handleFightingAction = (action: any, dir?: number) => {
    if (!isPassAndPlay && socket) {
      socket.emit('fighting_action', { action, dir });
    }
  };

  const selectedGameInfo = currentRoom
    ? GAMES.find((g) => g.id === currentRoom.gameType) || GAMES[0]
    : GAMES[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950" dir="rtl">
      {/* Top Navbar */}
      <Navbar
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenTermuxGuide={() => setIsTermuxModalOpen(true)}
        ping={ping}
        activeRoomId={currentRoom?.id}
        onLeaveRoom={currentRoom ? handleLeaveRoom : undefined}
        playerName={playerName}
        setPlayerName={setPlayerName}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-10">
        {view === 'lobby' && (
          <Lobby
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartPassAndPlay={handleStartPassAndPlay}
            onOpenTermuxGuide={() => setIsTermuxModalOpen(true)}
            playerName={playerName}
            setPlayerName={setPlayerName}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
          />
        )}

        {view === 'room_lobby' && currentRoom && (
          <RoomLobby
            room={currentRoom}
            playerNum={playerNum}
            gameInfo={selectedGameInfo}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {view === 'game' && currentRoom && (
          <GameWrapper
            room={currentRoom}
            playerNum={playerNum}
            gameInfo={selectedGameInfo}
            currentTurn={currentRoom.gameState?.currentTurn}
            onLeaveRoom={handleLeaveRoom}
            onRequestRematch={handleRequestRematch}
            onSendEmote={handleSendEmote}
            activeEmotes={activeEmotes}
            opponentDisconnected={opponentDisconnected}
            isPassAndPlay={isPassAndPlay}
          >
            {/* Render selected active game */}
            {currentRoom.gameType === 'tictactoe' && (
              <TicTacToe
                state={currentRoom.gameState}
                playerNum={playerNum}
                onMove={handleTTTMove}
                disabled={!isPassAndPlay && (currentRoom.gameState?.currentTurn !== playerNum || currentRoom.status === 'finished')}
              />
            )}

            {currentRoom.gameType === 'dotsboxes' && (
              <DotsAndBoxes
                state={currentRoom.gameState}
                playerNum={playerNum}
                onMove={handleDotsMove}
                disabled={!isPassAndPlay && (currentRoom.gameState?.currentTurn !== playerNum || currentRoom.status === 'finished')}
              />
            )}

            {currentRoom.gameType === 'battleship' && (
              <Battleship
                state={currentRoom.gameState}
                playerNum={playerNum}
                onSetReady={handleBattleshipReady}
                onShoot={handleBattleshipShoot}
                disabled={!isPassAndPlay && (currentRoom.gameState?.currentTurn !== playerNum || currentRoom.status === 'finished')}
              />
            )}

            {currentRoom.gameType === 'connectfour' && (
              <ConnectFour
                state={currentRoom.gameState}
                playerNum={playerNum}
                onDrop={handleConnectFourDrop}
                disabled={!isPassAndPlay && (currentRoom.gameState?.currentTurn !== playerNum || currentRoom.status === 'finished')}
              />
            )}

            {currentRoom.gameType === 'pong' && (
              <Pong
                state={currentRoom.gameState}
                playerNum={playerNum}
                onPaddleMove={handlePongPaddleMove}
                disabled={currentRoom.status === 'finished'}
              />
            )}

            {currentRoom.gameType === 'snake' && (
              <Snake
                state={currentRoom.gameState}
                playerNum={playerNum}
                onDirectionChange={handleSnakeDir}
                disabled={currentRoom.status === 'finished'}
              />
            )}

            {currentRoom.gameType === 'racing' && (
              <Racing
                state={currentRoom.gameState}
                playerNum={playerNum}
                onSyncCar={handleRacingSync}
                disabled={currentRoom.status === 'finished'}
              />
            )}

            {currentRoom.gameType === 'fighting' && (
              <Fighting
                state={currentRoom.gameState}
                playerNum={playerNum}
                onAction={handleFightingAction}
                disabled={currentRoom.status === 'finished'}
              />
            )}
          </GameWrapper>
        )}
      </main>

      {/* Termux Terminal & Python Code Modal */}
      <TermuxGuideModal
        isOpen={isTermuxModalOpen}
        onClose={() => setIsTermuxModalOpen(false)}
      />
    </div>
  );
}

export default App;
