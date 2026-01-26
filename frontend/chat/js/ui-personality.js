import { state } from "./state.js";
import { savePersonality } from "./api.js";

const editBtn = document.getElementById("editPersonalityBtn");
const popup = document.getElementById("personalityPopup");
const input = document.getElementById("systemPromptInput");
const saveBtn = document.getElementById("savePromptBtn");
const cancelBtn = document.getElementById("cancelPromptBtn");
const badge = document.getElementById("characterBadge");

export function bindPersonalityEditor() {
  editBtn.onclick = () => {
    if (!state.currentCharacter) return;
    input.value = state.currentCharacter.character_profile || "";
    popup.classList.remove("popup-hidden");
  };

  saveBtn.onclick = async () => {
    if (!state.currentCharacter) return;

    const updated = await savePersonality(
      state.currentCharacter.id,
      input.value
    );

    state.currentCharacter = updated;
    badge.textContent = updated.name || "No Character Molded";
    popup.classList.add("popup-hidden");
  };

  cancelBtn.onclick = () => popup.classList.add("popup-hidden");
}
