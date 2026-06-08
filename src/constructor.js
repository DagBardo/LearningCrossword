export function constructPuzzle(puzzle) {
  const size = puzzle.size || 12;

  const words = puzzle.entries
    .map(entry => ({
      ...entry,
      answer: clean(entry.answer)
    }))
    .filter(entry => entry.answer.length >= 4 && entry.answer.length <= 10);

  const sorted = [...words].sort((a, b) => b.answer.length - a.answer.length);

  let bestLayout = null;
  const seedPool = sorted.slice(0, 12);
  const attempts = 150;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const seed = seedPool[attempt % seedPool.length];
    const direction = attempt % 2 === 0 ? "across" : "down";

    const remaining = shuffle(
      sorted.filter(word => word.answer !== seed.answer)
    );

    const layout = buildLayout([seed, ...remaining], seed, direction, size);

    if (!bestLayout || scoreLayout(layout, size) > scoreLayout(bestLayout, size)) {
      bestLayout = layout;
    }
  }

  return {
    ...puzzle,
    entries: bestLayout ? bestLayout.entries : []
  };
}

function buildLayout(words, seed, seedDirection, size) {
  const grid = emptyGrid(size);
  const entries = [];

  const seedRow =
    seedDirection === "across"
      ? Math.floor(size / 2)
      : Math.floor((size - seed.answer.length) / 2);

  const seedCol =
    seedDirection === "across"
      ? Math.floor((size - seed.answer.length) / 2)
      : Math.floor(size / 2);

  place(grid, seed, seedRow, seedCol, seedDirection);

  entries.push({
    ...seed,
    row: seedRow,
    col: seedCol,
    direction: seedDirection
  });

  let progress = true;

  while (progress && entries.length < 18) {
    progress = false;
    let bestCandidate = null;

    for (const word of words) {
      if (entries.some(entry => entry.answer === word.answer)) continue;

      const candidates = findCandidates(grid, word, size).slice(0, 6);

      for (const candidate of candidates) {
        const trialGrid = cloneGrid(grid);

        place(
          trialGrid,
          word,
          candidate.row,
          candidate.col,
          candidate.direction
        );

        const trialEntries = [
          ...entries,
          {
            ...word,
            row: candidate.row,
            col: candidate.col,
            direction: candidate.direction
          }
        ];

        const score =
          candidate.score +
          scorePartialLayout(
            {
              grid: trialGrid,
              entries: trialEntries
            },
            size
          );

        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = {
            word,
            ...candidate,
            score
          };
        }
      }
    }

    if (bestCandidate) {
      place(
        grid,
        bestCandidate.word,
        bestCandidate.row,
        bestCandidate.col,
        bestCandidate.direction
      );

      entries.push({
        ...bestCandidate.word,
        row: bestCandidate.row,
        col: bestCandidate.col,
        direction: bestCandidate.direction
      });

      progress = true;
    }
  }

  return {
    grid,
    entries
  };
}

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function findCandidates(grid, entry, size) {
  const candidates = [];

  for (let wi = 0; wi < entry.answer.length; wi++) {
    const letter = entry.answer[wi];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== letter) continue;

        for (const direction of ["across", "down"]) {
          const row = direction === "across" ? r : r - wi;
          const col = direction === "across" ? c - wi : c;

          if (canPlace(grid, entry.answer, row, col, direction, size)) {
            candidates.push({
              row,
              col,
              direction,
              score: scorePlacement(grid, entry.answer, row, col, direction, size)
            });
          }
        }
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function canPlace(grid, word, row, col, direction, size) {
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  if (row < 0 || col < 0) return false;

  const endRow = row + dr * (word.length - 1);
  const endCol = col + dc * (word.length - 1);

  if (endRow >= size || endCol >= size) return false;

  const beforeRow = row - dr;
  const beforeCol = col - dc;
  const afterRow = row + dr * word.length;
  const afterCol = col + dc * word.length;

  if (inside(beforeRow, beforeCol, size) && grid[beforeRow][beforeCol]) {
    return false;
  }

  if (inside(afterRow, afterCol, size) && grid[afterRow][afterCol]) {
    return false;
  }

  let crossings = 0;

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid[r][c];

    if (existing && existing !== word[i]) {
      return false;
    }

if (existing === word[i]) {
  crossings++;
  continue;
}

// Prevent fake extensions of across/down answers.
// A newly placed letter may not sit immediately before or after
// an existing same-row/same-column run unless it is part of this word.
if (direction === "across") {
  if (i === 0 && inside(r, c - 1, size) && grid[r][c - 1]) return false;
  if (i === word.length - 1 && inside(r, c + 1, size) && grid[r][c + 1]) return false;
} else {
  if (i === 0 && inside(r - 1, c, size) && grid[r - 1][c]) return false;
  if (i === word.length - 1 && inside(r + 1, c, size) && grid[r + 1][c]) return false;
}

  return crossings > 0;
}
if (direction === "across") {
  if (inside(r - 1, c, size) && grid[r - 1][c]) return false;
  if (inside(r + 1, c, size) && grid[r + 1][c]) return false;
} else {
  if (inside(r, c - 1, size) && grid[r][c - 1]) return false;
  if (inside(r, c + 1, size) && grid[r][c + 1]) return false;
}
function scorePlacement(grid, word, row, col, direction, size) {
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  let crossings = 0;

  for (let i = 0; i < word.length; i++) {
    if (grid[row + dr * i][col + dc * i] === word[i]) {
      crossings++;
    }
  }

  const centerRow = row + dr * Math.floor(word.length / 2);
  const centerCol = col + dc * Math.floor(word.length / 2);

  const center = Math.floor(size / 2);
  const centerPenalty =
    Math.abs(centerRow - center) + Math.abs(centerCol - center);

  return crossings * 50 - centerPenalty * 2 + word.length;
}

function scorePartialLayout(layout, size) {
  return (
    layout.entries.length * 120 +
    countCrossings(layout.grid) * 40 -
    boundingBoxPenalty(layout.grid, size)
  );
}

function scoreLayout(layout, size) {
  return (
    layout.entries.length * 200 +
    countCrossings(layout.grid) * 60 -
    boundingBoxPenalty(layout.grid, size) -
    disconnectedPenalty(layout.grid) * 100
  );
}

function countCrossings(grid) {
  let crossings = 0;
  const size = grid.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) continue;

      const hasHorizontal =
        (c > 0 && grid[r][c - 1]) ||
        (c < size - 1 && grid[r][c + 1]);

      const hasVertical =
        (r > 0 && grid[r - 1][c]) ||
        (r < size - 1 && grid[r + 1][c]);

      if (hasHorizontal && hasVertical) crossings++;
    }
  }

  return crossings;
}

