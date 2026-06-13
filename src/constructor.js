const TEMPLATE_12 = [
  "##......##..",
  "#......#....",
  "....#....#..",
  "...#....#...",
  "......##....",
  "##....#.....",
  ".....#....##",
  "....##......",
  "...#....#...",
  "..#....#....",
  "....#......#",
  "..##......##"
];

function extractSlots(template) {
  const slots = [];

  // across
  for (let r = 0; r < template.length; r++) {
    let start = null;

    for (let c = 0; c <= template[r].length; c++) {
      const open =
        c < template[r].length &&
        template[r][c] === ".";

      if (open && start === null) {
        start = c;
      }

      if ((!open || c === template[r].length) && start !== null) {
        const len = c - start;

        if (len >= 4 && len <= 8) {
          slots.push({
            direction: "across",
            row: r,
            col: start,
            length: len
          });
        }

        start = null;
      }
    }
  }

  return slots;
}
console.log(extractSlots(TEMPLATE_12));

const slots = extractSlots(TEMPLATE_12);

console.log(
  "Template slots:",
  slots.map(s => `${s.direction}:${s.length}`)
);

export function constructPuzzle(puzzle) {
  const size = puzzle.size || 12;

  const words = puzzle.entries
    .map(entry => ({
      ...entry,
      answer: clean(entry.answer)
    }))
    .filter(entry => entry.answer.length >= 4 && entry.answer.length <= 8);

  const templateLayout = buildTemplateLayout(words, TEMPLATE_12);

  if (
    templateLayout.entries.length >= 10 &&
    countCrossings(templateLayout.grid) >= 8
  ) {
    return {
      ...puzzle,
      entries: templateLayout.entries
    };
  }

  // fallback to existing free-placement constructor
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

function countEntryCrossings(grid, entry) {
  let crossings = 0;

  const dr = entry.direction === "down" ? 1 : 0;
  const dc = entry.direction === "across" ? 1 : 0;

  for (let i = 0; i < entry.answer.length; i++) {
    const r = entry.row + dr * i;
    const c = entry.col + dc * i;

    const hasHorizontal =
      (c > 0 && grid[r][c - 1]) ||
      (c < grid.length - 1 && grid[r][c + 1]);

    const hasVertical =
      (r > 0 && grid[r - 1][c]) ||
      (r < grid.length - 1 && grid[r + 1][c]);

    if (hasHorizontal && hasVertical) crossings++;
  }

  return crossings;
}

function weakEntryPenalty(layout) {
  let penalty = 0;

  for (const entry of layout.entries) {
    const crossings = countEntryCrossings(layout.grid, entry);

    if (crossings === 0) penalty += 300;
    if (crossings === 1) penalty += 80;
  }

  return penalty;
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

  while (progress && entries.length < 20) {
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

    if (existing && existing !== word[i]) return false;

    if (existing === word[i]) {
      crossings++;
      continue;
    }

    if (direction === "across") {
      if (inside(r - 1, c, size) && grid[r - 1][c]) return false;
      if (inside(r + 1, c, size) && grid[r + 1][c]) return false;
    } else {
      if (inside(r, c - 1, size) && grid[r][c - 1]) return false;
      if (inside(r, c + 1, size) && grid[r][c + 1]) return false;
    }
  }

  return crossings > 0;
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
  const placed = layout.entries.length;
  const crossings = countCrossings(layout.grid);
  const box = boundingBoxPenalty(layout.grid, size);
  const balance = directionBalanceBonus(layout.entries);
  const density = crossings / Math.max(1, placed);

  return (
    placed * 160 +
    crossings * 80 +
    density * 120 +
    balance -
    box * 2
  );
}
function scoreLayout(layout, size) {
  const placed = layout.entries.length;
  const crossings = countCrossings(layout.grid);
  const box = boundingBoxPenalty(layout.grid, size);
  const disconnected = disconnectedPenalty(layout.grid);
  const balance = directionBalanceBonus(layout.entries);
  const density = crossings / Math.max(1, placed);

return (
  placed * 240 +
  crossings * 120 +
  density * 200 +
  balance -
  box * 3 -
  disconnected * 500 -
  weakEntryPenalty(layout)
);
}

function directionBalanceBonus(entries) {
  const across = entries.filter(entry => entry.direction === "across").length;
  const down = entries.filter(entry => entry.direction === "down").length;
  const difference = Math.abs(across - down);

  return Math.max(0, 100 - difference * 25);
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

function buildTemplateLayout(words, template) {
  const size = template.length;
  const grid = emptyGrid(size);
  const entries = [];

  const slots = extractSlots(template)
    .sort((a, b) => b.crosses - a.crosses || b.length - a.length);

  const unused = [...words];

  for (const slot of slots) {
    const candidates = unused
      .map(word => ({
        word,
        score: scoreWordForSlot(grid, word.answer, slot)
      }))
      .filter(item => item.word.answer.length === slot.length)
      .filter(item => item.score > -Infinity)
      .sort((a, b) => b.score - a.score);

    if (!candidates.length) continue;

    const chosen = candidates[0].word;

    place(grid, chosen, slot.row, slot.col, slot.direction);

    entries.push({
      ...chosen,
      row: slot.row,
      col: slot.col,
      direction: slot.direction
    });

    const index = unused.findIndex(word => word.answer === chosen.answer);
    if (index >= 0) unused.splice(index, 1);
  }

  return { grid, entries };
}

function extractSlots(template) {
  const slots = [];
  const size = template.length;

  for (let r = 0; r < size; r++) {
    scanSlotLine(template, slots, "across", r);
  }

  for (let c = 0; c < size; c++) {
    let line = "";

    for (let r = 0; r < size; r++) {
      line += template[r][c];
    }

    scanSlotLine([line], slots, "down", c);
  }

  return slots.map(slot => ({
    ...slot,
    crosses: countTemplateCrosses(template, slot)
  }));
}

function scanSlotLine(lines, slots, direction, fixed) {
  const line = lines[0];

  let start = null;

  for (let i = 0; i <= line.length; i++) {
    const open = i < line.length && line[i] === ".";

    if (open && start === null) start = i;

    if ((!open || i === line.length) && start !== null) {
      const length = i - start;

      if (length >= 4 && length <= 8) {
        slots.push({
          direction,
          row: direction === "across" ? fixed : start,
          col: direction === "across" ? start : fixed,
          length
        });
      }

      start = null;
    }
  }
}

function countTemplateCrosses(template, slot) {
  let crosses = 0;

  const dr = slot.direction === "down" ? 1 : 0;
  const dc = slot.direction === "across" ? 1 : 0;

  for (let i = 0; i < slot.length; i++) {
    const r = slot.row + dr * i;
    const c = slot.col + dc * i;

    const hasHorizontal =
      c > 0 && c < template.length - 1 &&
      template[r][c - 1] === "." &&
      template[r][c + 1] === ".";

    const hasVertical =
      r > 0 && r < template.length - 1 &&
      template[r - 1][c] === "." &&
      template[r + 1][c] === ".";

    if (hasHorizontal && hasVertical) crosses++;
  }

  return crosses;
}

function scoreWordForSlot(grid, word, slot) {
  if (word.length !== slot.length) return -Infinity;

  const dr = slot.direction === "down" ? 1 : 0;
  const dc = slot.direction === "across" ? 1 : 0;

  let score = 0;

  for (let i = 0; i < word.length; i++) {
    const r = slot.row + dr * i;
    const c = slot.col + dc * i;
    const existing = grid[r][c];

    if (existing && existing !== word[i]) return -Infinity;

    if (existing === word[i]) score += 100;
  }

  score += word.length;

  return score;
}
