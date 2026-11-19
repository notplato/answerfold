// AnswerFold — background script.
// Forwards the keyboard shortcut (configurable in about:addons → ⚙ → Manage
// Extension Shortcuts) to the active tab. Tabs without the content script
// (unsupported sites) simply reject the message, which we ignore.
browser.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-all") return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id === undefined) return;
  browser.tabs.sendMessage(tab.id, { type: "toggle-all" }).catch(() => {});
});
