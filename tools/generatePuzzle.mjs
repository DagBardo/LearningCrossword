import fs from "fs/promises";
import path from "path";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY.");
  console.error("Run: export OPENAI_API_KEY='sk-...'");
  process.exit(1);
}

const topic = process.argv[2] || "Australia";
const difficulty = Number(process.argv[3] || 2);
const filename = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const prompt = {
  task: "Create a JSON word bank for a 12x12 educational crossword constructor.",
  topic,
  difficulty,
  requirements: [
    "Return only JSON.",
    "No markdown.",
    "12 to 16 entries.",
    "Answers must be single words, A-Z only, 3 to 10 letters.",
    "Prefer answers with shared common letters.",
    "Avoid abbreviations unless widely known.",
    "Each entry needs answer, clue, note.",
    "Do not include row, col, or direction."
  ],
  schema: {
    title: topic,
    difficulty,
    style: "Learning",
    size: 12,
    entries: [
      {
        answer: "WORD",
        clue: "Brief clue",
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
        content:
          "You generate clean JSON puzzle word banks for a crossword constructor. Return only valid JSON."
      },
      {
        role: "user",
        content: JSON.stringify(prompt)
      }
    ]
  })
});

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();
const content = data.choices[0].message.content;
const puzzle = JSON.parse(content);

await fs.mkdir("puzzles", { recursive: true });

const outPath = path.join("puzzles", `${filename}.json`);
await fs.writeFile(outPath, JSON.stringify(puzzle, null, 2));

console.log(`Created ${outPath}`);