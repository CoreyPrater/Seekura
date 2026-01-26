// chat.js — Seekura frontend JS (rewritten, stable, Perchance-style)

const characterSelect = document.getElementById("characterSelect");
const characterImage = document.getElementById("characterImage");
const characterBadge = document.getElementById("characterBadge");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const uploadImageInput = document.getElementById("uploadImageInput");
const editPersonalityBtn = document.getElementById("editPersonalityBtn");
const personalityPopup = document.getElementById("personalityPopup");
const systemPromptInput = document.getElementById("systemPromptInput");
const savePromptBtn = document.getElementById("savePromptBtn");
const cancelPromptBtn = document.getElementById("cancelPromptBtn");
const newSessionBtn = document.getElementById("newSessionBtn");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

let currentCharacter = null;
let typingBubbleEl = null;

// Persistent user ID
let userId = localStorage.getItem("seekura_user_id");
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("seekura_user_id", userId);
}

/* =============================
   Character Loading
============================= */
async function loadCharacters() {
  try {
    const res = await fetch("/characters");
    const characters = await res.json();

    characterSelect.innerHTML = characters
      .map(c => `<option value="${c.id}">${c.name || "Unnamed"}</option>`)
      .join("");

    if (characters.length) {
      await setCharacter(characters[0].id);
    }
  } catch (err) {
    console.error("Failed to load characters:", err);
  }
}

async function setCharacter(id) {
  try {
    const res = await fetch(`/characters/${id}`);
    const char = await res.json();

    currentCharacter = char;

    characterBadge.textContent = char.name || "No Character Molded";

    const firstImage = char.imageList?.split(",")[0];
    characterImage.src = firstImage
      ? `/chat/assets/${firstImage}`
      : "/chat/assets/NoMold.png";

    clearChat();
  } catch (err) {
    console.error("Failed to set character:", err);
  }
}

/* =============================
   Chat Helpers
============================= */
function clearChat() {
  chatWindow.innerHTML = "";
  removeTypingBubble();
}

function appendMessage(text, role) {
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* =============================
   Typing Bubble
============================= */
function showTypingBubble() {
  if (typingBubbleEl) return;

  typingBubbleEl = document.createElement("div");
  typingBubbleEl.className = "typing-bubble";
  typingBubbleEl.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;

  chatWindow.appendChild(typingBubbleEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  characterBadge.classList.add("speaking");
}

function removeTypingBubble() {
  if (!typingBubbleEl) return;

  typingBubbleEl.remove();
  typingBubbleEl = null;
  characterBadge.classList.remove("speaking");
}

/* =============================
   Message Sending
============================= */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || !currentCharacter) return;

  appendMessage(text, "user");
  userInput.value = "";
  showTypingBubble();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character_id: currentCharacter.id,
        messages: [{ role: "user", content: text }]
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Chat failed");
    }

    removeTypingBubble();
    appendMessage(data.reply, "character");

  } catch (err) {
    console.error("Chat error:", err);
    removeTypingBubble();
    appendMessage("⚠️ Error: AI did not respond.", "character");
  }
}

/* =============================
   Personality Editor
============================= */
editPersonalityBtn.onclick = () => {
  if (!currentCharacter) return;
  systemPromptInput.value = currentCharacter.character_profile || "";
  personalityPopup.classList.remove("popup-hidden");
};

savePromptBtn.onclick = async () => {
  if (!currentCharacter) return;

  try {
    const res = await fetch(`/characters/${currentCharacter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character_profile: systemPromptInput.value
      })
    });

    currentCharacter = await res.json();
    characterBadge.textContent = currentCharacter.name || "No Character Molded";

  } catch (err) {
    console.error("Failed to save personality:", err);
  } finally {
    personalityPopup.classList.add("popup-hidden");
  }
};

cancelPromptBtn.onclick = () =>
  personalityPopup.classList.add("popup-hidden");

/* =============================
   Image Upload
============================= */
uploadImageBtn.onclick = () => uploadImageInput.click();

uploadImageInput.onchange = async () => {
  const file = uploadImageInput.files[0];
  if (!file || !currentCharacter) return;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch(
      `/characters/${currentCharacter.id}/upload`,
      { method: "POST", body: formData }
    );

    const data = await res.json();
    currentCharacter.imageList = data.imageList;

    characterImage.src =
      `/chat/assets/${data.imageList.split(",")[0]}`;

  } catch (err) {
    console.error("Image upload failed:", err);
  }
};

/* =============================
   Event Bindings
============================= */
characterSelect.onchange = () =>
  setCharacter(characterSelect.value);

newSessionBtn.onclick = clearChat;

sendBtn.onclick = sendMessage;

userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/* =============================
   Init
============================= */
loadCharacters();
