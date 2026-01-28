// server/chatHandler.ts
import type { Message } from "./types.ts";

// IMPORTANT: your supabase.ts lives in /backend, not /server
import { supabaseRequest, bootstrapSession } from "../backend/supabase.ts";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "zarigata/unfiltered-llama3";

/**
 * Small sanitization (optional)
 * Keep it minimal: do NOT rewrite personality too hard here.
 */
function sanitizeAIResponse(text: string) {
  return String(text)
    .replace(/\*[^*]+\*/g, "") // remove *actions* if model insists
    .trim();
}

/**
 * Ensures the session has exactly ONE system bootstrap message.
 * If missing, create it.
 */
async function ensureBootstrapped(session_id: string, characterProfile: string) {
  const existing: any[] =
    (await supabaseRequest(
      `messages?session_id=eq.${session_id}&role=eq.system&order=created_at.asc&limit=1`,
    ).catch(() => [])) || [];

  if (!existing.length) {
    console.log("[handleChat] Bootstrapping system message (missing)");
    await bootstrapSession(session_id, characterProfile);
    return;
  }

  // If you want to “version” the bootstrap later, add a marker line in template
  // and check it here. For now: if system exists, do nothing.
}

/**
 * Main API used by ollamaProxy.ts
 * generateCharacterReply(character_id, messages, session_id)
 */
export async function generateCharacterReply(
  character_id: string,
  incoming: Message[],
  session_id?: string,
): Promise<string> {
  if (!character_id) throw new Error("Missing character_id");
  if (!incoming?.length) throw new Error("Missing messages");

  // If proxy didn't pass a session_id, you can't store history safely.
  // But we can still run a one-shot call.
  const hasSession = Boolean(session_id);

  console.log("[handleChat] START", {
    character_id,
    session_id: session_id || "(none)",
    incomingCount: incoming.length,
  });

  // 1) Load character profile
  const characters: any[] =
    (await supabaseRequest(`characters?id=eq.${character_id}`).catch(() => [])) || [];

  const characterProfile =
    characters[0]?.character_profile ??
    "You are a fictional character. Stay in character at all times.";

  console.log("[handleChat] Character profile loaded");

  // 2) If we have a session_id, ensure bootstrap exists + persist user msg + fetch history
  let formattedMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

  if (hasSession) {
    await ensureBootstrapped(session_id!, characterProfile);

    // Persist newest user message only
    const userMsg = incoming[incoming.length - 1]?.content ?? "";

    console.log("[handleChat] Persisting user message", { preview: userMsg.slice(0, 120) });

    await supabaseRequest("messages", {
      method: "POST",
      body: JSON.stringify({
        session_id,
        role: "user",
        content: userMsg,
        created_at: new Date().toISOString(),
      }),
    }).catch((err) => console.error("[handleChat] Failed to persist user message", err));

    // Load full session history (system + all messages)
    const prevMsgs: any[] =
      (await supabaseRequest(
        `messages?session_id=eq.${session_id}&order=created_at.asc`,
      ).catch(() => [])) || [];

    formattedMessages = prevMsgs.map((m) => ({
      role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  } else {
    // No session id: one-shot prompt
    // Put bootstrap as the first message in-memory only
    formattedMessages = [
      {
        role: "system",
        content:
          `You are a fictional character in an interactive roleplay conversation.\n\n--- CHARACTER PROFILE ---\n${characterProfile}`.trim(),
      },
      ...incoming.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];
  }

  console.log("[handleChat] Sending to Ollama", { messageCount: formattedMessages.length });

  // 3) Call Ollama
  const ollamaRes = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: formattedMessages,
      stream: false,
    }),
  });

  if (!ollamaRes.ok) {
    const text = await ollamaRes.text();
    console.error("[handleChat] Ollama HTTP error", text);
    throw new Error(text);
  }

  const data = await ollamaRes.json();
  console.log("[handleChat] Ollama raw response", data);

  let aiReply = data?.message?.content;
  if (!aiReply || typeof aiReply !== "string") {
    throw new Error("Ollama did not return assistant content");
  }

  aiReply = sanitizeAIResponse(aiReply);

  // 4) Persist assistant reply if session exists
  if (hasSession) {
    await supabaseRequest("messages", {
      method: "POST",
      body: JSON.stringify({
        session_id,
        role: "assistant",
        content: aiReply,
        created_at: new Date().toISOString(),
      }),
    }).catch((err) => console.error("[handleChat] Failed to persist assistant message", err));
  }

  console.log("[handleChat] RETURNING assistant reply", {
    length: aiReply.length,
    preview: aiReply.slice(0, 200),
  });

  return aiReply;
}
