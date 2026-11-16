import { CHESS_SEAT_META } from '../constants/game.constants.js';
import {
  ChessCellMeta,
  ChessPiece,
  ChessPieceType,
  ChessPoint2D,
  ChessSeatMeta,
  ChessVariant,
} from '../types/chess.types.js';

export type Dir4 = 0 | 1 | 2 | 3;

export interface EdgeStepLink {
  nextCellId: string;
  /** Maps any local direction index d (0..3) in the origin cell into the destination cell's local basis. */
  mapDir: readonly [Dir4, Dir4, Dir4, Dir4];
}

export interface DiagStepTarget {
  nextCellId: string;
  /** Mapped axis pair in the destination cell for continuing a Bishop/Queen diagonal ray. */
  nextAxes: readonly [Dir4, Dir4];
}

export interface CastleDefinition {
  kingStartId: string;
  rookStartId: string;
  kingPassId: string;
  kingDestId: string;
  rookDestId: string;
  mustBeEmptyIds: string[];
}

export interface BoardTopology {
  variant: ChessVariant;
  viewBoxSize: number;
  cellRadiusEstimate: number;
  cells: ChessCellMeta[];
  cellMap: Map<string, ChessCellMeta>;
  seats: ChessSeatMeta[];
  /** Edge neighbors indexed by cellId -> [dir0, dir1, dir2, dir3] */
  edgeSteps: Map<string, [EdgeStepLink | undefined, EdgeStepLink | undefined, EdgeStepLink | undefined, EdgeStepLink | undefined]>;
  /** For every unordered orthogonal axis pair keyed `${d1}-${d2}` where d1<d2, lists 1 (normal) or 2 (3P center fork) diagonal next steps. */
  diagSteps: Map<string, Map<string, DiagStepTarget[]>>;
  castlesBySeat: Map<number, CastleDefinition[]>;
  initialPieces: Record<string, ChessPiece>;
  getPawnForwardDir: (cellId: string, ownerSeat: number) => Dir4;
  getPawnDoubleStartCells: (ownerSeat: number) => Set<string>;
  getPawnCaptureTargets: (cellId: string, ownerSeat: number) => string[];
  isPromotionCell: (cellId: string, ownerSeat: number) => boolean;
}

const IDENTITY_MAP: readonly [Dir4, Dir4, Dir4, Dir4] = [0, 1, 2, 3];
const FLIP_U_MAP: readonly [Dir4, Dir4, Dir4, Dir4] = [2, 1, 0, 3];
const FLIP_V_MAP: readonly [Dir4, Dir4, Dir4, Dir4] = [0, 3, 2, 1];

const AXIS_PAIRS: readonly [Dir4, Dir4][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 3],
];

function pairKey(a: Dir4, b: Dir4): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function buildGenericDiagSteps(
  cells: ChessCellMeta[],
  edgeSteps: BoardTopology['edgeSteps']
): BoardTopology['diagSteps'] {
  const diagSteps: BoardTopology['diagSteps'] = new Map();

  for (const cell of cells) {
    const cellDiagMap = new Map<string, DiagStepTarget[]>();
    const links = edgeSteps.get(cell.id)!;

    for (const [d1, d2] of AXIS_PAIRS) {
      const results: DiagStepTarget[] = [];

      // Path A: step d1 then mapped d2
      const s1 = links[d1];
      if (s1) {
        const d2After1 = s1.mapDir[d2];
        const s12 = edgeSteps.get(s1.nextCellId)![d2After1];
        if (s12 && s12.nextCellId !== cell.id) {
          const nextD1 = s12.mapDir[s1.mapDir[d1]];
          const nextD2 = s12.mapDir[d2After1];
          results.push({ nextCellId: s12.nextCellId, nextAxes: [nextD1, nextD2] });
        }
      }

      // Path B: step d2 then mapped d1 (adds a 2nd branch strictly at the 3P 6-rosette center vertex)
      const s2 = links[d2];
      if (s2) {
        const d1After2 = s2.mapDir[d1];
        const s21 = edgeSteps.get(s2.nextCellId)![d1After2];
        if (s21 && s21.nextCellId !== cell.id) {
          const nextD1 = s21.mapDir[d1After2];
          const nextD2 = s21.mapDir[s2.mapDir[d2]];
          if (!results.some((r) => r.nextCellId === s21.nextCellId)) {
            results.push({ nextCellId: s21.nextCellId, nextAxes: [nextD1, nextD2] });
          }
        }
      }

      cellDiagMap.set(pairKey(d1, d2), results);
    }

    diagSteps.set(cell.id, cellDiagMap);
  }

  return diagSteps;
}

