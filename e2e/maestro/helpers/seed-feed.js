const response = http.post("http://127.0.0.1:8787/__test/seed-feed", {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ design: true }),
});
if (response.status !== 200) throw new Error("Isolated feed seed failed");
