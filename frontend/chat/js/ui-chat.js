// ==============================
// ui-chat.js — Chat UI helpers
// ==============================

const chatWindow = document.getElementById("chatWindow");

/**
 * Append a message to the chat window
 */
export function appendMessage(text, role = "character") {
  const msgEl = document.createElement("div");
  msgEl.className = `chat-msg ${role}`; // matches CSS
  msgEl.textContent = text;
  chatWindow.appendChild(msgEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Clear all chat messages
 */
export function clearChat() {
  chatWindow.innerHTML = "";
}

/**
 * Show typing bubble
 */
export function showTypingBubble() {
  const bubble = document.createElement("div");
  bubble.className = "typing-bubble";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "typing-dot";
    bubble.appendChild(dot);
  }
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

/**
 * Remove typing bubble
 */
export function removeTypingBubble(bubble) {
  if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
}
