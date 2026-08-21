import React, { useState, useMemo } from 'react';
import { ChessState, ChessPiece, ChessPieceType, ChessMove } from '../../types';
import { sounds } from '../../utils/audio';
import { Crown, Sparkles, RefreshCw, Flag, Swords, ShieldAlert } from 'lucide-react';

interface ChessProps {
  state: ChessState;
  playerNum: 1 | 2;
  onMakeMove: (move: { from: { r: number; c: number }; to: { r: number; c: number }; promotion?: ChessPieceType }) => void;
  disabled?: boolean;
}

// Crisp High-Resolution SVG Chess Pieces
const ChessPieceSVG: React.FC<{ type: ChessPieceType; color: 'w' | 'b' }> = ({ type, color }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#ffffff' : '#1e293b';
  const stroke = isWhite ? '#475569' : '#0f172a';
  const accent = isWhite ? '#cbd5e1' : '#334155';

  switch (type) {
    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Cross */}
            <path d="M22.5 11.63V6M20 8h5" stroke={stroke} strokeLinejoin="miter" />
            {/* Crown Head */}
            <path
              d="M22.5 25c0-4.5 4.5-7.5 4.5-12.5a4.5 4.5 0 0 0-9 0c0 5 4.5 8 4.5 12.5"
              fill={fill}
              stroke={stroke}
            />
            <path
              d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-6.5 6-6.5 6-2.5-4-8-4-11 0 0 0-2.5-7-6.5-6-3 6 6 10.5 6 10.5v7z"
              fill={fill}
              stroke={stroke}
            />
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke={stroke} />
          </g>
        </svg>
      );
    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-11-2.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-15 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
              fill={fill}
              stroke={stroke}
            />
            <path
              d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"
              fill={fill}
              stroke={stroke}
            />
            <path
              d="M9 26c0 2 1.5 2 2.5 4 2.5 4 1 5.5 1 8.5 0 2.5 3 4.5 10 4.5s10-2 10-4.5c0-3-1.5-4.5 1-8.5 1-2 2.5-2 2.5-4-6.5-1.5-18.5-1.5-27 0z"
              fill={fill}
              stroke={stroke}
            />
            <path d="M11 38.5a35 35 1 0 0 23 0" stroke={stroke} />
          </g>
        </svg>
      );
    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm2.5-4l1.5-13.5h13.5l1.5 13.5h-16.5zM12 18.5h21V15H12v3.5zm-3-3.5h27v-5h-3v2h-4v-2h-4v2h-3v-2h-4v2h-3v-2H9v5z"
              fill={fill}
              stroke={stroke}
            />
            <path d="M12 18.5l2.5 14m17 0l2.5-14" stroke={stroke} />
          </g>
        </svg>
      );
    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"
              fill={fill}
              stroke={stroke}
            />
            <path
              d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
              fill={fill}
              stroke={stroke}
            />
            <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" fill={fill} stroke={stroke} />
            <path d="M17.5 26h10M15 30h15m-7.5-15.5v5m-3-2.5h6" stroke={stroke} />
          </g>
        </svg>
      );
    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
              fill={fill}
              stroke={stroke}
            />
            <path
              d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
              fill={fill}
              stroke={stroke}
            />
            <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm5.5-10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill={stroke} />
          </g>
        </svg>
      );
    case 'p': // Pawn
    default:
      return (
        <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
          <path
            d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.93 3.84 2.38 5.03-3.03 1.3-5.38 4.31-5.38 7.97H32.5c0-3.66-2.35-6.67-5.38-7.97 1.45-1.19 2.38-3 2.38-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

// Helper: Calculate Legal Moves for highlighted squares on client-side
function getLegalMovesForSquare(
  r: number,
  c: number,
  state: ChessState
): { r: number; c: number; isEnPassant?: boolean; isCastling?: boolean }[] {
  const piece = state.board[r][c];
  if (!piece) return [];
  const color = piece.color;
  const moves: { r: number; c: number; isEnPassant?: boolean; isCastling?: boolean }[] = [];

  const isValid = (nr: number, nc: number) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8;

  // Pawn Moves
  if (piece.type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;

    // Single step forward
    if (isValid(r + dir, c) && !state.board[r + dir][c]) {
      moves.push({ r: r + dir, c });
      // Double step forward
      if (r === startRow && isValid(r + dir * 2, c) && !state.board[r + dir * 2][c]) {
        moves.push({ r: r + dir * 2, c });
      }
    }

    // Diagonal captures
    [-1, 1].forEach((dc) => {
      const nr = r + dir;
      const nc = c + dc;
      if (isValid(nr, nc)) {
        const target = state.board[nr][nc];
        if (target && target.color !== color) {
          moves.push({ r: nr, c: nc });
        }
        // En Passant
        if (state.enPassantTarget && state.enPassantTarget.r === nr && state.enPassantTarget.c === nc) {
          moves.push({ r: nr, c: nc, isEnPassant: true });
        }
      }
    });
  }

  // Knight Moves
  if (piece.type === 'n') {
    const knightDeltas = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    knightDeltas.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (isValid(nr, nc)) {
        const target = state.board[nr][nc];
        if (!target || target.color !== color) moves.push({ r: nr, c: nc });
      }
    });
  }

  // Ray pieces: Bishop, Rook, Queen
  const addRayMoves = (directions: [number, number][]) => {
    directions.forEach(([dr, dc]) => {
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (!isValid(nr, nc)) break;
        const target = state.board[nr][nc];
        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (target.color !== color) moves.push({ r: nr, c: nc });
          break;
        }
        step++;
      }
    });
  };

  if (piece.type === 'b' || piece.type === 'q') {
    addRayMoves([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  }
  if (piece.type === 'r' || piece.type === 'q') {
    addRayMoves([[-1, 0], [1, 0], [0, -1], [0, 1]]);
  }

  // King Moves
  if (piece.type === 'k') {
    const kingDeltas = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];
    kingDeltas.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (isValid(nr, nc)) {
        const target = state.board[nr][nc];
        if (!target || target.color !== color) moves.push({ r: nr, c: nc });
      }
    });

    // Castling
    const rights = state.castlingRights ? state.castlingRights[color] : null;
    if (rights && !state.isCheck) {
      const baseRow = color === 'w' ? 7 : 0;
      if (r === baseRow && c === 4) {
        // King-side
        if (rights.kingSide && !state.board[baseRow][5] && !state.board[baseRow][6]) {
          moves.push({ r: baseRow, c: 6, isCastling: true });
        }
        // Queen-side
        if (rights.queenSide && !state.board[baseRow][1] && !state.board[baseRow][2] && !state.board[baseRow][3]) {
          moves.push({ r: baseRow, c: 2, isCastling: true });
        }
      }
    }
  }

  return moves;
}

