// Kuhn-Munkres (Hungarian) algorithm: optimal one-to-one assignment in O(n^2 m).
// Used to pick the best XI: every slot gets exactly one player, every player at most one slot,
// and the total fit is as high as possible (no greedy "best player first" picking).

/**
 * Minimum-cost assignment for a rectangular matrix with rows <= columns.
 * @param {number[][]} cost  cost[row][col]
 * @returns {number[]} rowToCol
 */
export function hungarianMin(cost) {
  const n = cost.length;
  if (!n) return [];
  const m = cost[0].length;
  if (n > m) throw new Error('hungarianMin needs rows <= columns');
  const INF = Number.MAX_VALUE;
  const u = new Float64Array(n + 1);
  const v = new Float64Array(m + 1);
  const p = new Int32Array(m + 1);
  const way = new Int32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(m + 1).fill(INF);
    const used = new Uint8Array(m + 1);
    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;
      const row = cost[i0 - 1];
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = row[j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const rowToCol = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) rowToCol[p[j] - 1] = j - 1;
  return rowToCol;
}

/**
 * Maximum-value assignment for any rectangular matrix.
 * @param {number[][]} value  value[row][col]
 * @returns {{rowToCol: number[], total: number}}
 */
export function assignMax(value) {
  const rows = value.length;
  if (!rows) return { rowToCol: [], total: 0 };
  const cols = value[0].length;
  let rowToCol;
  if (rows <= cols) {
    rowToCol = hungarianMin(value.map((r) => r.map((x) => -x)));
  } else {
    const t = Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => -value[r][c]));
    const colToRow = hungarianMin(t);
    rowToCol = new Array(rows).fill(-1);
    colToRow.forEach((r, c) => {
      if (r >= 0) rowToCol[r] = c;
    });
  }
  let total = 0;
  rowToCol.forEach((c, r) => {
    if (c >= 0) total += value[r][c];
  });
  return { rowToCol, total };
}
