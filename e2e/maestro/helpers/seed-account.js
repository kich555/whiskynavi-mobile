const response = http.post("http://127.0.0.1:8787/__test/seed-account");
if (response.status !== 200) throw new Error("Isolated account seed failed");
