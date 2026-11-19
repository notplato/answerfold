<p align="center">
  <img src="src/icons/icon-128.png" width="96" height="96" alt="">
</p>

<h1 align="center">AnswerFold</h1>

<p align="center">
  Collapse and expand individual answers in AI chats, so you can jump between the ones that matter.<br>
  A small, dependency-free Firefox extension. Works on <strong>Gemini</strong>, with more sites planned.
</p>

---

When you ask a big question, follow up with a string of clarifying questions, then ask another big question, you end up scrolling back and forth between the two answers you care about. AnswerFold puts a fold bar on every answer. Click it, and the answer folds down to a one-line preview. Click again to open it.

<!-- Add a screenshot: docs/screenshot.png, then uncomment the line below. -->
<!-- ![AnswerFold on Gemini](docs/screenshot.png) -->

## Features

- **Fold any answer.** Click the bar above an answer to fold it to a one-line preview. Your questions stay visible, so they work as headings.
- **Collapse or expand everything.** A round button (bottom right) folds or opens every answer at once.
- **Keyboard shortcut.** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> toggles all answers. Change it in `about:addons` → ⚙ → _Manage Extension Shortcuts_.
- **Remembers what you folded.** Folded answers stay folded when you reload or come back to a chat.
- **Fits in.** Uses the site's own font and colours, in light and dark mode.
- **Private.** No data leaves your browser: no analytics, no network requests. See [PRIVACY.md](PRIVACY.md).

## Supported sites

| Site                                | Status       |
| ----------------------------------- | ------------ |
| [Gemini](https://gemini.google.com) | ✅ Supported |
| Claude, ChatGPT, Grok               | Planned      |

Want another site? [Open a site request](../../issues/new/choose), or add it yourself (see [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-new-site)).

## Install

**From Firefox Add-ons:** _coming soon._

**From source:**

1. Download or clone this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and choose `src/manifest.json`.
4. Open or reload a Gemini chat.

Temporary add-ons are removed when Firefox restarts. Requires Firefox 140 or later.

## Something broke?

Chat sites change their page layout from time to time, which can stop AnswerFold from finding answers. If the fold bars disappear, [report it](../../issues/new/choose). The fix is usually a one-line change to the selectors in [`src/sites.js`](src/sites.js).

## Development

You need [Node.js](https://nodejs.org) 20 or later.

```sh
npm install        # install dev tools
npm start          # launch Firefox with the extension loaded, reloading on change
npm test           # run the automated tests
npm run lint       # check code style, formatting and the extension manifest
npm run build      # package the extension into dist/
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how the code is organised and how to add a site.

## License

[MIT](LICENSE). AnswerFold is not affiliated with or endorsed by Google, Anthropic, OpenAI or xAI. Product names are trademarks of their owners.
