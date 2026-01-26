// ==============================
// chatSession.js — Load / start chat sessions
// ==============================

import { state, initUserId } from "./state.js";
import { startSession } from "./api.js";
import { appendMessage, clearChat } from "./ui-chat.js";

const sendBtn = document.getElementById("sendBtn");

// Initialize user ID once
initUserId();
sendBtn.disabled = true;

/**
 * Start a chat session for a character
 * @param {Object} character — Selected character object
 */
// Start a chat session with a selected character
export async function startChatSession(character) {
  if (!character?.id) return;

  clearChat();

  try {
    const { sessionId, messages: lastMessages } =
      await startSession(character.id, state.userId);

    state.currentCharacter = character;
    state.sessionId = sessionId; // ✅ CRITICAL FIX

    lastMessages.forEach(msg => {
      appendMessage(
        msg.content,
        msg.role === "user" ? "user" : "character"
      );
    });

  } catch (err) {
    console.error("Failed to start chat session:", err);
    appendMessage("Failed to start chat session.", "character");
  }
}

