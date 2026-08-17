// Fournit window.storage : Electron s'il est présent, sinon localStorage.
if (!window.storage) {
  window.storage = window.electronStorage || {
    async get(key) { const v = localStorage.getItem(key); if (v === null) throw new Error("not found"); return { key, value: v }; },
    async set(key, value) { localStorage.setItem(key, value); return { key, value }; },
    async delete(key) { localStorage.removeItem(key); return { key, deleted: true }; },
    async list(prefix = "") { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)), prefix }; },
  };
}