export const Chess: React.FC<ChessProps> = ({
  state,
  playerNum,
  onMakeMove,
  disabled = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: { r: number; c: number }; to: { r: number; c: number } } | null>(null);

  // My playing color: Player 1 = White ('w'), Player 2 = Black ('b')
  const myColor: 'w' | 'b' = playerNum === 1 ? 'w' : 'b';
  const isMyTurn = state.currentTurn === myColor;

  // Board orientation (flip if playing as Black)
  const isFlipped = playerNum === 2;

  // Calculate legal moves for selected square
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMovesForSquare(selectedSquare.r, selectedSquare.c, state);
  }, [selectedSquare, state]);

  // Click on a board cell
  const handleSquareClick = (r: number, c: number) => {
    if (disabled || !isMyTurn) return;

    const clickedPiece = state.board[r][c];

    // If already selected and clicking on a valid target square
    if (selectedSquare) {
      const isLegal = legalMoves.some((m) => m.r === r && m.c === c);

      if (isLegal) {
        const piece = state.board[selectedSquare.r][selectedSquare.c];

        // Check for Pawn Promotion
        if (piece && piece.type === 'p' && ((piece.color === 'w' && r === 0) || (piece.color === 'b' && r === 7))) {
          setPendingPromotion({ from: selectedSquare, to: { r, c } });
          return;
        }

        // Execute Standard Move
        sounds.playClick();
        onMakeMove({
          from: selectedSquare,
          to: { r, c },
        });
        setSelectedSquare(null);
        return;
      }

      // If clicked on another of my pieces, select it instead
      if (clickedPiece && clickedPiece.color === myColor) {
        setSelectedSquare({ r, c });
        sounds.playMove();
        return;
      }

      // Deselect
      setSelectedSquare(null);
      return;
    }

    // Initial Selection (must be my piece and my turn)
    if (clickedPiece && clickedPiece.color === myColor) {
      setSelectedSquare({ r, c });
      sounds.playMove();
    }
  };

  // Promotion choice
  const handleSelectPromotion = (promoType: ChessPieceType) => {
    if (!pendingPromotion) return;
    sounds.playCapture();
    onMakeMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promoType,
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  // Letters and numbers for coordinates
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // Display ranks & files adjusted for board flipping
  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;
  const displayFiles = isFlipped ? [...files].reverse() : files;

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-3 w-full max-w-lg select-none" dir="rtl">
      {/* Header Turn / Status Banner */}
      <div className="flex items-center justify-between w-full px-5 py-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg border ${
              state.currentTurn === 'w'
                ? 'bg-slate-100 text-slate-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                : 'bg-slate-900 text-slate-100 border-slate-700 shadow-[0_0_15px_rgba(30,41,59,0.8)]'
            }`}>
              {state.currentTurn === 'w' ? '♔' : '♚'}
            </div>
            {state.isCheck && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-100">
                {state.currentTurn === 'w' ? 'نوبت سفید (White)' : 'نوبت سیاه (Black)'}
              </span>
              {isMyTurn && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                  نوبت شماست!
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">
              شما: {myColor === 'w' ? 'سفید ⚪ (Player 1)' : 'سیاه ⚫ (Player 2)'}
            </div>
          </div>
        </div>

        {/* Check or Game Over Badge */}
        {state.isCheckmate ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black animate-pulse">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>کیش و مات!</span>
          </div>
        ) : state.isCheck ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>کیش (Check)!</span>
          </div>
        ) : state.isStalemate ? (
          <div className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
            پات (تساوی)
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-mono">
            حرکت {state.moveHistory?.length || 0}
          </div>
        )}
      </div>

      {/* Opponent Captured Pieces */}
      <div className="flex items-center justify-between w-full px-3 py-1 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
        <span className="text-slate-400 font-bold">مهره‌های گرفته شده حریف:</span>
        <div className="flex items-center gap-1 min-h-[22px] flex-wrap">
          {(isFlipped ? state.capturedPieces?.b : state.capturedPieces?.w)?.map((p, idx) => (
            <span key={idx} className="w-5 h-5 inline-block opacity-80">
              <ChessPieceSVG type={p.type} color={p.color} />
            </span>
          )) || <span className="text-slate-600 text-[10px]">هیچ</span>}
        </div>
      </div>

      {/* Main 8x8 Chessboard Container with Wooden / Tournament Theme */}
      <div className="relative w-full aspect-square max-w-[420px] rounded-3xl p-3 bg-gradient-to-b from-[#2d3748] to-[#1a202c] border-4 border-[#334155] shadow-2xl overflow-hidden">
        {/* Coordinates Frame */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-800 grid grid-cols-8 grid-rows-8">
          {Array.from({ length: 8 }).map((_, rIdx) => {
            const r = isFlipped ? 7 - rIdx : rIdx;

            return Array.from({ length: 8 }).map((_, cIdx) => {
              const c = isFlipped ? 7 - cIdx : cIdx;
              const piece = state.board[r][c];

              // Light and Dark Squares Colors (Classic Green Tournament Look)
              const isLight = (r + c) % 2 === 0;
              const isSelected = selectedSquare && selectedSquare.r === r && selectedSquare.c === c;
              const isLegalTarget = legalMoves.some((m) => m.r === r && m.c === c);
              const isLastMove =
                state.lastMove &&
                ((state.lastMove.from.r === r && state.lastMove.from.c === c) ||
                  (state.lastMove.to.r === r && state.lastMove.to.c === c));
              const isKingInCheck =
                piece && piece.type === 'k' && piece.color === state.currentTurn && state.isCheck;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleSquareClick(r, c)}
                  className={`relative flex items-center justify-center p-1 transition-all cursor-pointer select-none ${
                    isLight ? 'bg-[#ebecd0] text-[#779556]' : 'bg-[#779556] text-[#ebecd0]'
                  } ${isSelected ? '!bg-[#f7c04a] shadow-inner ring-2 ring-amber-400' : ''} ${
                    isLastMove && !isSelected ? 'brightness-110 !bg-[#d2d665]' : ''
                  } ${isKingInCheck ? '!bg-rose-500/90 animate-pulse' : ''}`}
                >
                  {/* File / Rank Labels in Corners */}
                  {cIdx === 0 && (
                    <span className={`absolute top-0.5 left-1 text-[9px] font-black pointer-events-none opacity-80 ${
                      isLight ? 'text-[#779556]' : 'text-[#ebecd0]'
                    }`}>
                      {displayRanks[rIdx]}
                    </span>
                  )}
                  {rIdx === 7 && (
                    <span className={`absolute bottom-0.5 right-1 text-[9px] font-black pointer-events-none opacity-80 ${
                      isLight ? 'text-[#779556]' : 'text-[#ebecd0]'
                    }`}>
                      {displayFiles[cIdx]}
                    </span>
                  )}

                  {/* Chess Piece Render */}
                  {piece && (
                    <div className={`w-full h-full flex items-center justify-center transform transition-transform hover:scale-105 ${
                      isSelected ? 'scale-110' : ''
                    }`}>
                      <ChessPieceSVG type={piece.type} color={piece.color} />
                    </div>
                  )}

                  {/* Move Target Indicator Dot or Ring */}
                  {isLegalTarget && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {piece ? (
                        <div className="w-full h-full border-4 border-rose-500/80 rounded-full animate-pulse shadow-md" />
                      ) : (
                        <div className="w-3.5 h-3.5 bg-slate-900/40 rounded-full shadow-sm" />
                      )}
                    </div>
                  )}
                </button>
              );
            });
          })}
        </div>
      </div>

      {/* Your Captured Pieces */}
      <div className="flex items-center justify-between w-full px-3 py-1 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
        <span className="text-slate-400 font-bold">مهره‌های از دست رفته شما:</span>
        <div className="flex items-center gap-1 min-h-[22px] flex-wrap">
          {(isFlipped ? state.capturedPieces?.w : state.capturedPieces?.b)?.map((p, idx) => (
            <span key={idx} className="w-5 h-5 inline-block opacity-80">
              <ChessPieceSVG type={p.type} color={p.color} />
            </span>
          )) || <span className="text-slate-600 text-[10px]">هیچ</span>}
        </div>
      </div>

      {/* Pawn Promotion Modal Selection */}
      {pendingPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-500/60 p-5 shadow-2xl text-center space-y-4">
            <h3 className="text-lg font-black text-amber-300 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>ترفیع پیاده (Pawn Promotion)</span>
            </h3>
            <p className="text-xs text-slate-300">
              پیاده شما به خانه آخر رسید! مهره جایگزین را انتخاب کنید:
            </p>

            <div className="grid grid-cols-4 gap-2 pt-2">
              {(['q', 'r', 'b', 'n'] as ChessPieceType[]).map((pType) => (
                <button
                  key={pType}
                  type="button"
                  onClick={() => handleSelectPromotion(pType)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800 hover:bg-amber-500/20 active:scale-95 border border-slate-700 hover:border-amber-400 transition"
                >
                  <div className="w-10 h-10">
                    <ChessPieceSVG type={pType} color={myColor} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 mt-1">
                    {pType === 'q' ? 'وزیر' : pType === 'r' ? 'رخ' : pType === 'b' ? 'فیل' : 'اسب'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
