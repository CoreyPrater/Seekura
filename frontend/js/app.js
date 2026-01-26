import { initHeaderState } from "./headerState.js";

document.addEventListener("DOMContentLoaded", () => {
  const resultsDiv = document.getElementById("results");
  const promptInput = document.getElementById("prompt");
  const negativeInput = document.getElementById("negativePrompt");
  const numImagesInput = document.getElementById("numImages");
  const statusSpan = document.getElementById("status");
  const styleSelect = document.getElementById("artStyle");
  const loadingAnimation = document.getElementById("loadingAnimation");
  const handSignImg = document.getElementById("handSign");
  const headerImage = document.getElementById("headerImage");

  const { setHeaderState, unlockHeader } = initHeaderState(headerImage);

  const handImages = [
    "/assets/hand1.png","/assets/hand2.png","/assets/hand3.png",
    "/assets/hand4.png","/assets/hand5.png","/assets/hand6.png",
    "/assets/hand7.png","/assets/hand8.png","/assets/hand9.png"
  ];
  let handInterval = null;
  function startHandAnimation() {
    let lastIndex = -1;
    handInterval = setInterval(() => {
      let nextIndex;
      do { nextIndex = Math.floor(Math.random()*handImages.length); } while(nextIndex === lastIndex);
      lastIndex = nextIndex;
      handSignImg.src = handImages[nextIndex];
    }, 125);
  }
  function stopHandAnimation() { clearInterval(handInterval); handInterval = null; }

  const STYLE_CONFIG = {
    anthro: { label:"Anthro", endpoint:"/generate/anthro", negative:"human, realistic, photorealistic, real person" },
    anime:  { label:"Anime",  endpoint:"/generate/anime",  negative:"realistic, photorealistic, human, lowres" },
    photo:  { label:"Photorealistic", endpoint:"/generate/photo", negative:"cartoon, anime, illustration, lowres" },
    epic:   { label:"Epic Realism", endpoint:"/generate/epic", negative:"cartoon, lowres, bad anatomy" },
    toon:   { label:"Toon", endpoint:"/generate/toon", negative:"realistic, photo, human" },
    dnd:    { label:"D&D Art", endpoint:"/generate/dnd", negative:"realistic, lowres, photo" },
    cyber:    { label:"Cyber Realism", endpoint:"/generate/cyber", negative:"" }
  };

  let nsfwTerms = [];
  fetch("/assets/nsfw_terms.txt")
    .then(r => r.text())
    .then(t => { nsfwTerms = t.split(/\r?\n/).filter(Boolean); });

  async function generateImage(prompt, styleKey, replaceIndex = null) {
    if (replaceIndex === null) resultsDiv.innerHTML = "";
    const style = STYLE_CONFIG[styleKey];

    let imgBox;
    if (replaceIndex !== null && resultsDiv.children[replaceIndex]) {
      imgBox = resultsDiv.children[replaceIndex];
      imgBox.innerHTML = "";
    } else {
      imgBox = document.createElement("div");
      imgBox.className = "image-box";
      resultsDiv.appendChild(imgBox);
    }

    const isNSFW = nsfwTerms.some(term => prompt.toLowerCase().includes(term));
    if (isNSFW) { setHeaderState("laugh", true); navigator.vibrate?.(200); }
    else { setHeaderState("handsign", true); }

    loadingAnimation.style.display = "flex";
    startHandAnimation();

    try {
      const res = await fetch(style.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negative_prompt: style.negative || "",
          steps: 20,
          cfg_scale: 7,
          width: 512,
          height: 512
        })
      });

      if (!res.ok) throw new Error("Server returned " + res.status);

      const data = await res.json();
      if (!data.images || !data.images.length) {
        imgBox.textContent = "No image returned.";
        return;
      }

      const img = document.createElement("img");
      img.src = "data:image/png;base64," + data.images[0];
      img.alt = prompt;
      imgBox.appendChild(img);

    } catch (err) {
      imgBox.textContent = "Error: " + err.message;
      console.error(err);
    } finally {
      stopHandAnimation();
      loadingAnimation.style.display = "none";
      if (!isNSFW) unlockHeader();
    }
  }

  document.getElementById("generateBtn").onclick = async () => {
    const prompt = promptInput.value.trim();
    const numImages = parseInt(numImagesInput.value)||1;
    if (!prompt) { alert("Enter a prompt!"); return; }
    if (numImages > 10) { alert("Locally hosted only allows max 10 images."); return; }
    resultsDiv.innerHTML = "";
    statusSpan.textContent = `Generating ${numImages} image${numImages>1?'s':''}...`;
    const styleKey = styleSelect.value;
    for (let i=0;i<numImages;i++) await generateImage(prompt, styleKey, i);
    statusSpan.textContent = "";
  };

  function initStyleDropdown() {
    styleSelect.innerHTML = "";
    Object.keys(STYLE_CONFIG).sort().forEach(k => {
      const option = document.createElement("option");
      option.value = k; option.text = STYLE_CONFIG[k].label;
      styleSelect.appendChild(option);
    });
    negativeInput.value = STYLE_CONFIG[Object.keys(STYLE_CONFIG)[0]].negative;
  }

  initStyleDropdown();
  styleSelect.onchange = () => { negativeInput.value = STYLE_CONFIG[styleSelect.value].negative; };
});
