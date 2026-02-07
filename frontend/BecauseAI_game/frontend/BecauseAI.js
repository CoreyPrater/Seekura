const API_BASE = window.location.origin + "/becauseai";
let selectedVariantId = null;

// -------------------- ROUND FUNCTIONS --------------------

async function startRound() {
  try {
    const res = await fetch(`${API_BASE}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    document.getElementById("prompt").textContent = data.basePrompt;
    document.getElementById("images").innerHTML = "";
    selectedVariantId = null;

    // Enable Enter key listener for selection
    document.addEventListener("keydown", enterKeyListener);
  } catch (err) {
    console.error("Error starting round:", err);
  }
}

async function submitText(playerId, text) {
  if (!playerId || !text) {
    alert("Please enter Player ID and text.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, text })
    });
    const data = await res.json();
    console.log("Text submitted:", data);
  } catch (err) {
    console.error("Error submitting text:", err);
  }
}

async function generateImages() {
  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    const container = document.getElementById("images");
    container.innerHTML = "";
    selectedVariantId = null;

    data.variants.forEach(v => {
      const img = document.createElement("img");
      img.src = v.imageUrl;
      img.style.width = "400px";
      img.dataset.variantId = v.variantId;
      img.onclick = () => selectVariant(img, v.variantId);
      container.appendChild(img);
    });
  } catch (err) {
    console.error("Error generating images:", err);
  }
}

// -------------------- VARIANT SELECTION --------------------

function selectVariant(img, variantId) {
  selectedVariantId = variantId;
  document.querySelectorAll("#images img").forEach(i => i.classList.remove("selected"));
  img.classList.add("selected");
}

async function submitSelectedVariant() {
  if (!selectedVariantId) {
    alert("Please select a variant first.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: selectedVariantId })
    });
    const round = await res.json();
    console.log("Variant submitted, round state:", round);

    if (round.phase === "VOTING") {
      alert("Variant submitted! Voting round starts now.");

      // Disable Enter key
      document.removeEventListener("keydown", enterKeyListener);

      // Show voting images
      const container = document.getElementById("images");
      container.innerHTML = "";
      round.variants
        .filter(v => v.isSelected)
        .forEach(v => {
          const img = document.createElement("img");
          img.src = v.imageUrl;
          img.dataset.submissionId = v.submissionId;
          img.onclick = () => submitVote(v.submissionId);
          container.appendChild(img);
        });
    }
  } catch (err) {
    console.error("Error selecting variant:", err);
  }
}

// -------------------- VOTING --------------------

async function submitVote(submissionId) {
  const voterId = prompt("Enter your player ID to vote:");
  if (!voterId) return;
  try {
    const res = await fetch(`${API_BASE}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId, submissionId })
    });
    const data = await res.json();
    alert("Vote submitted!");
    showRoundSummary();
  } catch (err) {
    console.error("Error submitting vote:", err);
  }
}

async function showRoundSummary() {
  try {
    const res = await fetch(`${API_BASE}/summary`);
    const data = await res.json();
    alert(`Winner submission: ${data.winnerSubmissionId}\nVotes: ${JSON.stringify(data.votes)}`);
  } catch (err) {
    console.error("Error fetching round summary:", err);
  }
}

// -------------------- ENTER KEY HANDLER --------------------

// Keep listener in a variable so we can remove it after selection
const enterKeyListener = (e) => {
  if (e.key === "Enter") submitSelectedVariant();
};

// -------------------- BUTTON BINDINGS --------------------

document.getElementById("startBtn").onclick = startRound;
document.getElementById("submitBtn").onclick = () => {
  const playerId = document.getElementById("playerId").value;
  const text = document.getElementById("playerText").value;
  submitText(playerId, text);
};
document.getElementById("generateBtn").onclick = generateImages;
