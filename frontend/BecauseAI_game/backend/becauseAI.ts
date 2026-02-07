import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { fromFileUrl } from "https://deno.land/std@0.224.0/path/mod.ts";
import { RoundState } from "../shared/roundTypes.ts";

const FRONTEND_DIR = fromFileUrl(new URL("../frontend/", import.meta.url));
let currentRound: RoundState | null = null;
const BASE_PROMPTS = [
  "John Smith left his house at 6am, eager to get to work. He never arrived because"
];

// JSON + CORS helper
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

// Serve static files with CORS
async function serveFileWithCORS(req: Request, path: string) {
  const file = await serveFile(req, path);
  const headers = new Headers(file.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(file.body, { status: file.status, headers });
}

serve(async (req) => {
  const url = new URL(req.url);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  try {
    // === API ROUTES FIRST ===
    if (url.pathname.startsWith("/becauseai/")) {
      // Start round
      if (url.pathname === "/becauseai/start" && req.method === "POST") {
        currentRound = {
          roundId: crypto.randomUUID(),
          gameId: "local-game",
          phase: "SUBMISSION",
          basePrompt: BASE_PROMPTS[0],
          styleModifier: "photorealistic",
          submissions: [],
          variants: [],
          votes: []
        };
        return jsonResponse(currentRound);
      }

      // Submit text
      if (url.pathname === "/becauseai/submit" && req.method === "POST") {
        if (!currentRound) return jsonResponse({ error: "No round exists" }, 400);
        if (currentRound.phase !== "SUBMISSION") return jsonResponse({ error: "Not accepting submissions" }, 400);

        const { playerId, text } = await req.json();
        if (!playerId || !text) return jsonResponse({ error: "Missing playerId or text" }, 400);

        currentRound.submissions.push({
          submissionId: crypto.randomUUID(),
          playerId,
          text
        });
        return jsonResponse({ ok: true });
      }

      // Generate images
      if (url.pathname === "/becauseai/generate" && req.method === "POST") {
        if (!currentRound) return jsonResponse({ error: "No round exists" }, 400);
        if (currentRound.submissions.length === 0) return jsonResponse({ error: "No submissions yet" }, 400);

        currentRound.phase = "GENERATION";
        currentRound.variants = [];

const placeholderImages = [
  "https://imgs.search.brave.com/9gIs9bWZ6nlzDLuCnO1d1DWUiA4ACQDhG-lyXBxL0Zg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMucGV4ZWxzLmNv/bS9waG90b3MvNDAx/MjQ3My9wZXhlbHMt/cGhvdG8tNDAxMjQ3/My5qcGVnP2F1dG89/Y29tcHJlc3MmY3M9/dGlueXNyZ2ImZHBy/PTEmdz01MDA",
  "https://imgs.search.brave.com/5ouqYnZKoIhGYC3pEJvVAiJaqVSSFKFGzDHlCb9boDs/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTE5/MDQzMzY4Ny9waG90/by9oZWF2eS1yYWlu/LmpwZz9zPTYxMng2/MTImdz0wJms9MjAm/Yz1IQ2pyYWtZeGNq/QzBaNUpmcFpERFBY/V1Z4N1VFM0lfakE0/NDRScXBHVTB3PQ",
  "https://imgs.search.brave.com/DYFx_JQta-GHn2ETvSlbp7dBjeqampMMGy6BtlzBUCk/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTU0/OTYwNjY2L3Bob3Rv/L3JhaW4tYW5kLWRy/YW1hdGljLXNreS5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/Sm5iOGxRWXowVDVC/T2hQQ2dHbTg4ZEVP/cWZqSkJOcU12ck5k/RzNfUGplTT0"
];

        for (const sub of currentRound.submissions) {
        placeholderImages.forEach((url) => {
        currentRound.variants.push({
      variantId: crypto.randomUUID(),
      submissionId: sub.submissionId,
      imageUrl: url,
      isSelected: false
    });
  });
}

        currentRound.phase = "SELECTION";
        return jsonResponse(currentRound);
      }

      // SELECT IMAGE
        if (url.pathname === "/becauseai/select" && req.method === "POST") {
        if (!currentRound) return jsonResponse({ error: "No round exists" }, 400);
        if (currentRound.phase !== "SELECTION") return jsonResponse({ error: "Not in selection phase" }, 400);

        const { variantId } = await req.json();
        const variant = currentRound.variants.find(v => v.variantId === variantId);
        if (!variant) return jsonResponse({ error: "Variant not found" }, 400);
        variant.isSelected = true;

        // Advance to voting phase
        currentRound.phase = "VOTING";

        // Return full round state so frontend can render voting
        return jsonResponse(currentRound);
        }


      
      // Vote
      if (url.pathname === "/becauseai/vote" && req.method === "POST")
      {
        if (!currentRound) return jsonResponse({ error: "No round exists" }, 400);
        if (currentRound.phase !== "VOTING") return jsonResponse({ error: "Not in voting phase" }, 400);

        const { voterId, submissionId } = await req.json();
        if (!voterId || !submissionId) return jsonResponse({ error: "Missing voterId or submissionId" }, 400);

        currentRound.votes.push({ voterId, submissionId });

        // Optional: auto-complete round if all votes in
        // For testing, just allow manual phase advance
        return jsonResponse(currentRound);
      }

      
        // Get round summary
        if (url.pathname === "/becauseai/summary" && req.method === "GET") {
        if (!currentRound) return jsonResponse({ error: "No round exists" }, 400);

        const voteCounts = {};
        currentRound.votes.forEach(v => {
            voteCounts[v.submissionId] = (voteCounts[v.submissionId] || 0) + 1;
        });

        const winner = Object.entries(voteCounts)
            .sort((a, b) => b[1] - a[1])[0];

        return jsonResponse({
            votes: voteCounts,
            winnerSubmissionId: winner ? winner[0] : null
        });
        }


      // Get round state
      if (url.pathname === "/becauseai/state" && req.method === "GET") {
        if (!currentRound) return jsonResponse({ error: "No round exists" }, 400);
        return jsonResponse(currentRound);
      }

      // Default API fallback
      return jsonResponse({ error: "API route not found" }, 404);
    }

    // === STATIC FILES ===
    if (url.pathname === "/" && req.method === "GET") {
      return serveFileWithCORS(req, `${FRONTEND_DIR}/becauseAI.html`);
    }
    if (url.pathname === "/becauseAI.js" && req.method === "GET") {
      return serveFileWithCORS(req, `${FRONTEND_DIR}/becauseAI.js`);
    }

    // Fallback
    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Internal server error", detail: err.message }, 500);
  }
});
