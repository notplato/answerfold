// Test helpers: load the real extension scripts into a simulated chat page.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const src = (file) =>
  readFileSync(fileURLToPath(new URL(`../src/${file}`, import.meta.url)), "utf8");
const SCRIPTS = [src("sites.js"), src("content.js")];

/** A fake of the WebExtension APIs content.js uses, backed by a plain object. */
export function fakeBrowser(store = {}) {
  const listeners = [];
  return {
    store,
    listeners,
    storage: {
      local: {
        get: async (key) => (key in store ? { [key]: structuredClone(store[key]) } : {}),
        set: async (items) => Object.assign(store, structuredClone(items)),
        remove: async (key) => void delete store[key],
      },
    },
    runtime: { onMessage: { addListener: (fn) => listeners.push(fn) } },
    /** Simulate the background script forwarding the keyboard shortcut. */
    sendMessage: (msg) => listeners.forEach((fn) => fn(msg)),
  };
}

/**
 * Create a page at `url` with `html` in <body>, then run the extension on it.
 * Pass the same `store` to two pages to simulate a reload.
 */
export async function loadPage({
  url = "https://gemini.google.com/app/abc123",
  html = "",
  store = {},
  before,
} = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url,
    runScripts: "outside-only",
  });
  const { window } = dom;
  const browser = fakeBrowser(store);
  window.browser = browser;
  if (before) before(window);
  SCRIPTS.forEach((code) => window.eval(code));
  await settle();
  return { window, document: window.document, browser, store };
}

/** Wait for the extension's debounced scan (60 ms) and storage promises. */
export const settle = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
