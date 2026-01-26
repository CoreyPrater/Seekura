// ollamaProxy.js — Seekura full-featured proxy (updated for session + history)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { MultipartReader } from "https://deno.land/std@0.177.0/mime/multipart.ts";
import { v4 } from "https://deno.land/std@0.177.0/uuid/mod.ts";
import { generateCharacterReply } from "./chatHandler.js";

const OLLAMA_LOCAL_URL = "http://localhost:11434/api/chat";
const DEFAULT_MODEL = "nollama/mythomax-l2-13b:Q4_K_M";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase URL and KEY must be set");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ASSETS_DIR = "./chat/assets/";

console.log("Seekura Ollama proxy starting on port 5005...");

serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers, status: 204 });

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // -----------------------------
    // GET /characters
    // -----------------------------
    if (req.method === "GET" && path === "/characters") {
      const { data, error } = await supabase.from("characters").select("*").order("id", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify(data || []), { status: 200, headers });
    }

    // -----------------------------
    // GET /characters/:id
    // -----------------------------
    if (req.method === "GET" && /^\/characters\/\d+$/.test(path)) {
      const id = parseInt(path.split("/").pop()!);
      const { data, error } = await supabase.from("characters").select("*").eq("id", id).single();
      if (error) throw error;
      return new Response(JSON.stringify(data || {}), { status: 200, headers });
    }

    // -----------------------------
    // PUT /characters/:id
    // -----------------------------
    if (req.method === "PUT" && /^\/characters\/\d+$/.test(path)) {
      const id = parseInt(path.split("/").pop()!);
      const body = await req.json();
      const updates: Record<string, any> = {};
      if (body.character_profile !== undefined) updates.character_profile = body.character_profile;
      if (body.tone !== undefined) updates.tone = body.tone;
      if (body.memory_summary !== undefined) updates.memory_summary = body.memory_summary;

      const { error } = await supabase.from("characters").update(updates).eq("id", id);
      if (error) throw error;

      const { data } = await supabase.from("characters").select("*").eq("id", id).single();
      return new Response(JSON.stringify(data || {}), { status: 200, headers });
    }

    // -----------------------------
    // POST /characters/:id/upload
    // -----------------------------
    if (req.method === "POST" && /^\/characters\/\d+\/upload$/.test(path)) {
      const id = parseInt(path.split("/")[2]);
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) return new Response(JSON.stringify({ error: "Invalid content-type" }), { status: 400, headers });

      const boundary = contentType.split("boundary=")[1];
      const bodyBuffer = await req.arrayBuffer();
      const reader = new MultipartReader(new Deno.Buffer(bodyBuffer), boundary);
      const form = await reader.readForm();
      const file = form.file("image");
      if (!file) return new Response(JSON.stringify({ error: "No image file provided" }), { status: 400, headers });

      const ext = file.filename.split(".").pop();
      const filename = `${v4.generate()}.${ext}`;
      const filePath = `${ASSETS_DIR}${filename}`;
      const fileData = await Deno.readAll(await file.content);
      await Deno.writeFile(filePath, fileData);

      const { data: character } = await supabase.from("characters").select("imageList").eq("id", id).single();
      const imageList = character?.imageList?.split(",").map(i => i.trim()).filter(Boolean) || [];
      imageList.unshift(filename);
      const { error } = await supabase.from("characters").update({ imageList: imageList.join(",") }).eq("id", id);
      if (error) throw error;

      return new Response(JSON.stringify({ imageList: imageList.join(",") }), { status: 200, headers });
    }

    // -----------------------------
    // POST /sessions
    // -----------------------------
    if (req.method === "POST" && path === "/sessions") {
      const body = await req.json().catch(() => ({}));
      const { character_id, user_id } = body;
      if (!character_id || !user_id) return new Response(JSON.stringify({ error: "Missing character_id or user_id" }), { status: 400, headers });

      try {
        // create or reuse session
        const { data: sessions } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("character_id", character_id)
          .eq("user_id", user_id)
          .limit(1);

        let sessionId = sessions?.[0]?.id;
        if (!sessionId) {
          const { data: newSession } = await supabase
            .from("chat_sessions")
            .insert({ character_id, user_id, created_at: new Date().toISOString() })
            .select()
            .single();
          sessionId = newSession.id;
        }

        // fetch last 6 messages for this session
        const { data: messages } = await supabase
          .from("messages")
          .select("role, content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(6);

        return new Response(JSON.stringify({ sessionId, messages: messages || [] }), { status: 200, headers });
      } catch (err) {
        console.error("Sessions error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
      }
    }

    // -----------------------------
    // POST /chat
    // -----------------------------
    if (req.method === "POST" && path === "/chat") {
      const body = await req.json().catch(() => ({}));
      const { messages, character_id, session_id } = body;

      if (!messages?.length) return new Response(JSON.stringify({ error: "Missing messages" }), { status: 400, headers });
      if (!character_id) return new Response(JSON.stringify({ error: "Missing character_id" }), { status: 400, headers });

      try {
        const reply = await generateCharacterReply(character_id, messages, session_id);
        return new Response(JSON.stringify({ reply }), { status: 200, headers });
      } catch (err) {
        console.error("Chat error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
      }
    }

    // -----------------------------
    // Default fallback
    // -----------------------------
    return new Response("Not found", { status: 404, headers });
  } catch (err) {
    console.error("Proxy error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}, { port: 5005 });
