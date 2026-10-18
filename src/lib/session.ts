import { E2E_MODE } from "./runtime-config";
import { storage } from "./storage";
export type Tokens = { accessToken: string; refreshToken: string };
let tokens: Tokens | null = null;
let generation = 0;
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
export const session = {
  get: () => tokens,
  generation: () => generation,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  async restore() {
    if (E2E_MODE) {
      await storage.remove("wn.session");
      return;
    }
    const started = generation;
    const value = await storage.get("wn.session");
    if (started !== generation || !value) return;
    try {
      const parsed = JSON.parse(value);
      if (
        typeof parsed.accessToken === "string" &&
        parsed.accessToken &&
        typeof parsed.refreshToken === "string" &&
        parsed.refreshToken
      )
        tokens = parsed;
    } catch {
      await storage.remove("wn.session");
    }
    listeners.forEach((listener) => listener());
  },
  async set(value: Tokens | null) {
    generation += 1;
    tokens = value;
    listeners.forEach((listener) => listener());
    writes = writes
      .catch(() => {})
      .then(() =>
        value
          ? storage.set("wn.session", JSON.stringify(value))
          : storage.remove("wn.session"),
      );
    await writes;
  },
};
