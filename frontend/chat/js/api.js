// ==============================
// api.js — API calls
// ==============================

export async function loadCharactersFromAPI() {
  const resp = await fetch("/characters");
  if (!resp.ok) throw new Error("Failed to fetch characters");
  return resp.json();
}

export async function savePersonality(id, profile) {
  const resp = await fetch(`/characters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_profile: profile }),
  });
  if (!resp.ok) throw new Error("Failed to save personality");
  return resp.json();
}

export async function startSession(characterId, userId) {
  const resp = await fetch("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_id: characterId, user_id: userId }),
  });
  if (!resp.ok) throw new Error("Failed to start session");

  const data = await resp.json();
  return {
    sessionId: data.sessionId ?? data.id,
    messages: data.messages ?? [], // includes all previous messages
  };
}

export async function sendChatMessage(characterId, text, sessionId) {
  const payload = {
    character_id: characterId,
    session_id: sessionId,
    messages: [{ role: "user", content: text }],
  };

  const resp = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.error) throw new Error(data.error || "Chat failed");
  return data.reply;
}
