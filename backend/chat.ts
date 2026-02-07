import { supabaseRequest, bootstrapSession } from './supabase.ts';
import type { Message } from './types.ts';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'adi0adi/ollama_stheno-8b_v3.1_q6k';

function sanitizeAIResponse(text: string) {
  return String(text)
    .replace(/\*[^*]+\*/g, '') // remove *actions*
    .trim();
}

export async function handleChat(
  character_id: string,
  session_id: string | null,
  incoming: Message[]
): Promise<string> {
  const startTime = Date.now();
  console.log('[handleChat] START', { character_id, session_id, incomingCount: incoming.length });

  if (!character_id || !incoming?.length) {
    throw new Error('Missing character_id or messages');
  }

  // 1) Load character profile
  const characters: any[] = await supabaseRequest(`characters?id=eq.${character_id}`).catch(() => []);
  const characterProfile =
    characters[0]?.character_profile ??
    'You are a fictional character. Stay fully in character at all times.';
  console.log('[handleChat] Character profile loaded');

  // 2) Bootstrap session if session_id exists
  const hasSession = Boolean(session_id);
  if (hasSession) {
    const messagesInSession: any[] = await supabaseRequest(`messages?session_id=eq.${session_id}`).catch(() => []);
    if (!messagesInSession.some(m => m.role === 'system')) {
      console.log('[handleChat] Bootstrapping system message');
      await bootstrapSession(session_id!, characterProfile);
    }
  }

  // 3) Persist latest user message if session exists
  const userMsg = incoming[incoming.length - 1]?.content ?? '';
  if (hasSession) {
    console.log('[handleChat] Persisting user message', { preview: userMsg.slice(0, 100) });
    await supabaseRequest('messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id,
        role: 'user',
        content: userMsg,
        created_at: new Date().toISOString(),
      }),
    }).catch(err => console.error('[handleChat] Failed to persist user message', err));
  }

  // 4) Prepare conversation for Ollama
  let formattedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

  if (hasSession) {
    const prevMsgs: any[] =
      (await supabaseRequest(`messages?session_id=eq.${session_id}&order=created_at.asc`).catch(() => [])) || [];
    formattedMessages = prevMsgs.map(m => ({
      role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
  } else {
    // one-shot in-memory
    formattedMessages = [
      { role: 'system', content: `You are a fictional character in an interactive roleplay.\n\n--- CHARACTER PROFILE ---\n${characterProfile}`.trim() },
      ...incoming.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];
  }

  console.log('[handleChat] Sending to Ollama', { messageCount: formattedMessages.length });

  // 5) Call Ollama API
  let aiReply = '[No reply generated]';
  try {
    const ollamaRes = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: formattedMessages, stream: false }),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      console.error('[handleChat] Ollama HTTP error', text);
    } else {
      const data = await ollamaRes.json().catch(() => ({}));
      console.log('[handleChat] Ollama raw response', data);

      if (data?.message?.content) {
        aiReply = sanitizeAIResponse(data.message.content) || aiReply;
      } else {
        console.warn('[handleChat] Ollama returned empty content, using placeholder');
      }
    }
  } catch (err) {
    console.error('[handleChat] Ollama fetch error', err);
  }

  // 6) Persist assistant reply if session exists
  if (hasSession) {
    await supabaseRequest('messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id,
        role: 'assistant',
        content: aiReply,
        created_at: new Date().toISOString(),
      }),
    }).catch(err => console.error('[handleChat] Failed to persist assistant message', err));
  }

  console.log('[handleChat] RETURNING assistant reply', {
    length: aiReply.length,
    preview: aiReply.slice(0, 200),
    durationMs: Date.now() - startTime,
  });

  return aiReply;
}
