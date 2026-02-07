// server/chatHandler.ts
import type { Message } from "./types.ts";
import { supabaseRequest, bootstrapSession } from "../backend/supabase.ts";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "adi0adi/ollama_stheno-8b_v3.1_q6k";

/**
 * Minimal sanitization of AI response.
 */
function sanitizeAIResponse(text: string) {
  return String(text)
    .replace(/\*[^*]+\*/g, "") // remove *actions*
    .trim();
}

/**
 * Ensure a session has a system bootstrap message.
 */
async function ensureBootstrapped(session_id: string, characterProfile: string) {
  const existing: any[] =
    (await supabaseRequest(
      `messages?session_id=eq.${session_id}&role=eq.system&order=created_at.asc&limit=1`
    ).catch(() => [])) || [];

  if (!existing.length) {
    console.log("[handleChat] Bootstrapping system message (missing)");
    await bootstrapSession(session_id, characterProfile);
  }
}

/**
 * Generate a character reply via Ollama.
 * If session_id is undefined/null, no messages are persisted.
 */
export async function generateCharacterReply(
  character_id: string,
  incoming: Message[],
  session_id?: string
): Promise<string> {
  if (!character_id) throw new Error("Missing character_id");
  if (!incoming?.length) throw new Error("Missing messages");

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
    characters[0]?.character_profile ?? "You are a fictional character. Stay in character at all times.";

  console.log("[handleChat] Character profile loaded");

  // 2) Format messages
  let formattedMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

  if (hasSession) {
    await ensureBootstrapped(session_id!, characterProfile);

    // Persist newest user message
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

    // Load full session history
    const prevMsgs: any[] =
      (await supabaseRequest(`messages?session_id=eq.${session_id}&order=created_at.asc`).catch(() => [])) || [];

    formattedMessages = prevMsgs.map((m) => ({
      role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  } else {
    // One-shot in-memory only
    formattedMessages = [
      {
        role: "system",
        content: `You are a fictional character in an interactive roleplay conversation.\n\n--- CHARACTER PROFILE ---\n${characterProfile}`.trim(),
      },
      ...incoming.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];
  }

  console.log("[handleChat] Sending to Ollama", { messageCount: formattedMessages.length });

  // 3) Call Ollama
  let aiReply = "[No reply generated]";
  try {
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

    const data = await ollamaRes.json().catch(() => ({}));
    console.log("[handleChat] Ollama raw response", data);

    if (data?.message?.content) {
      aiReply = sanitizeAIResponse(data.message.content);
    } else {
      console.warn("[handleChat] Ollama returned empty content, using placeholder");
    }
  } catch (err) {
    console.error("[handleChat] Ollama fetch error", err);
  }

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
