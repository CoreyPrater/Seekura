import { supabaseRequest, bootstrapSession } from './supabase.ts';
import type { Message } from './types.ts';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'zarigata/unfiltered-llama3';

export async function handleChat(
  character_id: string,
  session_id: string,
  incoming: Message[]
): Promise<string> {

  const startTime = Date.now();
  console.log('[handleChat] START', { character_id, session_id, incomingCount: incoming.length });

  if (!character_id || !session_id || !incoming?.length) {
    throw new Error('Missing character_id, session_id, or messages');
  }

  /* -----------------------------
     Load character profile
  ----------------------------- */
  const characters: any[] =
    await supabaseRequest(`characters?id=eq.${character_id}`).catch(() => []);

  const characterProfile =
    characters[0]?.character_profile ??
    'You are a fictional character. Stay fully in character at all times.';

  console.log('[handleChat] Character profile loaded');

  /* -----------------------------
     Bootstrap session if missing
  ----------------------------- */
  const messagesInSession: any[] =
    await supabaseRequest(`messages?session_id=eq.${session_id}`).catch(() => []);

  if (!messagesInSession.some(m => m.role === 'system')) {
    console.log('[handleChat] Bootstrapping system message');
    await bootstrapSession(session_id, characterProfile);
  }

  /* -----------------------------
     Persist latest user message
  ----------------------------- */
  const userMsg = incoming[incoming.length - 1]?.content ?? '';
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

  /* -----------------------------
     Load conversation history
     Keep role hierarchy intact
  ----------------------------- */
  const prevMsgs: any[] =
    await supabaseRequest(`messages?session_id=eq.${session_id}&order=created_at.asc`).catch(() => []);

  const formattedMessages = prevMsgs.map(m => ({
    role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  // Ensure exactly ONE system message at the top
  const systemMessages = formattedMessages.filter(m => m.role === 'system');
  const nonSystemMessages = formattedMessages.filter(m => m.role !== 'system');
  const finalMessages = [
    systemMessages[0] ?? { role: 'system', content: 'You are a fictional character.' },
    ...nonSystemMessages,
  ];

  console.log('[handleChat] Sending to Ollama', { messageCount: finalMessages.length });

  /* -----------------------------
     Call Ollama API
  ----------------------------- */
  const ollamaRes = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: finalMessages,
      stream: false,
    }),
  });

  if (!ollamaRes.ok) {
    const text = await ollamaRes.text();
    console.error('[handleChat] Ollama HTTP error', text);
    throw new Error(text);
  }

  const data = await ollamaRes.json();
  console.log('[handleChat] Ollama raw response', data);

  const aiReply = data?.message?.content;

  if (!aiReply || typeof aiReply !== 'string') {
    console.error('[handleChat] Invalid Ollama response shape', data);
    throw new Error('Ollama did not return assistant content');
  }

  /* -----------------------------
     Persist assistant message
  ----------------------------- */
  await supabaseRequest('messages', {
    method: 'POST',
    body: JSON.stringify({
      session_id,
      role: 'assistant',
      content: aiReply,
      created_at: new Date().toISOString(),
    }),
  }).catch(err => console.error('[handleChat] Failed to persist assistant message', err));

  console.log('[handleChat] RETURNING assistant reply', {
    length: aiReply.length,
    preview: aiReply.slice(0, 200),
    durationMs: Date.now() - startTime,
  });

  return aiReply;
}
