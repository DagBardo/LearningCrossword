export function buildGridFromEntries(puzzle) {
  const size = puzzle.size || 12;
  const grid = Array.from({ length: size }, () => Array(size).fill(null));

  for (const entry of puzzle.entries) {
    const word = cleanAnswer(entry.answer);
    const dr = entry.direction === "down" ? 1 : 0;
    const dc = entry.direction === "across" ? 1 : 0;

    for (let i = 0; i < word.length; i++) {
      const r = entry.row + dr * i;
      const c = entry.col + dc * i;

      if (r < 0 || c < 0 || r >= size || c >= size) {
        throw new Error(`${word} runs outside the grid`);
      }

      if (grid[r][c] && grid[r][c] !== word[i]) {
        throw new Error(`${word} conflicts at row ${r}, col ${c}`);
      }

      grid[r][c] = word[i];
    }
  }

  return grid;
}

export function numberEntries(entries) {
  const numbers = new Map();
  let nextNumber = 1;

  const sorted = [...entries].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const numbered = sorted.map(entry => {
    const key = `${entry.row},${entry.col}`;
    if (!numbers.has(key)) numbers.set(key, nextNumber++);
    return { ...entry, answer: cleanAnswer(entry.answer), number: numbers.get(key) };
  });

  return {
    numbers,
    across: numbered.filter(e => e.direction === "across").sort((a, b) => a.number - b.number),
    down: numbered.filter(e => e.direction === "down").sort((a, b) => a.number - b.number),
    all: numbered
  };
}

export function cleanAnswer(answer) {
  return String(answer || "").toUpperCase().replace(/[^A-Z]/g, "");
}
