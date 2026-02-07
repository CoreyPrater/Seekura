import { state } from "./state.js";
import { savePersonality } from "./api.js";

const editBtn = document.getElementById("editPersonalityBtn");
const popup = document.getElementById("personalityPopup");
const input = document.getElementById("systemPromptInput");
const saveBtn = document.getElementById("savePromptBtn");
const cancelBtn = document.getElementById("cancelPromptBtn");
const badge = document.getElementById("characterBadge");

export function bindPersonalityEditor() {
  // Open editor popup and fill with current profile
  editBtn.onclick = () => {
    if (!state.currentCharacter) return;
    input.value = state.currentCharacter.character_profile || "";
    popup.classList.remove("popup-hidden");
    input.focus();
  };

  // Save updated personality
  saveBtn.onclick = async () => {
   debugger;
    if (!state.currentCharacter) return;

    const newProfile = input.value.trim();
    if (!newProfile) return alert("Personality cannot be empty.");

    try {
      console.log("[PersonalityEditor] Saving profile for:", state.currentCharacter.id);
      const updated = await savePersonality(state.currentCharacter.id, newProfile);

      // Merge updated profile into frontend state safely
      state.currentCharacter = {
        ...state.currentCharacter,
        character_profile: updated.character_profile ?? state.currentCharacter.character_profile,
        name: updated.name ?? state.currentCharacter.name,
        imageList: updated.imageList ?? state.currentCharacter.imageList,
        current_image: updated.current_image ?? state.currentCharacter.current_image,
        tone: updated.tone ?? state.currentCharacter.tone,
        memory_summary: updated.memory_summary ?? state.currentCharacter.memory_summary,
      };

      badge.textContent = state.currentCharacter.name || "No Character Molded";
      popup.classList.add("popup-hidden");

      console.log("[PersonalityEditor] Personality saved successfully:", state.currentCharacter);
    } catch (err) {
      console.error("[PersonalityEditor] Failed to save personality:", err);
      alert("Error saving personality. See console for details.");
    }
  };

  // Cancel button closes popup without saving
  cancelBtn.onclick = () => popup.classList.add("popup-hidden");
}
