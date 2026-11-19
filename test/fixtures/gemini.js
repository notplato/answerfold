// Markup shaped like a Gemini chat (simplified). Keep in step with the real
// site: when Gemini changes its layout, update this and the selectors together.

export const answer = (body) => `
  <model-response>
    <div class="response-container">
      <div class="avatar">✦</div>
      <div class="response-content">
        <div class="thoughts">Show thinking</div>
        <message-content><div class="markdown">${body}</div></message-content>
        <div class="footer"><button>Copy</button></div>
      </div>
    </div>
  </model-response>`;

export const turn = (question, body) => `
  <div class="conversation-container">
    <user-query><div class="query-text">${question}</div></user-query>
    ${answer(body)}
  </div>`;

export const chat = (turns) =>
  `<chat-window><div id="chat">${turns.map(([q, a]) => turn(q, a)).join("")}</div></chat-window>
   <input-container></input-container>`;

export const TURNS = [
  ["Explain binary search.", "<h3>Binary search</h3><p>First paragraph.</p><p>Second.</p>"],
  ["Why sorted?", "<p>Because it halves the range.</p>"],
  ["Now explain hash tables.", "<h3>Hash tables</h3><p>They map keys to buckets.</p>"],
];
