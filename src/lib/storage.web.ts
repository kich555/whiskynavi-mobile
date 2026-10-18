// Web preview intentionally keeps credentials in memory, never localStorage.
const values = new Map<string, string>();
export const storage = {
  get: async (key: string) => values.get(key) ?? null,
  set: async (key: string, value: string) => {
    values.set(key, value);
  },
  remove: async (key: string) => {
    values.delete(key);
  },
};
