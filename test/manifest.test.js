import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const json = (p) => JSON.parse(readFileSync(path(p), "utf8"));
const manifest = json("src/manifest.json");
const pkg = json("package.json");

// Load sites.js the same way Firefox does (as a plain script) to read SITES.
const { window } = new JSDOM("", { runScripts: "outside-only" });
window.eval(readFileSync(path("src/sites.js"), "utf8"));
const { SITES, findSite } = window.AnswerFold;

describe("manifest", () => {
  it("has the same version as package.json", () => {
    expect(manifest.version).toBe(pkg.version);
  });

  it("points only at files that exist", () => {
    const files = [
      ...Object.values(manifest.icons),
      ...manifest.background.scripts,
      ...manifest.content_scripts.flatMap((cs) => [...cs.js, ...cs.css]),
    ];
    for (const file of files) expect(existsSync(path(`src/${file}`)), file).toBe(true);
  });

  it("loads sites.js before content.js", () => {
    for (const cs of manifest.content_scripts) {
      expect(cs.js.indexOf("sites.js")).toBeLessThan(cs.js.indexOf("content.js"));
    }
  });

  it("declares that no user data is collected", () => {
    expect(manifest.browser_specific_settings.gecko.data_collection_permissions).toEqual({
      required: ["none"],
    });
  });

  it("injects the content script on exactly the supported sites", () => {
    const matches = manifest.content_scripts.flatMap((cs) => cs.matches).sort();
    const expected = SITES.flatMap((s) => s.hosts.map((h) => `https://${h}/*`)).sort();
    expect(matches).toEqual(expected);
  });
});

describe("sites", () => {
  it("defines every selector the content script needs", () => {
    const required = ["response", "query", "queryText", "responseText", "anchor", "inputBox"];
    for (const site of SITES) {
      for (const key of required) expect(site.selectors[key], `${site.id}.${key}`).toBeTruthy();
    }
  });

  it("matches the site's own hostname only", () => {
    expect(findSite("gemini.google.com").id).toBe("gemini");
    expect(findSite("google.com")).toBeNull();
    expect(findSite("notgemini.google.com")).toBeNull();
    expect(findSite("gemini.google.com.example.org")).toBeNull();
  });

  it("has unique ids", () => {
    const ids = SITES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
