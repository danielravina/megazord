import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeRowInfo,
  computeResizeWidth,
  clamp,
  type TileRect,
} from "./resize-utils";

function tile(id: string, top: number, left: number, right: number): TileRect {
  return { id, rect: { top, left, right } };
}

describe("computeRowInfo", () => {
  it("groups tiles by row and orders right-to-left (RTL)", () => {
    const tiles = [
      tile("t0", 0, 600, 900),
      tile("t1", 0, 300, 600),
      tile("t2", 0, 0, 300),
      tile("t3", 100, 900, 1200),
      tile("t4", 100, 600, 900),
    ];

    const row0 = computeRowInfo(tiles, "t0");
    const row1 = computeRowInfo(tiles, "t1");
    const row3 = computeRowInfo(tiles, "t3");

    assert.deepEqual(row0?.preceding.map((t) => t.id), []);
    assert.deepEqual(row1?.preceding.map((t) => t.id), ["t0"]);
    assert.deepEqual(row3?.preceding.map((t) => t.id), []);
    assert.deepEqual(row0?.rowIndex, 0);
    assert.deepEqual(row1?.rowIndex, 1);
    assert.deepEqual(row3?.rowIndex, 0);
  });

  it("collects every sibling to the right as preceding", () => {
    const tiles = [
      tile("t0", 0, 900, 1200),
      tile("t1", 0, 600, 900),
      tile("t2", 0, 300, 600),
      tile("t3", 0, 0, 300),
    ];
    const info = computeRowInfo(tiles, "t3");
    assert.deepEqual(info?.preceding.map((t) => t.id), ["t0", "t1", "t2"]);
  });

  it("returns null for unknown tile or empty list", () => {
    const tiles = [tile("t0", 0, 0, 300)];
    assert.equal(computeRowInfo(tiles, "nope"), null);
    assert.equal(computeRowInfo([], "t0"), null);
  });

  it("treats near-identical tops as the same row", () => {
    const tiles = [tile("t0", 0, 300, 600), tile("t1", 2.5, 0, 300)];
    const info = computeRowInfo(tiles, "t1");
    assert.deepEqual(info?.preceding.map((t) => t.id), ["t0"]);
  });
});

describe("computeResizeWidth", () => {
  const anchorRight = 964;
  const containerLeft = 0;
  const minWidth = 288;

  it("grows when cursor moves left, shrinks when moving right", () => {
    // cursor at the tile's current left edge → current width
    assert.equal(computeResizeWidth(452, anchorRight, minWidth, containerLeft), 512);

    // drag left (grow)
    assert.equal(computeResizeWidth(300, anchorRight, minWidth, containerLeft), 664);

    // drag right (shrink)
    assert.equal(computeResizeWidth(600, anchorRight, minWidth, containerLeft), 364);
    // beyond the right edge → clamped to the minimum
    assert.equal(computeResizeWidth(1200, anchorRight, minWidth, containerLeft), 288);
  });

  it("clamps to a minimum width", () => {
    assert.equal(computeResizeWidth(anchorRight, anchorRight, minWidth, containerLeft), 288);
    assert.equal(computeResizeWidth(2000, anchorRight, minWidth, containerLeft), 288);
  });

  it("clamps to the container left edge", () => {
    assert.equal(computeResizeWidth(-100, anchorRight, minWidth, containerLeft), 964);
    assert.equal(computeResizeWidth(0, anchorRight, minWidth, containerLeft), 964);
  });
});

describe("clamp", () => {
  it("clamps values into the range", () => {
    assert.equal(clamp(5, 1, 4), 4);
    assert.equal(clamp(0, 1, 4), 1);
    assert.equal(clamp(2, 1, 4), 2);
  });
});
