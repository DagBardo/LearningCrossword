export class CrosswordRenderer {
constructor({ gridEl, acrossEl, downEl, statusEl, metaEl, notesEl, studyContentEl, mobileInputEl }) {
    this.gridEl = gridEl;
    this.acrossEl = acrossEl;
    this.downEl = downEl;
    this.statusEl = statusEl;
    this.metaEl = metaEl;
    this.notesEl = notesEl;
    this.puzzle = null;
    this.grid = null;
    this.numbering = null;
    this.activeEntry = null;
    this.activeDirection = "across";
    this.mobileInputEl = mobileInputEl;
    this.studyContentEl = studyContentEl;
  }
getActiveEntry() {
  const selected = this.gridEl.querySelector(".cell.selected");

  if (selected) {
    const row = Number(selected.dataset.row);
    const col = Number(selected.dataset.col);

    const entriesAtCell = this.numbering.all.filter(entry =>
      this.cellBelongsToEntry(selected, entry)
    );

    if (entriesAtCell.length) {
      const preferred = entriesAtCell.find(
        entry => entry.direction === this.activeDirection
      );

      return preferred || entriesAtCell[0];
    }
  }

  return this.activeEntry;
}

cellsForEntry(entry) {
  if (!entry) return [];

  const cells = [];
  const dr = entry.direction === "down" ? 1 : 0;
  const dc = entry.direction === "across" ? 1 : 0;

  for (let i = 0; i < entry.answer.length; i++) {
    const cell = this.gridEl.querySelector(
      `.cell[data-row="${entry.row + dr * i}"][data-col="${entry.col + dc * i}"]`
    );

    if (cell) cells.push({ cell, solution: entry.answer[i] });
  }

  return cells;
}

checkWord() {
  const entry = this.activeEntry;

  if (!entry) {
    this.setStatus("Select a clue first.");
    return;
  }

  let correct = 0;
  let filled = 0;
  const cells = this.cellsForEntry(entry);

  for (const { cell, solution } of cells) {
    cell.classList.remove("correct", "incorrect");

    const value = cell.dataset.value || "";

    if (!value) continue;

    filled++;

    if (value === solution) {
      correct++;
      cell.classList.add("correct");
    } else {
      cell.classList.add("incorrect");
    }
  }

  this.setStatus(
    `${entry.number} ${entry.direction}: ${correct}/${cells.length} correct; ${filled}/${cells.length} filled.`
  );
}

revealWord() {
  const entry = this.activeEntry;

  if (!entry) {
    this.setStatus("Select a clue first.");
    return;
  }

  const cells = this.cellsForEntry(entry);

  for (const { cell, solution } of cells) {
    this.setCellValue(cell, solution);
    cell.classList.remove("incorrect");
    cell.classList.add("correct");
  }

  this.setStatus(`Revealed ${entry.number} ${entry.direction}.`);
}
  render({ puzzle, grid, numbering }) {

      this.puzzle = puzzle;
    this.grid = grid;
    this.numbering = numbering;
    this.activeEntry = null;
    this.activeDirection = "across";

    document.documentElement.style.setProperty("--grid-size", puzzle.size || 12);

    this.renderMeta();
    this.renderGrid();
    this.renderClues();
    this.renderNotes();
    this.setStatus(`Puzzle ready: ${numbering.all.length} answers.`);
}
    clearStudyPanel() {
  if (!this.studyContentEl) return;
  this.studyContentEl.textContent =
    "Click a clue to see its answer note here.";
}

renderMeta() {
    this.metaEl.textContent =
      `Topic: ${this.puzzle.title} · Difficulty: ${this.puzzle.difficulty} · Style: ${this.puzzle.style}`;
  }

renderGrid() {
    this.gridEl.innerHTML = "";

    const size = this.puzzle.size || 12;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement("div");

        cell.className = this.grid[r][c] ? "cell" : "cell inactive";
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.dataset.solution = this.grid[r][c] || "";
        cell.dataset.value = "";
        cell.tabIndex = this.grid[r][c] ? 0 : -1;

        const number = this.numbering.numbers.get(`${r},${c}`);

        if (number) {
          const marker = document.createElement("span");
          marker.className = "number";
          marker.textContent = number;
          cell.appendChild(marker);
        }

        const letter = document.createElement("span");
        letter.className = "letter";
        cell.appendChild(letter);

        cell.addEventListener("click", () => {
          this.selectCell(cell, true);
        });

        cell.addEventListener("keydown", event => {
          this.handleKeydown(event, cell);
        });

        this.gridEl.appendChild(cell);
      }
    }
