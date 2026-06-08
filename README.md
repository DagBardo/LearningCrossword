# Local 12×12 Crossword Lab

A clean local-first restart.

No Netlify. No serverless functions. No OpenAI dependency yet. No placement algorithm yet.

The goal is to get the crossword UI and JSON puzzle format stable before adding generation.

## Run locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## What works now

- 12×12 grid
- static JSON-like puzzle data
- clue numbering from answer coordinates
- clickable clues
- typing into div-based cells
- check/reveal/clear
- answer notes

## File structure

```text
index.html
styles.css
src/
  app.js
  crosswordRenderer.js
  puzzleEngine.js
  puzzles.js
puzzles/
```

## Next planned step

Add an optional local script that uses the OpenAI API to generate candidate puzzle JSON files, but do not call OpenAI from the browser.

The browser app should stay static and GitHub Pages compatible.
