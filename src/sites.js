/*
 * AnswerFold — supported sites.
 *
 * Each entry tells the content script how to find answers on one chat site.
 * To support a new site:
 *   1. Add an entry here.
 *   2. Add the site's URL pattern to `content_scripts.matches` in manifest.json.
 *   3. Add a fixture and tests (see CONTRIBUTING.md).
 *
 * When a site changes its layout and AnswerFold stops working there, the
 * selectors below are almost always what needs updating.
 */
(() => {
  "use strict";

  const SITES = [
    {
      id: "gemini",
      name: "Gemini",
      hosts: ["gemini.google.com"],
      selectors: {
        // One element per answer.
        response: "model-response",
        // The user's prompt that an answer replies to.
        query: "user-query",
        // Where the prompt's text lives inside `query` (falls back to the whole element).
        queryText: ".query-text",
        // Where the answer's text lives inside `response` (falls back to the whole element).
        responseText: "message-content, .markdown",
        // The fold bar is inserted just before this element inside the answer.
        anchor: "message-content",
        // The prompt box; used to find the chat column when every answer is folded.
        inputBox: "input-area-v2, input-container",
        // Wrapper around one question + answer pair (optional).
        turn: ".conversation-container",
      },
    },
  ];

  const findSite = (hostname) =>
    SITES.find((site) => site.hosts.some((h) => hostname === h || hostname.endsWith("." + h))) ||
    null;

  globalThis.AnswerFold = Object.assign(globalThis.AnswerFold || {}, { SITES, findSite });
})();
