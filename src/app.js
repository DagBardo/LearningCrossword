import { buildGridFromEntries, numberEntries } from "./puzzleEngine.js";
import { CrosswordRenderer } from "./crosswordRenderer.js";
import { constructPuzzle } from "./constructor.js";
mobileKeyBoard: document.getElementById("mobileKeyBoard")

const els = {
  topicInput: document.getElementById("topicInput"),
  difficultySelect: document.getElementById("difficultySelect"),
  generateBtn: document.getElementById("generateBtn"),
  checkBtn: document.getElementById("checkBtn"),
  revealBtn: document.getElementById("revealBtn"),
  clearBtn: document.getElementById("clearBtn"),
  grid: document.getElementById("grid"),
  acrossClues: document.getElementById("acrossClues"),
  downClues: document.getElementById("downClues"),
  status: document.getElementById("status"),
  meta: document.getElementById("meta"),
  metrics: document.getElementById("metrics"),
  answerNotes: document.getElementById("answerNotes"),
  topicHistory: document.getElementById("topicHistory"),
  checkWordBtn: document.getElementById("checkWordBtn"),
  revealWordBtn: document.getElementById("revealWordBtn"),
  mobileKeyBoard: document.getElementById("mobileKeyBoard"),
  studyContent: document.getElementById("studyContent")
};
mobileKeyboardEl: els.mobileKeyboard
const renderer = new CrosswordRenderer({
  gridEl: els.grid,
  acrossEl: els.acrossClues,
  downEl: els.downClues,
  statusEl: els.status,
  metaEl: els.meta,
  notesEl: els.answerNotes,
  studyContentEl: els.studyContent,
  mobileKeyBoardEl: els.mobileKeyBoard
});

function setBusy(isBusy) {
  els.generateBtn.disabled = isBusy;
  els.generateBtn.textContent = isBusy ? "Generating..." : "Generate Puzzle";
}

function getTopicHistory() {
  try {
    return JSON.parse(localStorage.getItem("topicHistory") || "[]");
  } catch {
    return [];
  }
}

function saveTopicToHistory(topic) {
  const normalized = topic.trim();
  if (!normalized) return;

  const existing = getTopicHistory();

  const updated = [
    normalized,
    ...existing.filter(
      item => item.toLowerCase() !== normalized.toLowerCase()
    )
  ].slice(0, 8);

  localStorage.setItem("topicHistory", JSON.stringify(updated));
  renderTopicHistory();
}

function renderTopicHistory() {
  if (!els.topicHistory) return;

  const topics = getTopicHistory();

  els.topicHistory.innerHTML = "";

  if (!topics.length) {
    els.topicHistory.textContent = "No recent topics yet.";
    return;
  }

  for (const topic of topics) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "history-button";
    button.textContent = topic;

    button.addEventListener("click", () => {
      els.topicInput.value = topic;
      generatePuzzle();
    });

    els.topicHistory.appendChild(button);
  }
}
function restoreLastTopic() {
  const topics = getTopicHistory();

  if (topics.length && !els.topicInput.value.trim()) {
    els.topicInput.value = topics[0];
  }
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

function renderMetrics({ sourcePuzzle, puzzle, grid }) {
  if (!els.metrics) return;

  const supplied = sourcePuzzle.entries.length;
  const placed = puzzle.entries.length;
  const unused = supplied - placed;
  const crossings = countCrossings(grid);

  let quality = "Sparse";

  if (placed >= 10 && crossings >= 8) {
    quality = "Good";
  }

  if (placed >= 12 && crossings >= 12) {
    quality = "Strong";
  }

const placedAnswers = new Set(
  puzzle.entries.map(entry =>
    String(entry.answer)
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
  )
);

const unusedWords = sourcePuzzle.entries
  .map(entry =>
    String(entry.answer)
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
  )
  .filter(answer => !placedAnswers.has(answer));

  els.metrics.innerHTML = `
    <div>
      <strong>Quality:</strong> ${quality}
      · <strong>Words supplied:</strong> ${supplied}
      · <strong>Words placed:</strong> ${placed}
      · <strong>Unused:</strong> ${unused}
      · <strong>Crossings:</strong> ${crossings}
    </div>
    <div style="margin-top: 8px;">
      <strong>Unused words:</strong> ${
        unusedWords.length ? unusedWords.join(", ") : "None"
      }
    </div>
  `;
}

async function generatePuzzle() {
  const topic = els.topicInput.value.trim() || "General knowledge";
  const difficulty = Number(els.difficultySelect.value);

  saveTopicToHistory(topic);

  setBusy(true);
  els.status.textContent = `Generating puzzle for “${topic}”...`;
  if (els.metrics) els.metrics.textContent = "";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ topic, difficulty })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    const sourcePuzzle = await response.json();
    const puzzle = constructPuzzle(sourcePuzzle);
    const grid = buildGridFromEntries(puzzle);
    const numbering = numberEntries(puzzle.entries);

    renderer.render({ puzzle, grid, numbering });
    renderMetrics({ sourcePuzzle, puzzle, grid });
  } catch (error) {
    console.error(error);
    els.status.textContent = `Could not generate puzzle: ${error.message}`;
  } finally {
    setBusy(false);
  }
}
renderTopicHistory();
restoreLastTopic();
generatePuzzle();

els.generateBtn.addEventListener("click", generatePuzzle);
els.checkBtn.addEventListener("click", () => renderer.check());
els.revealBtn.addEventListener("click", () => renderer.reveal());
els.clearBtn.addEventListener("click", () => renderer.clear());
els.checkWordBtn.addEventListener("click", () => renderer.checkWord());
els.revealWordBtn.addEventListener("click", () => renderer.revealWord());
renderTopicHistory();
generatePuzzle();
