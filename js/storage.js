// localStorage with a safe in-memory fallback (private mode, blocked storage, corrupt JSON).
const PREFIX = "pol:";
const memory = new Map();

function backend() {
  try {
    const k = `${PREFIX}__probe`;
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return null;
  }
}
const store = backend();

export const persistent = Boolean(store);

export function load(key, fallback) {
  try {
    const raw = store ? store.getItem(PREFIX + key) : memory.get(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (store) store.setItem(PREFIX + key, raw);
    else memory.set(key, raw);
  } catch {
    memory.set(key, raw);
  }
}

export function remove(key) {
  try {
    store?.removeItem(PREFIX + key);
  } catch {}
  memory.delete(key);
}
