// ==============================
// events.js — Chat handling (private mode compatible)
// ==============================

import { state } from "./state.js";
import { sendChatMessage, startSession, loadCharactersFromAPI } from "./api.js";
import { appendMessage, clearChat, showTypingBubble, removeTypingBubble } from "./ui-chat.js";

const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const characterSelect = document.getElementById("characterSelect");
const privateModeToggle = document.getElementById("privateModeToggle");

// Load saved private mode
let privateMode = localStorage.getItem("privateMode") === "true";
privateModeToggle.checked = 0;

// Update private mode when toggled
privateModeToggle.addEventListener("change", () => {
  privateMode = privateModeToggle.checked;
  localStorage.setItem("privateMode", String(privateMode));
  console.log("Private mode:", privateMode);
});

// Auto-grow textarea
function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

input.addEventListener("input", () => autoGrow(input));
autoGrow(input); // on load if text exists

/**
 * Send a user message
 */async function send() {
  const text = input.value.trim();
  if (!text) return;
  if (!state.currentCharacter) return console.warn("No active character.");

  appendMessage(text, "user");
  input.value = "";
  autoGrow(input);

  const typingBubble = showTypingBubble();
  sendBtn.disabled = true;

  try {
    // If private mode is on, don't persist messages
    const sessionIdToUse = privateModeToggle.checked ? null : state.sessionId;

    const reply = await sendChatMessage(
      state.currentCharacter.id,
      text,
      sessionIdToUse,
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
  const character = state.characters?.find(c => c.id == selectedId);
  if (!character) return alert("Please select a character.");

  clearChat();
  sendBtn.disabled = true;

  try {
    // optional "session" object for frontend only
    const sessionId = crypto.randomUUID(); // fake session ID
    state.currentCharacter = character;
    state.sessionId = sessionId;
    state.messages = [];

    appendMessage(`Session started with ${character.name}`, "system");
  } catch (err) {
    console.error("[New session error]", err);
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

  loadCharactersFromAPI()
  .then(chars => {
    state.characters = chars;

    // Sort ascending
    chars.sort((a, b) => a.name.localeCompare(b.name));

    characterSelect.innerHTML = chars
      .map(c => `<option value="${c.id}">${c.name}</option>`)
      .join("");
  })
  .catch(err => console.error("[Load characters error]", err));


}




//Slider. 
const slider = document.getElementById("privateModeToggle");
slider.addEventListener("change", (e) => {
  
  if(e.target.value === "on")
  {  
    alert("All storage of data has moved to local storage. Local to your device. No memory will be preserved but nothing you type will be saved to the database.");
  }
});