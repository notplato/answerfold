# Contributing to AnswerFold

Thanks for helping! Bug reports, site fixes and new-site support are all welcome.

## Ground rules

- Be kind. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- Keep the extension **small and dependency-free**. Everything under `src/` ships as-is to users: no bundler, no frameworks, no runtime dependencies.
- **No data collection.** AnswerFold must never send anything off the user's machine. Pull requests that add analytics, remote code or network requests won't be merged.
- For anything bigger than a fix, open an issue first so we can agree on the approach.

## Setup

You need [Node.js](https://nodejs.org) 20+ and Firefox 140+.

```sh
npm install
npm start      # opens a fresh Firefox profile with the extension loaded; reloads on save
```

Before opening a pull request, run everything CI runs:

```sh
npm run check  # lint + tests + build
```

`npm run format` fixes formatting automatically.

## How the code is organised

```
src/                 The extension itself (this folder is what gets published)
  manifest.json      Extension manifest (Manifest V3)
  sites.js           One entry per supported site: hostnames + CSS selectors
  content.js         Core logic: adds fold bars, folds/unfolds, remembers state
  content.css        Styles; per-site theme overrides via html[data-af-site]
  background.js      Forwards the keyboard shortcut to the active tab
  icons/             PNG icons (generated, see below)
test/                Automated tests (Vitest + jsdom)
  fixtures/          Simplified markup of each supported site
  manual/            A mock chat page for checking the look in a browser
scripts/             Helper scripts (icon generation)
assets/              Source artwork
```

How it works, briefly: `content.js` finds each answer element using the selectors for the current site, inserts a `.af-bar` button just above the answer text, and folds the answer by adding `.af-collapsed`. CSS then hides everything inside the answer except the bar. A `MutationObserver` keeps up with new answers and chat switches. Each fold is remembered by a hash of the question it answers, stored in `browser.storage.local`.

## Fixing a site that broke

When a site changes its layout, the selectors in `src/sites.js` usually need updating.

1. Open the site, right-click an answer, choose **Inspect**, and find the new element names.
2. Update the selectors in `src/sites.js`.
3. Update the matching fixture in `test/fixtures/` so the tests reflect the new layout.
4. Run `npm test`, then try it on the real site with `npm start`.

## Adding a new site

1. **Add an entry to `SITES` in `src/sites.js`.** You need selectors for:
   - `response`: one element per answer
   - `query`: the user's prompt
   - `queryText`: the prompt's text inside `query`
   - `responseText`: the answer's text inside `response`
   - `anchor`: the element the fold bar is inserted before (usually the answer text wrapper)
   - `inputBox`: the prompt box at the bottom
   - `turn` (optional): a wrapper around one question and answer pair
2. **Add the site's URL** to `content_scripts.matches` in `src/manifest.json`, as `https://<host>/*`. A test checks that this matches `sites.js`.
3. **Match the site's look** (optional): add an `html[data-af-site="<id>"] .af-bar, html[data-af-site="<id>"] .af-fab { … }` block in `src/content.css` that sets the `--af-*` variables to the site's font and colours.
4. **Add a fixture and tests**: copy `test/fixtures/gemini.js` and `test/content.test.js` patterns for the new site.
5. Update the supported-sites table in `README.md` and add a line to `CHANGELOG.md`.

## Icons

`assets/icon.svg` is the source design. The PNGs in `src/icons/` are generated from the same shapes:

```sh
pip install pillow
python scripts/make-icons.py
```

## Commit messages and pull requests

- Keep pull requests focused on one change.
- Describe what changed and how you tested it (the PR template asks for this).
- Add an entry under **Unreleased** in `CHANGELOG.md` for anything users would notice.

## Releasing (maintainers)

See [docs/publishing.md](docs/publishing.md).
