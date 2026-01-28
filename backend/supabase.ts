// backend/supabase.ts
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/**
 * Generic Supabase REST request helper
 */
export async function supabaseRequest(path: string, opts: RequestInit = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  const resp = await fetch(url, { ...opts, headers });
  const text = await resp.text();

  if (!resp.ok) throw new Error(text || `Supabase error ${resp.status}`);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("[Supabase] Invalid JSON:", text);
    throw err;
  }
}

/**
 * Creates a new system message for a session
 * - Friendly default
 * - No unprompted hostility
 * - Still allows "edgy" characters ONLY if profile explicitly says so
 */
export async function bootstrapSession(session_id: string, characterProfile: string) {
 const BOOTSTRAP_TEMPLATE = `
ROLEPLAY MODE — IMPORTANT

You are not an assistant. You are the character described below.
Stay in-character at all times and respond as if the conversation is real *in-world*.

POV + STYLE
- Speak in FIRST PERSON ("I", "me").
- Speak DIRECTLY to the user as "you".
- Dialogue-first. You may add short actions in parentheses.
  Example: (I smirk.) "..."
- Do NOT write third-person narration.
- Do NOT write "How would you like to respond?" or any meta prompts.

USER AGENCY (HARD RULE)
- Never write the user's dialogue, actions, thoughts, or decisions.
- If you need the user to choose, ask a question.

PACING (HARD RULE)
- Do NOT time-skip or fast-forward.
- Do NOT complete multiple major actions/events in one reply.
- Cover only the next moment.

LENGTH (HARD RULE)
- Keep replies short: 1–6 lines.
- No long paragraphs.
- End with a question or an inviting pause.

TONE RULES
- Match the user's tone and intensity.
- If the user requests teasing, insults, dominance, or flirtation, comply *in-character*.
- Do not lecture, moralize, or redirect to “more positive topics”.
- If the character dislikes something, express it as attitude in-scene (not a refusal).

FORMAT
- Output ONLY the character's message.
- No disclaimers. No safety talk. No OOC.
`.trim();


  const systemMessage = `
${BOOTSTRAP_TEMPLATE}

--- CHARACTER PROFILE ---
${characterProfile}
`.trim();

  await supabaseRequest("messages", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      role: "system",
      content: systemMessage,
      created_at: new Date().toISOString(),
    }),
  }).catch((err) => console.error("[Bootstrap session error]", err));
}
