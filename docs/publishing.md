# Publishing a release

## Before every release

1. Update the version in **both** `package.json` and `src/manifest.json` (a test checks they match). Use [Semantic Versioning](https://semver.org/): `0.1.1` for fixes, `0.2.0` for new features or sites.
2. Move the **Unreleased** notes in `CHANGELOG.md` under a new version heading with today's date.
3. Run `npm run check`.
4. Commit, then tag and push:
   ```sh
   git tag v0.2.0
   git push origin main --tags
   ```
   The **Release** workflow builds the zip and attaches it to a GitHub release.

## Submitting to Firefox Add-ons (AMO)

1. Sign in at <https://addons.mozilla.org/developers/> with a Firefox account.
2. **First release:** click **Submit a New Add-on**, choose **On this site**. **Later releases:** open the add-on and click **Upload New Version**.
3. Upload `dist/answerfold-<version>.zip` (from `npm run build`, or from the GitHub release).
4. When asked whether the code is minified, concatenated or machine-generated, answer **No**. Everything in `src/` is hand-written, so no separate source upload is needed.
5. First release only, fill in the listing:
   - **Name:** AnswerFold
   - **Summary:** Collapse and expand individual answers in AI chats, so you can jump between the ones that matter.
   - **Categories:** Other (or Tabs)
   - **License:** MIT
   - **Privacy policy:** not required (nothing is collected), but you can paste `PRIVACY.md`.
   - **Homepage / support:** the GitHub repository and its Issues page.
   - **Screenshots:** a chat with some answers folded, in dark and light mode.
   - **Notes to reviewer:** "Content script adds collapse buttons to answers on gemini.google.com. No network requests; storage.local holds hashes of folded questions. Test with any Gemini chat (a Google account is needed)."
6. Submit. Review usually takes from a few hours to a few days.

## Things that must not change

- The add-on ID in `src/manifest.json` (`browser_specific_settings.gecko.id`). AMO ties the listing and users' updates to it.