function buildRectGridTopology(variant: '2P' | '4P'): BoardTopology {
  const is4P = variant === '4P';
  const size = is4P ? 14 : 8;
  const viewBoxSize = is4P ? 700 : 640;
  const sqSize = viewBoxSize / size;

  const isCellActive = (r: number, c: number): boolean => {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (!is4P) return true;
    const inCornerRow = r < 3 || r > 10;
    const inCornerCol = c < 3 || c > 10;
    return !(inCornerRow && inCornerCol);
  };

  const cells: ChessCellMeta[] = [];
  const cellMap = new Map<string, ChessCellMeta>();
  const edgeSteps: BoardTopology['edgeSteps'] = new Map();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isCellActive(r, c)) continue;
      const id = `${r},${c}`;
      const x = c * sqSize;
      const y = r * sqSize;
      // In 2P: (r+c)%2 === 0 is Light (top-left a8 = 0,0 is Light).
      // In 4P Image 1: row 0 col 3 = Light (0+3=3 odd), row 13 col 3 = Dark (16 even).
      const light = is4P ? (r + c) % 2 === 1 : (r + c) % 2 === 0;
      const label = is4P ? `${String.fromCharCode(65 + c)}${size - r}` : `${String.fromCharCode(97 + c)}${size - r}`;

      const cell: ChessCellMeta = {
        id,
        label,
        light,
        row: r,
        col: c,
        center: { x: x + sqSize / 2, y: y + sqSize / 2 },
        polygon: [
          { x, y },
          { x: x + sqSize, y },
          { x: x + sqSize, y: y + sqSize },
          { x, y: y + sqSize },
        ],
      };

      cells.push(cell);
      cellMap.set(id, cell);
    }
  }

  for (const cell of cells) {
    const r = cell.row!;
    const c = cell.col!;
    const nLink = isCellActive(r - 1, c) ? { nextCellId: `${r - 1},${c}`, mapDir: IDENTITY_MAP } : undefined;
    const eLink = isCellActive(r, c + 1) ? { nextCellId: `${r},${c + 1}`, mapDir: IDENTITY_MAP } : undefined;
    const sLink = isCellActive(r + 1, c) ? { nextCellId: `${r + 1},${c}`, mapDir: IDENTITY_MAP } : undefined;
    const wLink = isCellActive(r, c - 1) ? { nextCellId: `${r},${c - 1}`, mapDir: IDENTITY_MAP } : undefined;
    edgeSteps.set(cell.id, [nLink, eLink, sLink, wLink]);
  }

  const diagSteps = buildGenericDiagSteps(cells, edgeSteps);
  const seats = CHESS_SEAT_META[variant];
  const initialPieces: Record<string, ChessPiece> = {};
  const backRankOrder: ChessPieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const flippedBackOrder: ChessPieceType[] = ['R', 'N', 'B', 'K', 'Q', 'B', 'N', 'R'];

  const putPiece = (cellId: string, seatIdx: number, type: ChessPieceType, tag: string) => {
    const meta = seats[seatIdx];
    initialPieces[cellId] = {
      id: `s${seatIdx}-${type}-${tag}`,
      seat: seatIdx,
      color: meta.color,
      type,
      hasMoved: false,
    };
  };

  const castlesBySeat = new Map<number, CastleDefinition[]>();
  const pawnStartSets = new Map<number, Set<string>>();

  if (!is4P) {
    // 2P Classic
    const wStart = new Set<string>();
    const bStart = new Set<string>();
    for (let c = 0; c < 8; c++) {
      putPiece(`7,${c}`, 0, backRankOrder[c], `b${c}`);
      putPiece(`6,${c}`, 0, 'P', `p${c}`);
      wStart.add(`6,${c}`);

      putPiece(`0,${c}`, 1, backRankOrder[c], `b${c}`);
      putPiece(`1,${c}`, 1, 'P', `p${c}`);
      bStart.add(`1,${c}`);
    }
    pawnStartSets.set(0, wStart);
    pawnStartSets.set(1, bStart);

    castlesBySeat.set(0, [
      {
        kingStartId: '7,4',
        rookStartId: '7,7',
        kingPassId: '7,5',
        kingDestId: '7,6',
        rookDestId: '7,5',
        mustBeEmptyIds: ['7,5', '7,6'],
      },
      {
        kingStartId: '7,4',
        rookStartId: '7,0',
        kingPassId: '7,3',
        kingDestId: '7,2',
        rookDestId: '7,3',
        mustBeEmptyIds: ['7,3', '7,2', '7,1'],
      },
    ]);
    castlesBySeat.set(1, [
      {
        kingStartId: '0,4',
        rookStartId: '0,7',
        kingPassId: '0,5',
        kingDestId: '0,6',
        rookDestId: '0,5',
        mustBeEmptyIds: ['0,5', '0,6'],
      },
      {
        kingStartId: '0,4',
        rookStartId: '0,0',
        kingPassId: '0,3',
        kingDestId: '0,2',
        rookDestId: '0,3',
        mustBeEmptyIds: ['0,3', '0,2', '0,1'],
      },
    ]);
  } else {
    // 4P Cross matching Image 1:
    // Seat 0: Yellow (Bottom) r=13/12, c=3..10 (R N B Q K B N R)
    // Seat 1: Blue (Left) c=0/1, r=3..10 (R N B K Q B N R)
    // Seat 2: Red (Top) r=0/1, c=3..10 (R N B K Q B N R)
    // Seat 3: Green (Right) c=13/12, r=3..10 (R N B Q K B N R)
    const s0Start = new Set<string>();
    const s1Start = new Set<string>();
    const s2Start = new Set<string>();
    const s3Start = new Set<string>();

    for (let i = 0; i < 8; i++) {
      const idx = 3 + i;
      putPiece(`13,${idx}`, 0, backRankOrder[i], `b${i}`);
      putPiece(`12,${idx}`, 0, 'P', `p${i}`);
      s0Start.add(`12,${idx}`);

      putPiece(`${idx},0`, 1, flippedBackOrder[i], `b${i}`);
      putPiece(`${idx},1`, 1, 'P', `p${i}`);
      s1Start.add(`${idx},1`);

      putPiece(`0,${idx}`, 2, flippedBackOrder[i], `b${i}`);
      putPiece(`1,${idx}`, 2, 'P', `p${i}`);
      s2Start.add(`1,${idx}`);

      putPiece(`${idx},13`, 3, backRankOrder[i], `b${i}`);
      putPiece(`${idx},12`, 3, 'P', `p${i}`);
      s3Start.add(`${idx},12`);
    }

    pawnStartSets.set(0, s0Start);
    pawnStartSets.set(1, s1Start);
    pawnStartSets.set(2, s2Start);
    pawnStartSets.set(3, s3Start);

    castlesBySeat.set(0, [
      {
        kingStartId: '13,7',
        rookStartId: '13,10',
        kingPassId: '13,8',
        kingDestId: '13,9',
        rookDestId: '13,8',
        mustBeEmptyIds: ['13,8', '13,9'],
      },
      {
        kingStartId: '13,7',
        rookStartId: '13,3',
        kingPassId: '13,6',
        kingDestId: '13,5',
        rookDestId: '13,6',
        mustBeEmptyIds: ['13,6', '13,5', '13,4'],
      },
    ]);
    castlesBySeat.set(1, [
      {
        kingStartId: '6,0',
        rookStartId: '3,0',
        kingPassId: '5,0',
        kingDestId: '4,0',
        rookDestId: '5,0',
        mustBeEmptyIds: ['5,0', '4,0'],
      },
      {
        kingStartId: '6,0',
        rookStartId: '10,0',
        kingPassId: '7,0',
        kingDestId: '8,0',
        rookDestId: '7,0',
        mustBeEmptyIds: ['7,0', '8,0', '9,0'],
      },
    ]);
    castlesBySeat.set(2, [
      {
        kingStartId: '0,6',
        rookStartId: '0,3',
        kingPassId: '0,5',
        kingDestId: '0,4',
        rookDestId: '0,5',
        mustBeEmptyIds: ['0,5', '0,4'],
      },
      {
        kingStartId: '0,6',
        rookStartId: '0,10',
        kingPassId: '0,7',
        kingDestId: '0,8',
        rookDestId: '0,7',
        mustBeEmptyIds: ['0,7', '0,8', '0,9'],
      },
    ]);
    castlesBySeat.set(3, [
      {
        kingStartId: '7,13',
        rookStartId: '10,13',
        kingPassId: '8,13',
        kingDestId: '9,13',
        rookDestId: '8,13',
        mustBeEmptyIds: ['8,13', '9,13'],
      },
      {
        kingStartId: '7,13',
        rookStartId: '3,13',
        kingPassId: '6,13',
        kingDestId: '5,13',
        rookDestId: '6,13',
        mustBeEmptyIds: ['6,13', '5,13', '4,13'],
      },
    ]);
  }

  const getPawnForwardDir = (_cellId: string, ownerSeat: number): Dir4 => {
    if (!is4P) return ownerSeat === 0 ? 0 : 2;
    if (ownerSeat === 0) return 0; // North (-r)
    if (ownerSeat === 1) return 1; // East (+c)
    if (ownerSeat === 2) return 2; // South (+r)
    return 3; // West (-c)
  };

  const getPawnCaptureTargets = (cellId: string, ownerSeat: number): string[] => {
    const fDir = getPawnForwardDir(cellId, ownerSeat);
    const leftDir = ((fDir + 3) % 4) as Dir4;
    const rightDir = ((fDir + 1) % 4) as Dir4;
    const diag = diagSteps.get(cellId);
    if (!diag) return [];
    const out: string[] = [];
    for (const step of diag.get(pairKey(fDir, leftDir)) || []) {
      if (!out.includes(step.nextCellId)) out.push(step.nextCellId);
    }
    for (const step of diag.get(pairKey(fDir, rightDir)) || []) {
      if (!out.includes(step.nextCellId)) out.push(step.nextCellId);
    }
    return out;
  };

  const isPromotionCell = (cellId: string, ownerSeat: number): boolean => {
    const cell = cellMap.get(cellId);
    if (!cell) return false;
    const r = cell.row!;
    const c = cell.col!;
    if (!is4P) {
      return ownerSeat === 0 ? r === 0 : r === 7;
    }
    // 4P 11th rank promotion rule
    if (ownerSeat === 0) return r <= 3;
    if (ownerSeat === 1) return c >= 10;
    if (ownerSeat === 2) return r >= 10;
    return c <= 3;
  };

  return {
    variant,
    viewBoxSize,
    cellRadiusEstimate: sqSize / 2,
    cells,
    cellMap,
    seats,
    edgeSteps,
    diagSteps,
    castlesBySeat,
    initialPieces,
    getPawnForwardDir,
    getPawnDoubleStartCells: (seat) => pawnStartSets.get(seat) || new Set<string>(),
    getPawnCaptureTargets,
    isPromotionCell,
  };
}

