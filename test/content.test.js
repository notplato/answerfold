import { describe, expect, it } from "vitest";
import { chat, turn, TURNS } from "./fixtures/gemini.js";
import { loadPage, settle } from "./helpers.js";

const bars = (doc) => [...doc.querySelectorAll(".af-bar")];
const answers = (doc) => [...doc.querySelectorAll("model-response")];
const folded = (doc) => answers(doc).map((r) => r.classList.contains("af-collapsed"));
const click = async (el) => {
  el.click();
  await settle();
};

describe("fold bars", () => {
  it("adds exactly one bar to each answer, just above the answer text", async () => {
    const { document } = await loadPage({ html: chat(TURNS) });
    expect(bars(document)).toHaveLength(3);
    for (const response of answers(document)) {
      const bar = response.querySelector(".af-bar");
      expect(bar).not.toBeNull();
      expect(bar.querySelector(".af-arrow svg path")).not.toBeNull();
      expect(bar.nextElementSibling.tagName).toBe("MESSAGE-CONTENT");
    }
  });

  it("marks the page with the site id so per-site styles apply", async () => {
    const { document } = await loadPage({ html: chat(TURNS) });
    expect(document.documentElement.dataset.afSite).toBe("gemini");
  });

  it("folds and unfolds an answer when its bar is clicked", async () => {
    const { document } = await loadPage({ html: chat(TURNS) });
    const bar = bars(document)[0];

    await click(bar);
    expect(folded(document)).toEqual([true, false, false]);
    expect(bar.getAttribute("aria-expanded")).toBe("false");
    expect(bar.classList.contains("af-is-collapsed")).toBe(true);

    await click(bar);
    expect(folded(document)).toEqual([false, false, false]);
    expect(bar.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows the opening of the answer, with spaces between blocks, when folded", async () => {
    const { document } = await loadPage({ html: chat(TURNS) });
    await click(bars(document)[0]);
    expect(bars(document)[0].textContent).toBe("Binary search First paragraph. Second.");
  });

  it("truncates long previews", async () => {
    const long = `<p>${"word ".repeat(100)}</p>`;
    const { document } = await loadPage({ html: chat([["Q", long]]) });
    await click(bars(document)[0]);
    const label = bars(document)[0].textContent;
    expect(label.length).toBeLessThanOrEqual(161);
    expect(label.endsWith("…")).toBe(true);
  });

  it("does not let the click reach the site's own handlers", async () => {
    let reached = false;
    const { document } = await loadPage({
      html: chat(TURNS),
      before: (w) => w.document.addEventListener("click", () => (reached = true)),
    });
    await click(bars(document)[0]);
    expect(reached).toBe(false);
  });
});

describe("collapse / expand all", () => {
  it("toggles every answer from the keyboard shortcut", async () => {
    const { document, browser } = await loadPage({ html: chat(TURNS) });
    browser.sendMessage({ type: "toggle-all" });
    await settle();
    expect(folded(document)).toEqual([true, true, true]);

    browser.sendMessage({ type: "toggle-all" });
    await settle();
    expect(folded(document)).toEqual([false, false, false]);
  });

  it("collapses everything if any answer is open", async () => {
    const { document, browser } = await loadPage({ html: chat(TURNS) });
    await click(bars(document)[1]);
    browser.sendMessage({ type: "toggle-all" });
    await settle();
    expect(folded(document)).toEqual([true, true, true]);
  });

  it("toggles every answer from the floating button and updates its label", async () => {
    const { document } = await loadPage({ html: chat(TURNS) });
    const fab = document.querySelector(".af-fab");
    expect(fab.hidden).toBe(false);
    expect(fab.getAttribute("aria-label")).toBe("Collapse all answers");

    const collapseIcon = fab.querySelector("svg path").getAttribute("d");

    await click(fab);
    expect(folded(document)).toEqual([true, true, true]);
    expect(fab.getAttribute("aria-label")).toBe("Expand all answers");
    expect(fab.querySelectorAll("svg")).toHaveLength(1);
    expect(fab.querySelector("svg path").getAttribute("d")).not.toBe(collapseIcon);
  });

  it("hides the floating button when there is only one answer", async () => {
    const { document } = await loadPage({ html: chat(TURNS.slice(0, 1)) });
    expect(document.querySelector(".af-fab").hidden).toBe(true);
  });

  it("ignores unrelated messages", async () => {
    const { document, browser } = await loadPage({ html: chat(TURNS) });
    browser.sendMessage({ type: "something-else" });
    browser.sendMessage(undefined);
    await settle();
    expect(folded(document)).toEqual([false, false, false]);
  });
});

describe("remembering folded answers", () => {
  it("saves folds per conversation", async () => {
    const { document, store } = await loadPage({ html: chat(TURNS) });
    await click(bars(document)[1]);
    expect(Object.keys(store)).toEqual(["fold:/app/abc123"]);
    expect(store["fold:/app/abc123"]).toHaveLength(1);
  });

  it("restores folds after a reload", async () => {
    const first = await loadPage({ html: chat(TURNS) });
    await click(bars(first.document)[1]);

    const second = await loadPage({ html: chat(TURNS), store: first.store });
    expect(folded(second.document)).toEqual([false, true, false]);
  });

  it("follows the question, not the position, when older messages load above", async () => {
    const first = await loadPage({ html: chat(TURNS) });
    await click(bars(first.document)[2]);

    const withOlder = [["An older question", "<p>Old answer.</p>"], ...TURNS];
    const second = await loadPage({ html: chat(withOlder), store: first.store });
    expect(folded(second.document)).toEqual([false, false, false, true]);
  });

  it("tells repeated identical questions apart", async () => {
    const repeated = [
      ["Again?", "<p>One.</p>"],
      ["Again?", "<p>Two.</p>"],
    ];
    const first = await loadPage({ html: chat(repeated) });
    await click(bars(first.document)[1]);

    const second = await loadPage({ html: chat(repeated), store: first.store });
    expect(folded(second.document)).toEqual([false, true]);
  });

  it("removes the saved entry when nothing in the chat is folded", async () => {
    const { document, store } = await loadPage({ html: chat(TURNS) });
    await click(bars(document)[0]);
    await click(bars(document)[0]);
    expect(store).toEqual({});
  });

  it("keeps working if storage fails", async () => {
    const { document } = await loadPage({
      html: chat(TURNS),
      before: (w) => {
        w.browser.storage.local.get = async () => {
          throw new Error("storage unavailable");
        };
      },
    });
    expect(bars(document)).toHaveLength(3);
  });
});

describe("live page changes", () => {
  it("adds a bar to an answer that arrives later", async () => {
    const { document } = await loadPage({ html: chat(TURNS) });
    document.getElementById("chat").insertAdjacentHTML("beforeend", turn("More?", "<p>Yes.</p>"));
    await settle();
    expect(bars(document)).toHaveLength(4);
  });

  it("drops the bar when an answer is removed", async () => {
    const { document } = await loadPage({ html: chat(TURNS) });
    document.querySelector(".conversation-container").remove();
    await settle();
    expect(bars(document)).toHaveLength(2);
  });

  it("puts the bar back if the site re-renders the answer text", async () => {
    const { document } = await loadPage({ html: chat(TURNS) });
    const response = answers(document)[0];
    const content = response.querySelector(".response-content");
    content.innerHTML = '<message-content><div class="markdown"><p>New</p></div></message-content>';
    await settle();
    expect(response.querySelectorAll(".af-bar")).toHaveLength(1);
    expect(response.querySelector(".af-bar").nextElementSibling.tagName).toBe("MESSAGE-CONTENT");
  });

  it("loads the right folds when switching to another chat without a reload", async () => {
    const store = { "fold:/app/other": [] };
    const first = await loadPage({ html: chat(TURNS), store });
    await click(bars(first.document)[0]);

    const { window, document } = first;
    window.history.pushState({}, "", "/app/other");
    document.getElementById("chat").innerHTML = TURNS.map(([q, a]) => turn(q, a)).join("");
    await settle(250);

    expect(bars(document)).toHaveLength(3);
    expect(folded(document)).toEqual([false, false, false]);
    expect(store["fold:/app/abc123"]).toHaveLength(1);
  });
});

describe("robustness", () => {
  it("removes bars and buttons left behind by an older copy of the extension", async () => {
    const { document } = await loadPage({
      html: chat(TURNS),
      before: (w) => {
        const stale = w.document.createElement("button");
        stale.className = "af-bar";
        w.document.querySelector("model-response").before(stale);
        const staleFab = w.document.createElement("button");
        staleFab.className = "af-fab";
        w.document.body.append(staleFab);
      },
    });
    expect(bars(document)).toHaveLength(3);
    expect(document.querySelectorAll(".af-fab")).toHaveLength(1);
  });

  it("only adds one bar when answers are nested", async () => {
    const nested = `<model-response>${turn("Q", "<p>A</p>")}</model-response>`;
    const { document } = await loadPage({ html: nested });
    expect(bars(document)).toHaveLength(1);
  });

  it("does nothing on sites it doesn't support", async () => {
    const { document } = await loadPage({ url: "https://example.com/", html: chat(TURNS) });
    expect(bars(document)).toHaveLength(0);
    expect(document.querySelector(".af-fab")).toBeNull();
    expect(document.documentElement.dataset.afSite).toBeUndefined();
  });

  it("works when an answer has no recognisable text element", async () => {
    const html = `<user-query>Q</user-query><model-response><p>Plain</p></model-response>
                  <user-query>Q2</user-query><model-response></model-response>`;
    const { document } = await loadPage({ html });
    expect(bars(document)).toHaveLength(2);
    await click(bars(document)[1]);
    expect(bars(document)[1].textContent).toBe("(answer)");
  });
});
