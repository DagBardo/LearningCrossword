export async function onRequestPost(context) {
  const apiKey = context.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY not set in Cloudflare." },
      { status: 500 }
    );
  }
 
  const body = await context.request.json().catch(() => ({}));
  const topic = body.topic?.trim();
  const topicRoot = topic
  .toUpperCase()
  .replace(/[^A-Z]/g, "");
  const difficulty = Number(body.difficulty || 2);
  const promptTopic =
    topic || "Choose an interesting educational topic and focused theme.";
  const difficultyRules = {
    1: {
      label: "easy",
      answerStyle: "common, concrete, familiar terms",
      clueStyle: "direct definition clues",
      noteStyle: "simple one-sentence explanations",
      answerLength: "prefer 4 to 7 letters; 8 letters only when necessary"
    },
    2: {
      label: "gentle",
      answerStyle: "familiar terms plus a few topic-specific terms",
      clueStyle: "mostly direct clues with mild indirection",
      noteStyle: "brief educational notes",
      answerLength: "prefer 4 to 7 letters; 8 letters only when necessary"
    },
    3: {
      label: "medium",
      answerStyle: "topic-specific terms, names, concepts, and places",
      clueStyle: "knowledge-based clues, not giveaway clues",
      noteStyle: "substantive one-sentence notes",
      answerLength: "prefer 4 to 7 letters; 8 letters only when necessary"
    },
    4: {
      label: "hard",
      answerStyle: "specialized, less obvious, or historically specific terms",
      clueStyle: "indirect clues requiring topic knowledge",
      noteStyle: "compact but intellectually specific notes",
      answerLength: "prefer 4 to 7 letters; 8 letters only when necessary"
    },
    5: {
      label: "fiendish",
      answerStyle: "obscure, specialist, allusive, or second-order topic terms",
      clueStyle: "indirect, elliptical, or allusive clues; avoid simple definitions",
      noteStyle: "dense notes that explain why the term matters",
      answerLength: "prefer 4 to 7 letters; 8 letters only when necessary"
    }
  };

  const rule = difficultyRules[difficulty] || difficultyRules[3];

  const prompt = {
    task: task: "Create a themed educational crossword word bank. Choose a focused subtheme within the requested topic.",
    topic,
    difficulty,
    difficulty_label: rule.label,
    answer_style: rule.answerStyle,
    clue_style: rule.clueStyle,
    note_style: rule.noteStyle,
    answer_length: rule.answerLength,
    requirements: [
      "Return only .",
      "No markdown.",
      "Choose a focused theme within the topic.",
      "Return a title that combines the topic and chosen theme.",
      "Return 35 to 45 candidate entries.",
      "Each answer must be a complete real word or complete proper name.",
      "Do not truncate, abbreviate, stem, or shorten any answer.",
      "Difficulty should mostly affect clue indirectness and note sophistication, not answer length.",
      "Use mostly answers of 4 to 8 letters.",
      "Prefer short complete alternatives over fragments of long terms.",
      "Answers must be real, complete dictionary words or complete proper names.",
      "Answers must be complete single words, A-Z only, 4 to 8 letters.",
      "Prefer answers of 4 to 7 letters.",
      "Use 8-letter answers sparingly.",
      "Do not shorten longer words to meet the length limit.",
      "If a term is longer than 8 letters, choose a different complete word.",
      "Bad answers include: FOLKLO, SYMPHO, SONGWR, ARPEGG, CRESC, FALSTA, MALVOL, INTERV, MEDITA, MINDFULL.",
      "Good alternatives include: FOLK, SONG, LYRIC, CHORD, SCALE, SONATA, FUGUE, TIMBRE, MELODY, RHYTHM.",
      "Each entry needs answer, clue, note.",
      "Notes must not contain the answer word.",
      "Notes must not repeat the answer directly or indirectly.",
      "Notes should explain significance, context, history, or usage without naming the answer.",
      "Bad note: 'Sangha is one of the Three Jewels of Buddhism.'",
      "Do not shorten play titles, genres, names, or concepts. For example, do not use MIDSUM for Midsummer or COMED for comedy.",
      "Every answer must be a complete accepted word or complete proper name, not a prefix.",
     "Never use prefixes of longer words.",
     "Bad answers include: KANGAR, KOOKA, WALLAB, BANDIC, REGOLI, LUNARY.",
     "Good alternatives include complete words such as DINGO, KOALA, EMU, OPAL, REEF, BILBY, FROG, FISH.",
     "Every answer must look like a complete word to a human solver."
    ],
   schema: {
  title: `${topic}: chosen subtheme`,
  topic,
  theme: "Focused subtheme chosen by the model",
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/"
    },
    body: .stringify({
      model: context.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate clean  puzzle word banks for a crossword constructor. Return only valid ."
        },
        {
          role: "user",
          content: .stringify(prompt)
        }
      ]
    })
  });

  if (!response.ok) 
  {
    
  const text = await response.text();
    return Response.(
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
  
console.log(
  "Raw entries from OpenAI:",
  puzzle.entries?.length || 0
);
  
  puzzle.title = puzzle.title || topic;
  puzzle.difficulty = puzzle.difficulty || difficulty;
  puzzle.style = puzzle.style || `Learning - ${rule.label}`;
  puzzle.size = 12;
  puzzle.entries = Array.isArray(puzzle.entries) ? puzzle.entries : [];

 const banned = new Set([
  "FOLKLO",
  "SYMPHO",
  "SONGWR",
  "ARPEGG",
  "CRESC",
  "FALSTA",
  "MALVOL",
  "INTERV",
  "MEDITA",
  "MINDFULL",
  "MIDSUM",
  "COMED",
  "CROCOD",
  "KOOKAB",
  "KOOKA",
  "KANGAR",
  "WALLAB",
  "BANDIC",
  "REGOLI",
  "LUNARY",
  "WOMBA",
  "SOVERE"
]);

function isTopicFragment(answer, topicRoot) {
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

  return words.some(word =>
    word.length > answer.length &&
    word.startsWith(answer) &&
    word.length - answer.length >= 2
  );
}

function hasSuspiciousEnding(answer) {
  return [
    "AR",   // KANGAR
    "AB",   // WALLAB
    "IC",   // BANDIC
    "LI",   // REGOLI
    "BA",   // REDBA
    "KA"    // KOOKA
  ].some(suffix => answer.endsWith(suffix));
}
  
  puzzle.entries = puzzle.entries
    .map(entry => {
      const answer = String(entry.answer || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "");

      return {
        answer,
        clue: String(entry.clue || "").trim(),
        note: String(entry.note || "").trim()
      };
    })
.filter(entry => entry.answer.length >= 4)
.filter(entry => entry.answer.length <= 8)
.filter(entry => !banned.has(entry.answer))
.filter(entry => !isTopicFragment(entry.answer, topicRoot))
.filter(entry => !isLikelyFragment(entry))
// .filter(entry => !hasSuspiciousEnding(entry.answer))
.filter(entry => entry.clue)
.filter(entry => entry.note);

  for (const entry of puzzle.entries) {
    if (entry.note.toUpperCase().includes(entry.answer)) {
      entry.note =
        "This concept is important to the topic. Reveal the answer to learn more.";
    }
  }
console.log(
  "Entries after filtering:",
  puzzle.entries.length
);
  return Response.json(puzzle);
}

export async function onRequestGet() {
  return Response.json({
    status: "ok",
    service: "learning-crossword"
  });
}