if (this.mobileInputEl) {
  this.mobileInputEl.oninput = () => {
    const selected = this.gridEl.querySelector(".cell.selected");
    const value = this.mobileInputEl.value.slice(-1).toUpperCase();

    if (selected && /^[A-Z]$/.test(value)) {
      this.setCellValue(selected, value);
      this.moveFrom(selected, this.activeDirection, 1);
    }

    this.mobileInputEl.value = "";
  };
}
}

renderClues() {
  this.acrossEl.innerHTML = "";
  this.downEl.innerHTML = "";

  for (const entry of this.numbering.across) {
    this.acrossEl.appendChild(this.makeClueItem(entry));
  }

  for (const entry of this.numbering.down) {
    this.downEl.appendChild(this.makeClueItem(entry));
  }

  const allEntries = [...this.numbering.across, ...this.numbering.down];

  const handleListClick = event => {
    const li = event.target.closest("li");
    if (!li) return;

    const number = Number(li.dataset.number);
    const direction = li.dataset.direction;

    const entry = allEntries.find(
      e => e.number === number && e.direction === direction
    );

if (entry) {
  this.activeEntry = entry;
  this.activeDirection = entry.direction;
  this.highlightEntry(entry);
}
  };

  this.acrossEl.onclick = handleListClick;
  this.downEl.onclick = handleListClick;
}

makeClueItem(entry) {
  const li = document.createElement("li");

  li.dataset.number = String(entry.number);
  li.dataset.direction = entry.direction;

  li.innerHTML =
    `<span class="clue-number">${entry.number}.</span>${escapeHtml(entry.clue)}`;

  return li;
}

renderNotes() {
    this.notesEl.innerHTML = "";

    const entries = [...this.numbering.all].sort((a, b) => a.number - b.number);

    for (const entry of entries) {
      const div = document.createElement("div");
      div.className = "note";

      const direction = entry.direction === "across" ? "Across" : "Down";

      div.innerHTML = `
        <strong>${entry.number} ${direction}: ${escapeHtml(entry.answer)}</strong>
        <br>
        ${escapeHtml(entry.note || "No note supplied.")}
      `;

      this.notesEl.appendChild(div);
    }
  }

clearStudyPanel() {
    if (!this.studyContentEl) return;
    this.studyContentEl.textContent =
      "Click a clue to see its answer note here.";
  }

renderStudyPanel(entry) {
  if (!this.studyContentEl) return;

  const direction = entry.direction === "across" ? "Across" : "Down";

  this.studyContentEl.innerHTML = `
    <div class="study-answer">
      <strong>${entry.number} ${direction}</strong>
    </div>

    <div class="study-clue">
      <strong>Clue:</strong> ${escapeHtml(entry.clue)}
    </div>

    <div class="study-note">
      <strong>Note:</strong> ${escapeHtml(entry.note || "No note supplied.")}
    </div>

    <button class="reveal-study-answer" type="button">
      Reveal Answer
    </button>

    <div class="study-hidden-answer" hidden>
      <strong>Answer:</strong> ${escapeHtml(entry.answer)}
    </div>
  `;

  const button = this.studyContentEl.querySelector(".reveal-study-answer");
  const answer = this.studyContentEl.querySelector(".study-hidden-answer");

  button.addEventListener("click", () => {
    answer.hidden = false;
    button.hidden = true;
  });
}
cellBelongsToEntry(cell, entry) {
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  const dr = entry.direction === "down" ? 1 : 0;
  const dc = entry.direction === "across" ? 1 : 0;

  for (let i = 0; i < entry.answer.length; i++) {
    if (
      row === entry.row + dr * i &&
      col === entry.col + dc * i
    ) {
      return true;
    }
  }

  return false;
}

  handleKeydown(event, cell) {
    if (cell.classList.contains("inactive")) return;

    const key = event.key;

   if (/^[a-zA-Z]$/.test(key)) {
  event.preventDefault();

  this.setCellValue(cell, key.toUpperCase());

  let direction = this.activeDirection;

  if (
    this.activeEntry &&
    this.cellBelongsToEntry(cell, this.activeEntry)
  ) {
    direction = this.activeEntry.direction;
  }

  this.activeDirection = direction;
  this.moveFrom(cell, direction, 1);

  return;


}
    if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      this.setCellValue(cell, "");
      return;
    }

    if (key === "ArrowRight") {
      event.preventDefault();
      this.activeDirection = "across";
      this.moveFrom(cell, "across", 1);
      return;
    }

    if (key === "ArrowLeft") {
      event.preventDefault();
      this.activeDirection = "across";
      this.moveFrom(cell, "across", -1);
      return;
    }

    if (key === "ArrowDown") {
      event.preventDefault();
      this.activeDirection = "down";
      this.moveFrom(cell, "down", 1);
      return;
    }

    if (key === "ArrowUp") {
      event.preventDefault();
      this.activeDirection = "down";
      this.moveFrom(cell, "down", -1);
    }
  }

  setCellValue(cell, value) {
    cell.dataset.value = value;

    const letter = cell.querySelector(".letter");

    if (letter) {
      letter.textContent = value;
    }

    cell.classList.remove("correct", "incorrect");
  }

