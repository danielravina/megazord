export const ROW_EPSILON = 4;

export interface TileRect {
  id: string;
  rect: { top: number; left: number; right: number };
}

export interface RowInfo {
  rowIndex: number;
  preceding: TileRect[];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeRowInfo(tiles: TileRect[], targetId: string): RowInfo | null {
  if (tiles.length === 0) return null;

  const target = tiles.find((t) => t.id === targetId);
  if (!target) return null;

  const sameRow = tiles
    .filter((t) => Math.abs(t.rect.top - target.rect.top) <= ROW_EPSILON)
    .sort((a, b) => b.rect.left - a.rect.left);

  const rowIndex = sameRow.findIndex((t) => t.id === targetId);
  if (rowIndex === -1) return null;

  return {
    rowIndex,
    preceding: sameRow.slice(0, rowIndex),
  };
}

export function computeResizeWidth(
  cursorX: number,
  anchorRight: number,
  minWidth: number,
  containerLeft: number,
): number {
  const upper = Math.max(anchorRight - containerLeft, minWidth);
  return clamp(anchorRight - cursorX, minWidth, upper);
}
