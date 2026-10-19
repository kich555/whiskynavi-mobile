const stateResponse = http.get("http://127.0.0.1:8787/__test/state");
const cleanupResponse = http.post("http://127.0.0.1:8787/__test/dispose", {
  body: "{}",
  headers: { "Content-Type": "application/json" },
});
if (stateResponse.status !== 200 || cleanupResponse.status !== 200)
  throw new Error("Native fixture verification or cleanup failed");
const state = json(stateResponse.body);
if (!Array.isArray(state.unhandled) || state.unhandled.length)
  throw new Error(
    "Unhandled native API requests: " + JSON.stringify(state.unhandled),
  );
