// ==============================
// api.js — API calls
// ==============================

export async function loadCharactersFromAPI() {
  const resp = await fetch("/characters");
  if (!resp.ok) throw new Error("Failed to fetch characters");
  return resp.json();
}

export async function savePersonality(id, profile) {
  console.log("Saving personality:", id, profile);
  const resp = await fetch(`/characters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_profile: profile }),
  });

  if (!resp.ok) throw new Error("Failed to save personality");

  const data = await resp.json(); // wait for JSON
  console.log("Server returned:", data);
  return data;
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
  // Only include session_id if it exists (not null/empty)
  const payload = {
    character_id: characterId,
    messages: [{ role: "user", content: text }],
    ...(sessionId ? { session_id: sessionId } : {}), // conditional
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