function buildThreePlayerHexTopology(): BoardTopology {
  const viewBoxSize = 700;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2;
  const outerR = 322;
  const midR = outerR * (Math.sqrt(3) / 2);

  const deg2rad = (deg: number) => (deg * Math.PI) / 180;
  const ptAt = (deg: number, r: number): ChessPoint2D => ({
    x: cx + r * Math.cos(deg2rad(deg)),
    y: cy + r * Math.sin(deg2rad(deg)),
  });

  // Sectors 0..5 clockwise:
  // s=0: White left (homeRay 90° down, corner 120° bottom-left, emptyRay 150°)
  // s=1: Black right (homeRay 210°, corner 180° leftmost, emptyRay 150°)
  // s=2: Black left (homeRay 210°, corner 240° top-left, emptyRay 270°)
  // s=3: Red right (homeRay 330°, corner 300° top-right, emptyRay 270°)
  // s=4: Red left (homeRay 330°, corner 0° rightmost, emptyRay 30°)
  // s=5: White right (homeRay 90°, corner 60° bottom-right, emptyRay 30°)
  const homeRays = [90, 210, 210, 330, 330, 90];

  const bilinearPoint = (sector: number, tu: number, tv: number): ChessPoint2D => {
    const hDeg = homeRays[sector];
    const sign = sector % 2 === 0 ? 1 : -1;
    const pHome = ptAt(hDeg, midR);
    const pCorner = ptAt(hDeg + sign * 30, outerR);
    const pEmpty = ptAt(hDeg + sign * 60, midR);
    const pCenter: ChessPoint2D = { x: cx, y: cy };

    const a = (1 - tu) * (1 - tv);
    const b = tu * (1 - tv);
    const c = tu * tv;
    const d = (1 - tu) * tv;
    return {
      x: a * pHome.x + b * pCorner.x + c * pEmpty.x + d * pCenter.x,
      y: a * pHome.y + b * pCorner.y + c * pEmpty.y + d * pCenter.y,
    };
  };

  const cells: ChessCellMeta[] = [];
  const cellMap = new Map<string, ChessCellMeta>();
  const edgeSteps: BoardTopology['edgeSteps'] = new Map();

  for (let s = 0; s < 6; s++) {
    for (let v = 0; v < 4; v++) {
      for (let u = 0; u < 4; u++) {
        const id = `${s}:${u}:${v}`;
        const p00 = bilinearPoint(s, u / 4, v / 4);
        const p10 = bilinearPoint(s, (u + 1) / 4, v / 4);
        const p11 = bilinearPoint(s, (u + 1) / 4, (v + 1) / 4);
        const p01 = bilinearPoint(s, u / 4, (v + 1) / 4);

        // Bias center slightly outward on apex wedges (u=0,v=3) so pieces sit well inside the quad
        const tuMid = u === 0 && v === 3 ? (u + 0.56) / 4 : (u + 0.5) / 4;
        const tvMid = u === 0 && v === 3 ? (v + 0.44) / 4 : (v + 0.5) / 4;
        const center = bilinearPoint(s, tuMid, tvMid);

        const light = s % 2 === 0 ? (u + v) % 2 === 1 : (u + v) % 2 === 0;
        const ownerPrefix = s === 0 || s === 5 ? 'W' : s === 1 || s === 2 ? 'B' : 'R';
        const fileChar = s % 2 === 0 ? String.fromCharCode(100 - u) : String.fromCharCode(101 + u);
        const label = `${ownerPrefix}-${fileChar}${v + 1}`;

        const cell: ChessCellMeta = {
          id,
          label,
          light,
          sector: s,
          u,
          v,
          center,
          polygon: [p00, p10, p11, p01],
        };
        cells.push(cell);
        cellMap.set(id, cell);
      }
    }
  }

  for (const cell of cells) {
    const s = cell.sector!;
    const u = cell.u!;
    const v = cell.v!;

    // 0: +u, 1: +v, 2: -u, 3: -v
    const l0: EdgeStepLink | undefined = u < 3 ? { nextCellId: `${s}:${u + 1}:${v}`, mapDir: IDENTITY_MAP } : undefined;
    const l1: EdgeStepLink =
      v < 3
        ? { nextCellId: `${s}:${u}:${v + 1}`, mapDir: IDENTITY_MAP }
        : {
            nextCellId: `${s % 2 === 0 ? (s + 1) % 6 : (s + 5) % 6}:${u}:3`,
            mapDir: FLIP_V_MAP,
          };
    const l2: EdgeStepLink =
      u > 0
        ? { nextCellId: `${s}:${u - 1}:${v}`, mapDir: IDENTITY_MAP }
        : {
            nextCellId: `${s % 2 === 0 ? (s + 5) % 6 : (s + 1) % 6}:0:${v}`,
            mapDir: FLIP_U_MAP,
          };
    const l3: EdgeStepLink | undefined = v > 0 ? { nextCellId: `${s}:${u}:${v - 1}`, mapDir: IDENTITY_MAP } : undefined;

    edgeSteps.set(cell.id, [l0, l1, l2, l3]);
  }

  const diagSteps = buildGenericDiagSteps(cells, edgeSteps);
  const seats = CHESS_SEAT_META['3P'];
  const initialPieces: Record<string, ChessPiece> = {};

  // Seat 0 White: sLeft=0, sRight=5
  // Seat 1 Black: sLeft=2, sRight=1
  // Seat 2 Red:   sLeft=4, sRight=3
  const seatSectors: [number, number][] = [
    [0, 5],
    [2, 1],
    [4, 3],
  ];

  const leftBackPieces: ChessPieceType[] = ['Q', 'B', 'N', 'R']; // u = 0,1,2,3
  const rightBackPieces: ChessPieceType[] = ['K', 'B', 'N', 'R']; // u = 0,1,2,3
  const castlesBySeat = new Map<number, CastleDefinition[]>();
  const pawnStartSets = new Map<number, Set<string>>();

  for (let seatIdx = 0; seatIdx < 3; seatIdx++) {
    const [sLeft, sRight] = seatSectors[seatIdx];
    const pSet = new Set<string>();
    const color = seats[seatIdx].color;

    for (let u = 0; u < 4; u++) {
      const lt = leftBackPieces[u];
      const rt = rightBackPieces[u];

      initialPieces[`${sLeft}:${u}:0`] = {
        id: `s${seatIdx}-${lt}-L${u}`,
        seat: seatIdx,
        color,
        type: lt,
        hasMoved: false,
      };
      initialPieces[`${sLeft}:${u}:1`] = {
        id: `s${seatIdx}-P-L${u}`,
        seat: seatIdx,
        color,
        type: 'P',
        hasMoved: false,
      };
      pSet.add(`${sLeft}:${u}:1`);

      initialPieces[`${sRight}:${u}:0`] = {
        id: `s${seatIdx}-${rt}-R${u}`,
        seat: seatIdx,
        color,
        type: rt,
        hasMoved: false,
      };
      initialPieces[`${sRight}:${u}:1`] = {
        id: `s${seatIdx}-P-R${u}`,
        seat: seatIdx,
        color,
        type: 'P',
        hasMoved: false,
      };
      pSet.add(`${sRight}:${u}:1`);
    }

    pawnStartSets.set(seatIdx, pSet);
    castlesBySeat.set(seatIdx, [
      // Kingside (within sRight)
      {
        kingStartId: `${sRight}:0:0`,
        rookStartId: `${sRight}:3:0`,
        kingPassId: `${sRight}:1:0`,
        kingDestId: `${sRight}:2:0`,
        rookDestId: `${sRight}:1:0`,
        mustBeEmptyIds: [`${sRight}:1:0`, `${sRight}:2:0`],
      },
      // Queenside (across army spine into sLeft)
      {
        kingStartId: `${sRight}:0:0`,
        rookStartId: `${sLeft}:3:0`,
        kingPassId: `${sLeft}:0:0`,
        kingDestId: `${sLeft}:1:0`,
        rookDestId: `${sLeft}:0:0`,
        mustBeEmptyIds: [`${sLeft}:0:0`, `${sLeft}:1:0`, `${sLeft}:2:0`],
      },
    ]);
  }

  const getPawnForwardDir = (cellId: string, ownerSeat: number): Dir4 => {
    const cell = cellMap.get(cellId);
    if (!cell) return 1;
    const home = seatSectors[ownerSeat];
    // Inside own half-hexagon sectors, push inward (+v); across empty seam into enemy sector, push outward (-v)
    return home.includes(cell.sector!) ? 1 : 3;
  };

  const getPawnCaptureTargets = (cellId: string, ownerSeat: number): string[] => {
    const fDir = getPawnForwardDir(cellId, ownerSeat);
    const diag = diagSteps.get(cellId);
    if (!diag) return [];
    const out: string[] = [];
    for (const target of diag.get(pairKey(fDir, 0)) || []) {
      if (!out.includes(target.nextCellId)) out.push(target.nextCellId);
    }
    for (const target of diag.get(pairKey(fDir, 2)) || []) {
      if (!out.includes(target.nextCellId)) out.push(target.nextCellId);
    }
    return out;
  };

  const isPromotionCell = (cellId: string, ownerSeat: number): boolean => {
    const cell = cellMap.get(cellId);
    if (!cell) return false;
    const home = seatSectors[ownerSeat];
    return cell.v === 0 && !home.includes(cell.sector!);
  };

  return {
    variant: '3P',
    viewBoxSize,
    cellRadiusEstimate: 30,
    cells,
    cellMap,
    seats,
    edgeSteps,
    diagSteps,
    castlesBySeat,
    initialPieces,
    getPawnForwardDir,
    getPawnDoubleStartCells: (seat) => pawnStartSets.get(seat) || new Set<string>(),
    getPawnCaptureTargets,
    isPromotionCell,
  };
}

const topologyCache: Partial<Record<ChessVariant, BoardTopology>> = {};

export function getChessTopology(variant: ChessVariant): BoardTopology {
  if (!topologyCache[variant]) {
    if (variant === '3P') {
      topologyCache[variant] = buildThreePlayerHexTopology();
    } else {
      topologyCache[variant] = buildRectGridTopology(variant);
    }
  }
  return topologyCache[variant]!;
}
