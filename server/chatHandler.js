export async function generateCharacterReply(
  character_id: number,
  messages: Array<{role: string, content: string}>,
  session_id?: string
) {
  // Fetch character info
  const { data: charData } = await supabase
    .from("characters")
    .select("character_profile, tone, memory_summary")
    .eq("id", character_id)
    .single();

  const { character_profile, tone, memory_summary } = charData || {};

  // Ensure a session exists
  let sessionId = session_id;
  if (!sessionId) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ character_id, user_id: null }) // optional user_id if you want
      .select()
      .single();
    if (error) throw error;
    sessionId = data.id;
  }

  // Fetch last 6 messages
  const { data: msgs } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(6);

  const history = msgs?.map(m => ({ role: m.role, content: m.content })) || [];

  // Build the prompt
  const lastMessage = messages[messages.length - 1]?.content || "";
  const scenePrompt = `
[Character Profile]
${character_profile || ""}

[Tone]
${tone || ""}

[Memory]
${memory_summary || ""}

[Recent Messages]
${history.map(m => `[${m.role === "user" ? "User" : "Assistant"}] ${m.content}`).join("\n")}

[Scene]
${lastMessage}

(Stay in character. Continue naturally.)
`.trim();

  // Call Ollama
  const payload = { model: DEFAULT_MODEL, messages: [{ role: "user", content: scenePrompt }] };
  const resp = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  const aiReply = data?.reply || "…";

  // Update memory summary
  const updatedMemory = ((memory_summary || "") + "\n" + aiReply).slice(-5000);
  await supabase.from("characters").update({ memory_summary: updatedMemory }).eq("id", character_id);

  // Save AI message
  await supabase.from("messages").insert({ session_id: sessionId, role: "assistant", content: aiReply });

  // Return object with sessionId, AI reply, and history
  return { session_id: sessionId, reply: aiReply, history: [...history, { role: "assistant", content: aiReply }] };
}