function boundingBoxPenalty(grid, size) {
  let minRow = size;
  let maxRow = -1;
  let minCol = size;
  let maxCol = -1;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) continue;

      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
    }
  }

  if (maxRow === -1) return 0;

  const height = maxRow - minRow + 1;
  const width = maxCol - minCol + 1;

  return height * width;
}

function disconnectedPenalty(grid) {
  const cells = [];

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (grid[r][c]) cells.push([r, c]);
    }
  }

  if (!cells.length) return 0;

  const seen = new Set();
  const stack = [cells[0]];

  while (stack.length) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;

    if (seen.has(key)) continue;
    seen.add(key);

    for (const [nr, nc] of [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1]
    ]) {
      if (
        nr >= 0 &&
        nc >= 0 &&
        nr < grid.length &&
        nc < grid.length &&
        grid[nr][nc] &&
        !seen.has(`${nr},${nc}`)
      ) {
        stack.push([nr, nc]);
      }
    }
  }

  return cells.length - seen.size;
}

function place(grid, entry, row, col, direction) {
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  for (let i = 0; i < entry.answer.length; i++) {
    grid[row + dr * i][col + dc * i] = entry.answer[i];
  }
}

function emptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function cloneGrid(grid) {
  return grid.map(row => row.slice());
}

function clean(word) {
  return String(word || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function inside(row, col, size) {
  return row >= 0 && col >= 0 && row < size && col < size;
}
