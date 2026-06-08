export async function onRequestPost(context) {
  return Response.json({
    title: "Cloudflare test",
    difficulty: 1,
    style: "Test",
    size: 12,
    entries: [
      {
        answer: "TEST",
        clue: "Trial word",
        note: "This confirms the Cloudflare function is responding."
      },
      {
        answer: "SITE",
        clue: "Web location",
        note: "This confirms the deployed frontend can call the backend."
      }
    ]
  });
}