selectCell(cell, openKeyboard = true) {
  if (cell.classList.contains("inactive")) return;

  this.gridEl.querySelectorAll(".cell").forEach(item => {
    item.classList.remove("selected");
  });

  cell.classList.add("selected");
  cell.focus({ preventScroll: true });

  if (openKeyboard && this.mobileKeyboardEl) {
    this.mobileKeyboardEl.value = "";
    this.mobileKeyboardEl.focus({ preventScroll: true });
  }
}

  moveFrom(cell, direction, delta) {
    const size = this.puzzle.size || 12;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    const dr = direction === "down" ? delta : 0;
    const dc = direction === "across" ? delta : 0;

    let nextRow = row + dr;
    let nextCol = col + dc;

    while (
      nextRow >= 0 &&
      nextCol >= 0 &&
      nextRow < size &&
      nextCol < size
    ) {
      const next = this.gridEl.querySelector(
        `.cell[data-row="${nextRow}"][data-col="${nextCol}"]:not(.inactive)`
      );

      if (next) {
        this.selectCell(next);
        return;
      }

      nextRow += dr;
      nextCol += dc;
    }
  }

highlightEntry(entry) {
  this.activeEntry = entry;
  this.activeDirection = entry.direction;
  this.renderStudyPanel(entry);
    this.gridEl.querySelectorAll(".cell").forEach(cell => {
      cell.classList.remove("word");
    });

    document.querySelectorAll(".clues li").forEach(li => {
      li.classList.remove("active");
    });

    const dr = entry.direction === "down" ? 1 : 0;
    const dc = entry.direction === "across" ? 1 : 0;

    for (let i = 0; i < entry.answer.length; i++) {
      const cell = this.gridEl.querySelector(
        `.cell[data-row="${entry.row + dr * i}"][data-col="${entry.col + dc * i}"]`
      );

      if (cell) {
        cell.classList.add("word");
      }
    }

    const clueItem = document.querySelector(
      `.clues li[data-number="${entry.number}"][data-direction="${entry.direction}"]`
    );

    if (clueItem) {
      clueItem.classList.add("active");
    }

    const first = this.gridEl.querySelector(
      `.cell[data-row="${entry.row}"][data-col="${entry.col}"]`
    );

    if (first) {
     this.selectCell(first, false);
    }
  }

  check() {
    let total = 0;
    let filled = 0;
    let correct = 0;

    this.gridEl.querySelectorAll(".cell:not(.inactive)").forEach(cell => {
      cell.classList.remove("correct", "incorrect");
    });

    for (const entry of this.numbering.all) {
      const dr = entry.direction === "down" ? 1 : 0;
      const dc = entry.direction === "across" ? 1 : 0;

      for (let i = 0; i < entry.answer.length; i++) {
        const cell = this.gridEl.querySelector(
          `.cell[data-row="${entry.row + dr * i}"][data-col="${entry.col + dc * i}"]`
        );

        if (!cell) continue;

        total++;

        const value = cell.dataset.value || "";
        const solution = entry.answer[i];

        if (!value) continue;

        filled++;

        if (value === solution) {
          correct++;
          cell.classList.add("correct");
        } else {
          cell.classList.add("incorrect");
        }
      }
    }

    if (correct === total && total > 0) {
      this.setStatus(`Puzzle complete: ${correct}/${total} checked letters correct.`);
    } else {
      this.setStatus(`${correct}/${total} checked letters correct; ${filled}/${total} filled.`);
    }
  }

  reveal() {
    for (const entry of this.numbering.all) {
      const dr = entry.direction === "down" ? 1 : 0;
      const dc = entry.direction === "across" ? 1 : 0;

      for (let i = 0; i < entry.answer.length; i++) {
        const cell = this.gridEl.querySelector(
          `.cell[data-row="${entry.row + dr * i}"][data-col="${entry.col + dc * i}"]`
        );

        if (cell) {
          this.setCellValue(cell, entry.answer[i]);
          cell.classList.add("correct");
        }
      }
    }

    this.setStatus("Puzzle revealed.");
  }

  clear() {
    this.gridEl.querySelectorAll(".cell:not(.inactive)").forEach(cell => {
      this.setCellValue(cell, "");
      cell.classList.remove("correct", "incorrect");
    });

    this.setStatus("Cleared.");
  }

  setStatus(message) {
    this.statusEl.textContent = message;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
