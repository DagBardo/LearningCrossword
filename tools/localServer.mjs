import http from "http";
import fs from "fs/promises";
import path from "path";

const PORT = 8000;
const ROOT = process.cwd();

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json"
};

http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/generate" && req.method === "POST") {
      return await handleGenerate(req, res);
    }

    let filePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    filePath = path.join(ROOT, filePath);

    const ext = path.extname(filePath);
    const data = await fs.readFile(filePath);

    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "text/plain"
    });

    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(PORT, () => {
  console.log(`Local crossword server running at http://localhost:${PORT}`);
});

async function handleGenerate(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "OPENAI_API_KEY not set" }));
    return;
  }

  const body = await readJson(req);
  const topic = body.topic || "General knowledge";
  const difficulty = Number(body.difficulty || 2);

const difficultyRules = {
  1: {
    label: "easy",
    answerStyle: "common, concrete, familiar terms",
    clueStyle: "direct definition clues",
    noteStyle: "simple one-sentence explanations",
    answerLength: "mostly 3 to 6 letters"
  },
  2: {
    label: "gentle",
    answerStyle: "familiar terms plus a few topic-specific terms",
    clueStyle: "mostly direct clues with mild indirection",
    noteStyle: "brief educational notes",
    answerLength: "mostly 4 to 7 letters"
  },
  3: {
    label: "medium",
    answerStyle: "topic-specific terms, names, concepts, and places",
    clueStyle: "knowledge-based clues, not giveaway clues",
    noteStyle: "substantive one-sentence notes",
    answerLength: "mostly 5 to 8 letters"
  },
  4: {
    label: "hard",
    answerStyle: "specialized, less obvious, or historically specific terms",
    clueStyle: "indirect clues requiring topic knowledge",
    noteStyle: "compact but intellectually specific notes",
    answerLength: "mostly 6 to 9 letters"
  },
  5: {
    label: "fiendish",
    answerStyle: "obscure, specialist, allusive, or second-order topic terms",
    clueStyle: "indirect, elliptical, or allusive clues; avoid simple definitions",
    noteStyle: "dense notes that explain why the term matters",
    answerLength: "mostly 6 to 10 letters"
  }
};

const rule = difficultyRules[difficulty] || difficultyRules[3];

const entryCountByDifficulty = {
  1: "18 to 24 entries.",
  2: "20 to 26 entries.",
  3: "22 to 28 entries.",
  4: "26 to 32 entries.",
  5: "30 to 36 entries."
};

const prompt = {
  task: "Create a JSON word bank for a 12x12 educational crossword constructor.",
  topic,
  difficulty,
  difficulty_label: rule.label,
  answer_style: rule.answerStyle,
  clue_style: rule.clueStyle,
  note_style: rule.noteStyle,
  answer_length: rule.answerLength,
  requirements: [
    "Return only JSON.",
    "No markdown.",
    entryCountByDifficulty[difficulty] || "22 to 28 entries.",
  "Answers must be real, complete dictionary words or complete proper names.",
"Never truncate a word to fit the length limit.",
"Never use fragments, stems, abbreviations, or partial words.",
"Bad answers include: FOLKLO, SYMPHO, SONGWR, ARPEGG, CRESC, FALSTA, MALVOL.",
"Good alternatives include: FOLK, SONG, LYRIC, CHORD, SCALE, SONATA, FUGUE, TIMBRE, MELODY, RHYTHM.",
"If a relevant term is too long, choose a shorter complete related term.",
"Answers must be complete single words, A-Z only, 4 to 8 letters.",
"Notes must not contain the answer word.",
"Notes must not repeat the answer directly or indirectly.",
"Notes should explain significance, context, history, or usage without naming the answer.",
"Bad note: 'Sangha is one of the Three Jewels of Buddhism.'",
"Good note: 'One of the Three Jewels, referring to the community of practitioners.'",
 "Each entry needs answer, clue, note.",
  "Notes must not contain the answer word.",
  "Notes must not repeat the answer directly.",
  "Notes should explain significance or context without naming the answer.",
"Prefer answers of 4 to 7 letters."
  ],
  schema: {
    title: topic,
    difficulty,
    style: `Learning - ${rule.label}`,
    size: 12,
    entries: [
      {
        answer: "WORD",
        clue: "Brief clue appropriate to difficulty",
        note: "Short educational note"
      }
    ]
  }
};
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You generate clean JSON puzzle word banks for a crossword constructor. Return only valid JSON."
        },
        {
          role: "user",
          content: JSON.stringify(prompt)
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: text }));
    return;
  }

  const data = await response.json();
  const puzzle = JSON.parse(data.choices[0].message.content);
  
  for (const entry of puzzle.entries) {
  if (!entry.note) continue;

  const answer = String(entry.answer || "").toUpperCase();

  if (entry.note.toUpperCase().includes(answer)) {
    entry.note =
      "This concept is important to the topic. Reveal the answer to learn more.";
  }
}
  
  puzzle.entries = puzzle.entries.filter(entry => {
  const answer = String(entry.answer || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  if (answer.length < 4 || answer.length > 9) return false;

  const banned = [
    "FOLKLO",
    "SYMPHO",
    "SONGWR",
    "ARPEGG",
    "CRESC",
    "FALSTA",
    "MEDITA",
    "MALVOL"
  ];

  if (banned.includes(answer)) return false;

  entry.answer = answer;
  return true;
});

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(puzzle));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (error) {
        reject(error);
      }
    });
  });
}