export async function onRequestPost(context) {
  const apiKey = context.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY not set in Cloudflare." },
      { status: 500 }
    );
  }

  const body = await context.request.json().catch(() => ({}));
  const userTopic = String(body.topic || "").trim();
  const difficulty = Number(body.difficulty || 3);

  const promptTopic =
    userTopic || "Choose an interesting educational topic and focused theme.";

  const topicRoot = userTopic.toUpperCase().replace(/[^A-Z]/g, "");

  const difficultyRules = {
    1: { label: "easy", clueStyle: "direct definition clues using familiar language", noteStyle: "simple one-sentence explanations" },
    2: { label: "gentle", clueStyle: "mostly direct clues with mild indirection", noteStyle: "brief educational notes" },
    3: { label: "medium", clueStyle: "knowledge-based clues requiring moderate subject familiarity", noteStyle: "substantive one-sentence notes" },
    4: { label: "hard", clueStyle: "indirect clues requiring topic knowledge", noteStyle: "compact but intellectually specific notes" },
    5: { label: "fiendish", clueStyle: "indirect, allusive, or contextual clues; avoid simple definitions", noteStyle: "dense notes that explain why the concept matters" }
  };

  const rule = difficultyRules[difficulty] || difficultyRules[3];

  const prompt = {
    task: "Create a themed educational crossword word bank. Choose a focused subtheme within the requested topic.",
    topic: promptTopic,
    difficulty,
    difficulty_label: rule.label,
    clue_style: rule.clueStyle,
    note_style: rule.noteStyle,
    requirements: [
      "Return only valid JSON.",
      "No markdown.",
      "Choose a focused theme.",
      "Return both topic and theme.",
      "The theme should be narrower than the topic.",
      "Return 35 to 45 candidate entries.",
      "Difficulty should mostly affect clue wording and note sophistication, not answer length.",
      "Each answer must be a complete real word or complete proper name.",
      "Answers must be single words, A-Z only, 4 to 8 letters.",
      "Prefer answers of 4 to 7 letters.",
      "Use 8-letter answers sparingly.",
      "Never truncate, abbreviate, stem, or shorten an answer.",
      "Never use prefixes of longer words.",
      "If a term is longer than 8 letters, choose a different complete word.",
      "Every answer must look like a complete word to a human solver.",
      "Never use a fragment of the topic name as an answer.",
      "Each entry needs answer, clue, note.",
      "Notes must not contain the answer word.",
      "Notes must not repeat the answer directly or indirectly.",
      "Notes should explain significance, context, history, or usage without naming the answer."
    ],
    schema: {
      topic: "Broad topic",
      theme: "Focused subtheme",
      title: "Topic: Theme",
      difficulty,
      style: `Learning - ${rule.label}`,
      size: 12,
      entries: [
        {
          answer: "WORD",
          clue: "Clue appropriate to difficulty",
          note: "Educational note that does not reveal the answer",
          difficulty: "easy | medium | hard"
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
      model: context.env.OPENAI_MODEL || "gpt-4o-mini",
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
    const text = await response.text();
    return Response.json(
      { error: `OpenAI API error: ${text}` },
      { status: 500 }
    );
  }

  const data = await response.json();
  let puzzle;

  try {
    puzzle = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch {
    return Response.json(
      { error: "OpenAI returned invalid JSON." },
      { status: 500 }
    );
  }

  puzzle.topic = cleanLabel(puzzle.topic || userTopic || "Surprise topic");
  puzzle.theme = cleanLabel(puzzle.theme || "Selected theme");

  if (!puzzle.theme || puzzle.theme.toLowerCase() === "theme") {
  puzzle.theme = "Selected theme";
}

 puzzle.title = cleanLabel(puzzle.title || `${puzzle.topic}: ${puzzle.theme}`);
  
 puzzle.topic = cleanLabel(puzzle.topic);
 puzzle.theme = cleanLabel(puzzle.theme);

if (!puzzle.topic || /^topic$/i.test(puzzle.topic) || /^theme$/i.test(puzzle.topic)) {
  puzzle.topic = userTopic || "Surprise topic";
}

if (!puzzle.theme || /^theme$/i.test(puzzle.theme) || /^selected theme$/i.test(puzzle.theme)) {
  puzzle.theme = "Selected theme";
}

puzzle.title = `${puzzle.topic}: ${puzzle.theme}`;
  puzzle.difficulty = puzzle.difficulty || difficulty;
  puzzle.style = puzzle.style || `Learning - ${rule.label}`;
  puzzle.size = 12;
  puzzle.entries = Array.isArray(puzzle.entries) ? puzzle.entries : [];

  const banned = new Set([
    "FOLKLO", "SYMPHO", "SONGWR", "ARPEGG", "CRESC",
    "FALSTA", "MALVOL", "INTERV", "MEDITA", "MINDFULL",
    "MIDSUM", "COMED", "CROCOD", "KOOKAB", "KOOKA",
    "KANGAR", "WALLAB", "BANDIC", "REGOLI", "LUNARY",
    "WOMBA", "SOVERE", "RENAI", "ELOQUEN", "ETYMOS"
  ]);

  puzzle.entries = puzzle.entries
    .map(entry => {
      const answer = String(entry.answer || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "");

      return {
        answer,
        clue: String(entry.clue || "").trim(),
        note: String(entry.note || "").trim(),
        difficulty: String(entry.difficulty || "").trim()
      };
    })
    .filter(entry => entry.answer.length >= 4)
    .filter(entry => entry.answer.length <= 8)
    .filter(entry => !banned.has(entry.answer))
    .filter(entry => !isTopicFragment(entry.answer, topicRoot))
    .filter(entry => !isLikelyFragment(entry))
    .filter(entry => entry.clue)
    .filter(entry => entry.note);

puzzle.entries = await validateEntriesWithOpenAI({
  apiKey,
  entries: puzzle.entries
});
  
  for (const entry of puzzle.entries) {
    if (entry.note.toUpperCase().includes(entry.answer)) {
      entry.note =
        "This concept is important to the topic. Reveal the answer to learn more.";
    }
  }

  puzzle.entries.sort((a, b) => {
    return wordQualityScore(b.answer) - wordQualityScore(a.answer);
  });

  return Response.json(puzzle);
}

export async function onRequestGet() {
  return Response.json({
    status: "ok",
    service: "learning-crossword"
  });
}

function isTopicFragment(answer, topicRoot) {
  if (!topicRoot) return false;

  return (
    topicRoot.length > answer.length + 2 &&
    topicRoot.startsWith(answer)
  );
}

function isLikelyFragment(entry) {
  const answer = entry.answer.toUpperCase();

  const text = `${entry.clue} ${entry.note}`
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ");

  const words = text.match(/[A-Z]+/g) || [];

  return words.some(
    word =>
      word.length > answer.length &&
      word.startsWith(answer) &&
      word.length - answer.length >= 2
  );
}

function wordQualityScore(word) {
  const length = word.length;
  const vowels = [...word].filter(ch => "AEIOU".includes(ch)).length;
  const commonLengthBonus = length >= 4 && length <= 7 ? 10 : 0;
  const eightLetterPenalty = length === 8 ? -2 : 0;

  return commonLengthBonus + vowels + eightLetterPenalty;
}
function cleanLabel(value) {
  return String(value || "")
    .replace(/^topic:\s*/i, "")
    .replace(/^theme:\s*/i, "")
    .trim();
}
async function validateEntriesWithOpenAI({ apiKey, entries }) {
  if (!entries.length) return entries;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict crossword answer validator. Remove invalid answers. Return only valid JSON."
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Remove any entry whose answer is not a complete real dictionary word or complete proper name.",
            rules: [
              "Reject truncated words.",
              "Reject stems, prefixes, fragments, abbreviations, and invented forms.",
              "Reject answers like CULTUR, RENAI, SOVERE, KANGAR, WALLAB, REGOLI, ELOQUEN.",
              "Keep valid complete words and proper names.",
              "Do not rewrite answers.",
              "Do not add new entries."
            ],
            schema: {
              entries: [
                {
                  answer: "WORD",
                  clue: "clue",
                  note: "note"
                }
              ]
            },
            entries
          })
        }
      ]
    })
  });

  if (!response.ok) {
    return entries;
  }

  try {
    const data = await response.json();
    const validated = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    if (!Array.isArray(validated.entries)) return entries;

    return validated.entries
      .map(entry => ({
        answer: String(entry.answer || "")
          .toUpperCase()
          .replace(/[^A-Z]/g, ""),
        clue: String(entry.clue || "").trim(),
        note: String(entry.note || "").trim()
      }))
      .filter(entry => entry.answer.length >= 4)
      .filter(entry => entry.answer.length <= 8)
      .filter(entry => entry.clue)
      .filter(entry => entry.note);
  } catch {
    return entries;
  }
}
