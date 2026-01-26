// loadSessionMessages.js

import { state } from "./state.js";
import { startSession } from "./api.js";
import { appendMessage, clearChat } from "./ui-chat.js";

export async function loadSessionMessages(characterId) {
  if (!characterId || !state.userId) return;

  clearChat();

  try {
    const { sessionId, messages } = await startSession(
      characterId,
      state.userId
    );

    state.sessionId = sessionId;
    state.messages = messages ?? [];

    state.messages.forEach(msg => {
      appendMessage(
        msg.content,
        msg.role === "user" ? "user" : "character"
      );
    });

  } catch (err) {
    console.error("Failed to load session messages:", err);
    appendMessage("⚠️ Failed to load previous session.", "character");
  }
}
