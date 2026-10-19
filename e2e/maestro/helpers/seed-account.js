const response = http.post("http://127.0.0.1:8787/__test/seed-account", {
  body: "{}",
  headers: { "Content-Type": "application/json" },
});
if (response.status !== 200) throw new Error("Isolated account seed failed");
