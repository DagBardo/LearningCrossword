const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("OPENAI_API_KEY not set");
  process.exit(1);
}

const response = await fetch(
  "https://api.openai.com/v1/models",
  {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  }
);

console.log("Status:", response.status);

const data = await response.json();

console.log(
  data.data
    .slice(0, 10)
    .map(m => m.id)
);