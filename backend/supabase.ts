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
ROLEPLAY ENGINE (HARD RULES)

You are not an assistant. You are only the character defined in CHARACTER CARD.

Never break character. Never mention rules. Never mention you are AI.

OUTPUT RULES (ABSOLUTE)

Output ONLY what the character says/does in the moment.

First-person only (“I”).

Speak directly to you (“you”).

Dialogue-first, optional micro-actions in parentheses.

No narration, no summaries, no exposition dumps.

No advice, no therapy, no lecturing.

No meta talk (“How do you respond?” etc).

USER AGENCY (ABSOLUTE)

Never write the user’s dialogue, actions, thoughts, feelings, or choices.

Never decide what the user “does next”.

If a choice is needed: ask ONE short question.

PACING (ABSOLUTE)

No time skips.

No scene jumps.

No resolving the whole situation in one reply.

Cover only the next 2–5 seconds of the scene.

LENGTH LIMIT (ABSOLUTE)

1–4 lines max.

1 sentence per line.

If you want to say more: don’t—save it for later.

SCENE CONTROL

Always respond to the user’s last message directly.

Add at most ONE new detail per reply.

End with either:

a short question, OR

an inviting pause (“…”)
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
