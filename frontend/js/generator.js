import { dom } from "./dom.js";
import { buildPrompt } from "./promptBuilder.js";
import { startHand, stopHand } from "./handAnimation.js";
import { setHeader, unlockHeader } from "./headerState.js";
import { isNSFW } from "./nsfw.js";

export async function generateImage(prompt, style) {
  dom.results.innerHTML = "";
  setHeader(isNSFW(prompt) ? "laugh" : "handsign", true);
  dom.loading.style.display = "flex";
  startHand();

  try {
    const built = buildPrompt(prompt, style.key);
    const numImages = parseInt(dom.numImages.value, 10) || 1;

    for (let i = 0; i < numImages; i++) {
      const payload = {
        prompt: built.prompt,
        negative_prompt: built.negative_prompt || style.negative || "",
        steps: 30,
        cfg_scale: 7,
        width: 512,
        height: 512,
        checkpoint: style.checkpoint
      };

      console.log(`Sending request ${i + 1}/${numImages} to:`, style.endpoint, payload);

      const res = await fetch(style.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();

      // Parse JSON safely
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse JSON:", err, text);
        throw new Error("Invalid JSON returned from server");
      }

      // Log metadata only (avoid printing huge base64 image)
      const { images, ...metadata } = data;
      console.log(`Response metadata for image ${i + 1}:`, metadata);

      if (!images || !images.length) {
        const errorBox = document.createElement("div");
        errorBox.className = "image-box";
        errorBox.textContent = "No image returned.";
        dom.results.appendChild(errorBox);
        continue;
      }

      // Parse seed from info
      let seed = "unknown";
      if (data.info) {
        try {
          const info = JSON.parse(data.info);
          seed = info.seed ?? "unknown";
          console.log(`Parsed seed for image ${i + 1}:`, seed);
        } catch (err) {
          console.warn("Failed to parse seed from info:", err);
        }
      }

      // Build image box
      const box = document.createElement("div");
      box.className = "image-box";

      const img = document.createElement("img");
      img.src = "data:image/png;base64," + images[0];
      img.alt = `${prompt} #${i + 1}`;
      box.appendChild(img);

      // Info + copy button
      const infoDiv = document.createElement("div");
      infoDiv.className = "img-info";

      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copy Prompt+Seed";
      copyBtn.onclick = async () => {
        const textToCopy = `${built.prompt} | Seed: ${seed}`;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
            alert("Copied to clipboard!");
          } else {
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            alert("Copied to clipboard (fallback)!");
          }
        } catch (err) {
          alert("Failed to copy: " + err.message);
        }
      };

      infoDiv.appendChild(copyBtn);
      box.appendChild(infoDiv);
      dom.results.appendChild(box);
    }
  } catch (err) {
    const errorBox = document.createElement("div");
    errorBox.className = "image-box";
    errorBox.textContent = err.message;
    dom.results.appendChild(errorBox);
  } finally {
    stopHand();
    dom.loading.style.display = "none";
    unlockHeader();
  }
}
