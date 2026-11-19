/*
 * AnswerFold — content script
 * Adds a fold bar above every answer in an AI chat. Click it to collapse or
 * expand that answer. Site-specific selectors live in sites.js, which the
 * manifest loads before this file.
 */
(() => {
  "use strict";

  const site = globalThis.AnswerFold && globalThis.AnswerFold.findSite(location.hostname);
  if (!site) return;
  const SELECTORS = site.selectors;
  document.documentElement.dataset.afSite = site.id;

  const api = globalThis.browser || globalThis.chrome;
  const STORAGE_PREFIX = "fold:";
  const PREVIEW_CHARS = 160;

  /** response element -> { bar, key } */
  const tracked = new Map();
  /** keys collapsed in the current conversation */
  let collapsedKeys = new Set();
  let conversationId = null;
  let fab = null;

  // ---------- helpers ----------

  const hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };

  const cleanText = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

  const currentConversationId = () => location.pathname.replace(/\/+$/, "") || "/";

  /** Find the user prompt that belongs to this answer. */
  const findQueryFor = (response) => {
    const turn = response.closest(SELECTORS.turn);
    if (turn) {
      const q = turn.querySelector(SELECTORS.query);
      if (q) return q;
    }
    let el = response.previousElementSibling;
    while (el) {
      if (el.matches(SELECTORS.query)) return el;
      const inner = el.querySelector && el.querySelector(SELECTORS.query);
      if (inner) return inner;
      el = el.previousElementSibling;
    }
    return null;
  };

  /**
   * A stable id for an answer, based on the question it replies to. Index-based
   * ids would break because chat sites lazy-load older messages at the top.
   */
  const keyFor = (response, seen) => {
    const q = findQueryFor(response);
    const text = q ? cleanText(q.querySelector(SELECTORS.queryText) || q) : "";
    const base = text ? hash(text) : "idx";
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return `${base}-${n}`;
  };

  const BLOCKS = "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, tr, div, br";

  const previewFor = (response) => {
    // Clone so we can add spaces between blocks ("Title" + "Paragraph" → "Title Paragraph").
    const clone = (response.querySelector(SELECTORS.responseText) || response).cloneNode(true);
    clone.querySelectorAll(BLOCKS).forEach((el) => el.after(" "));
    clone.querySelectorAll(".af-bar, script, style, button").forEach((el) => el.remove());
    const text = cleanText(clone);
    if (!text) return "(answer)";
    return text.length > PREVIEW_CHARS ? text.slice(0, PREVIEW_CHARS) + "…" : text;
  };

  // ---------- storage ----------

  const loadState = async () => {
    conversationId = currentConversationId();
    const storageKey = STORAGE_PREFIX + conversationId;
    try {
      const data = await api.storage.local.get(storageKey);
      collapsedKeys = new Set(data[storageKey] || []);
    } catch {
      collapsedKeys = new Set();
    }
  };

  const saveState = () => {
    const storageKey = STORAGE_PREFIX + conversationId;
    const value = [...collapsedKeys];
    const op = value.length
      ? api.storage.local.set({ [storageKey]: value })
      : api.storage.local.remove(storageKey);
    Promise.resolve(op).catch(() => {});
  };

  // ---------- UI ----------

  // Icons are built with DOM methods rather than innerHTML, which Firefox's
  // add-on review flags.
  const SVG_NS = "http://www.w3.org/2000/svg";
  const icon = (size, pathAttrs) => {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    for (const [k, v] of Object.entries(pathAttrs)) path.setAttribute(k, v);
    svg.append(path);
    return svg;
  };

  const arrowIcon = () =>
    icon(18, {
      d: "M7 10l5 5 5-5",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });

  // Material "unfold less" / "unfold more" icons.
  const collapseAllIcon = () =>
    icon(24, {
      fill: "currentColor",
      d: "M7.41 18.59 8.83 20 12 16.83 15.17 20l1.41-1.41L12 14l-4.59 4.59zm9.18-13.18L15.17 4 12 7.17 8.83 4 7.41 5.41 12 10l4.59-4.59z",
    });
  const expandAllIcon = () =>
    icon(24, {
      fill: "currentColor",
      d: "M12 5.83 15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z",
    });

  const makeBar = (response) => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "af-bar";
    const arrow = document.createElement("span");
    arrow.className = "af-arrow";
    arrow.append(arrowIcon());
    const label = document.createElement("span");
    label.className = "af-label";
    bar.append(arrow, label);
    bar.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle(response);
    });
    return bar;
  };

  const render = (response) => {
    const info = tracked.get(response);
    if (!info) return;
    const collapsed = collapsedKeys.has(info.key);
    response.classList.toggle("af-collapsed", collapsed);
    info.bar.classList.toggle("af-is-collapsed", collapsed);
    info.bar.setAttribute("aria-expanded", String(!collapsed));
    info.bar.title = collapsed ? "Expand answer" : "Collapse answer";
    const label = info.bar.querySelector(".af-label");
    const text = collapsed ? previewFor(response) : "Collapse answer";
    if (label.textContent !== text) label.textContent = text;
  };

  const setCollapsed = (response, collapsed) => {
    const info = tracked.get(response);
    if (!info) return;
    if (collapsed) collapsedKeys.add(info.key);
    else collapsedKeys.delete(info.key);
    render(response);
  };

  const toggle = (response) => {
    const info = tracked.get(response);
    if (!info) return;
    const collapsing = !collapsedKeys.has(info.key);
    setCollapsed(response, collapsing);
    saveState();
    updateFab();
    alignBars();
    // After folding a long answer, keep its bar on screen so you don't lose your place.
    if (collapsing) {
      const r = info.bar.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        info.bar.scrollIntoView({ block: "center" });
      }
    }
  };

  const toggleAll = () => {
    const responses = [...tracked.keys()];
    if (!responses.length) return;
    const anyExpanded = responses.some((r) => !collapsedKeys.has(tracked.get(r).key));
    responses.forEach((r) => setCollapsed(r, anyExpanded));
    saveState();
    updateFab();
    alignBars();
  };

  const ensureFab = () => {
    if (fab && document.body.contains(fab)) return;
    // Drop a button left behind by a previous copy of this script.
    document.querySelectorAll(".af-fab").forEach((f) => f.remove());
    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "af-fab";
    fab.addEventListener("click", toggleAll);
    document.body.appendChild(fab);
  };

  const updateFab = () => {
    ensureFab();
    const responses = [...tracked.keys()];
    fab.hidden = responses.length < 2;
    const anyExpanded = responses.some((r) => !collapsedKeys.has(tracked.get(r).key));
    const state = anyExpanded ? "collapse" : "expand";
    if (fab.dataset.state !== state) {
      fab.dataset.state = state;
      fab.replaceChildren(anyExpanded ? collapseAllIcon() : expandAllIcon());
    }
    const label = anyExpanded ? "Collapse all answers" : "Expand all answers";
    fab.title = `${label} (Alt+Shift+C)`;
    fab.setAttribute("aria-label", label);
  };

  /**
   * Put the bar directly above the answer text, inside the site's own answer
   * column, so it gets the same width, alignment and font as the answer.
   * Every element between the answer and the bar is tagged `af-path`; when
   * folded, CSS hides everything except that path and the bar.
   * Also re-attaches the bar if the site re-rendered and dropped it.
   */
  const placeBar = (response, bar) => {
    const anchor = response.querySelector(SELECTORS.anchor);
    if (anchor && anchor.parentElement) {
      if (bar.nextElementSibling !== anchor) anchor.before(bar);
    } else if (bar.parentElement !== response) {
      response.prepend(bar);
    }
    response.querySelectorAll(".af-path").forEach((el) => {
      if (!el.contains(bar)) el.classList.remove("af-path");
    });
    for (let el = bar.parentElement; el && el !== response; el = el.parentElement) {
      el.classList.add("af-path");
    }
  };

  /**
   * Line the bars up with the answer text column. Chat sites' wrappers around the
   * text can be full window width, with the text itself centred inside them,
   * so we measure where the text actually is rather than trusting the DOM.
   */
  let lastColumn = null;
  const measureColumn = (response) => {
    const own = response && response.querySelector(SELECTORS.responseText);
    const candidates = own ? [own] : [];
    candidates.push(...document.querySelectorAll(SELECTORS.responseText));
    for (const el of candidates) {
      const target = el.querySelector(".markdown") || el;
      const r = target.getBoundingClientRect();
      if (r.width > 0) return (lastColumn = { left: r.left, width: r.width });
    }
    if (lastColumn) return lastColumn;
    // Every answer is folded and we haven't seen one open yet: the prompt box
    // is centred on the same column.
    const input = document.querySelector(SELECTORS.inputBox);
    const r = input && input.getBoundingClientRect();
    return r && r.width > 0 ? { left: r.left, width: r.width } : null;
  };

  const alignBars = () => {
    for (const [response, info] of tracked) {
      const bar = info.bar;
      const parent = bar.parentElement;
      if (!parent) continue;
      const col = measureColumn(collapsedKeys.has(info.key) ? null : response);
      const p = parent.getBoundingClientRect();
      if (!col || p.width === 0) {
        bar.style.removeProperty("--af-offset");
        bar.style.removeProperty("--af-width");
        continue;
      }
      bar.style.setProperty("--af-offset", `${Math.round(col.left - p.left)}px`);
      bar.style.setProperty("--af-width", `${Math.round(col.width)}px`);
    }
  };

  // ---------- scanning ----------

  const scan = () => {
    if (currentConversationId() !== conversationId) {
      // Chat sites are single-page apps: switching chats doesn't reload the page.
      tracked.forEach((info) => info.bar.remove());
      tracked.clear();
      loadState().then(scan);
      return;
    }

    // Outermost answer elements only, in case a site nests them.
    const responses = [...document.querySelectorAll(SELECTORS.response)].filter(
      (r) => !(r.parentElement && r.parentElement.closest(SELECTORS.response)),
    );
    const seen = new Map();
    const alive = new Set(responses);

    // Remove bars we don't own: copies the site made of its own nodes, or bars
    // left by a previous copy of this script (Firefox injects a fresh copy into
    // open tabs when the extension is reloaded or updated).
    const ownBars = new Set([...tracked.values()].map((i) => i.bar));
    document.querySelectorAll(".af-bar").forEach((b) => {
      if (!ownBars.has(b)) b.remove();
    });

    for (const [response, info] of tracked) {
      if (!alive.has(response) || !response.isConnected) {
        info.bar.remove();
        tracked.delete(response);
      }
    }

    for (const response of responses) {
      const key = keyFor(response, seen);
      let info = tracked.get(response);
      if (!info) {
        info = { bar: makeBar(response), key };
        tracked.set(response, info);
      } else {
        info.key = key;
      }
      placeBar(response, info.bar);
      render(response);
    }

    alignBars();

    updateFab();
  };

  let scheduled = false;
  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;
    // A short timer (not requestAnimationFrame, which pauses in background tabs)
    // also batches the burst of mutations while an answer streams in.
    setTimeout(() => {
      scheduled = false;
      scan();
    }, 60);
  };

  // Ignore mutations we cause ourselves, otherwise we'd rescan forever.
  const isOwnNode = (n) =>
    n.nodeType === 1 && (n.classList.contains("af-bar") || n.classList.contains("af-fab"));

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.target.nodeType === 1 && m.target.closest(".af-bar, .af-fab")) continue;
      const nodes = [...m.addedNodes, ...m.removedNodes];
      if (nodes.length && nodes.every(isOwnNode)) continue;
      scheduleScan();
      return;
    }
  });

  window.addEventListener("resize", scheduleScan);

  api.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "toggle-all") toggleAll();
  });

  loadState().then(() => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
