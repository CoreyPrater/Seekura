// ui-character.js

import { state } from "./state.js";
import { loadCharactersFromAPI } from "./api.js";
import { startChatSession } from "./chatSession.js";

const characterListEl = document.getElementById("characterSelect");
let selectionCallback = null;

export async function loadCharacters() {
  const characters = await loadCharactersFromAPI();
  characterListEl.innerHTML = "";

  characters.forEach(char => {
    const option = document.createElement("option");
    option.value = char.id;
    option.textContent = char.name;
    characterListEl.appendChild(option);
  });

  characters.sort((a, b) => a.name.localeCompare(b.name));
  if (characters.length > 0) {
    characterListEl.value = characters[0].id;
    selectCharacter(characters[0]);
  }
}

export function bindCharacterSelect(cb) {
  selectionCallback = cb;

  characterListEl.addEventListener("change", async () => {
    const selectedId = characterListEl.value;
    const characters = await loadCharactersFromAPI();
    const character = characters.find(c => String(c.id) === String(selectedId));
    if (character) selectCharacter(character);
  });
}

export function selectCharacter(character) {
  state.currentCharacter = character;
  state.systemPrompt = character.character_profile || null; // ✅ cache personality

  const badgeEl = document.getElementById("characterBadge");
  if (badgeEl) badgeEl.textContent = character.name;

  const imgEl = document.getElementById("characterImage");
  let imgList = null;

  if (character.imageList?.length) {
    imgList = character.imageList.split(",");
  }

  if (imgEl && imgList?.length) {
    imgEl.src = "chat/assets/" + imgList[0];
  } else if (imgEl) {
    imgEl.src = "chat/assets/NoMold.png";
  }

  startChatSession(character).catch(err => {
    console.error("Failed to start session:", err);
  });

  if (selectionCallback) selectionCallback(character);
}
