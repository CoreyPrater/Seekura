// ==============================
// events.js — Chat handling
// ==============================

import { state } from "./state.js";
import { sendChatMessage, startSession, loadCharactersFromAPI } from "./api.js";
import { appendMessage, clearChat, showTypingBubble, removeTypingBubble } from "./ui-chat.js";

const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const characterSelect = document.getElementById("characterSelect");

/**
 * Send a user message
 */
async function send() {
  const text = input.value.trim();
  if (!text) return;
  if (!state.currentCharacter || !state.sessionId) {
    console.warn("No active character or session. Cannot send message.");
    return;
  }
  
  appendMessage(text, "user");
  input.value = "";

  const typingBubble = showTypingBubble();
  sendBtn.disabled = true;

  try {
    const reply = await sendChatMessage(
      state.currentCharacter.id,
      text,
      state.sessionId,
      state.currentCharacter?.character_profile || ""
    );

    removeTypingBubble(typingBubble);
    appendMessage(reply, "character");
  } catch (err) {
    console.error("[Chat send error]", err);
    removeTypingBubble(typingBubble);
    appendMessage("⚠️ AI did not respond.", "character");
  } finally {
    sendBtn.disabled = false;
  }
}

/**
 * Clear all messages in chat
 */
function clearMessages() {
  clearChat();
  if (state.messages) state.messages = [];
}

/**
 * Start a new session for selected character
 */
async function newSession() {
  const selectedId = characterSelect.value;
  const character = state.characters?.find(c => c.id === selectedId);
  if (!character) return alert("Please select a character.");

  clearChat();
  sendBtn.disabled = true;

  try {
    const { sessionId, messages } = await startSession(character.id, state.userId);

    state.currentCharacter = character;
    state.sessionId = sessionId;
    state.messages = messages ?? [];

    // Display all previous messages
    state.messages.forEach(msg => {
      appendMessage(msg.content, msg.role === "user" ? "user" : "character");
    });
  } catch (err) {
    console.error("[Start session error]", err);
    appendMessage("⚠️ Failed to start session.", "system");
  } finally {
    sendBtn.disabled = false;
  }
}

/**
 * Bind UI events
 */
export function bindChatEvents() {
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  if (clearBtn) clearBtn.addEventListener("click", clearMessages);

  const newSessionBtn = document.getElementById("newSessionBtn");
  if (newSessionBtn) newSessionBtn.addEventListener("click", newSession);

  // Load characters into dropdown
  loadCharactersFromAPI()
    .then(chars => {
      state.characters = chars;
      characterSelect.innerHTML = chars.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    })
    .catch(err => console.error("[Load characters error]", err));
}
