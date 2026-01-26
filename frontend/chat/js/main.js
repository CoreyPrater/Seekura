// main.js

import { initUserId } from "./state.js";
import { loadCharacters, bindCharacterSelect } from "./ui-character.js";
import { bindChatEvents } from "./events.js";
import { bindPersonalityEditor } from "./ui-personality.js";
import { loadSessionMessages } from "./loadSessionMessages.js";

initUserId();
bindChatEvents();
bindPersonalityEditor();

loadCharacters();

bindCharacterSelect(async (character) => {
  await loadSessionMessages(character.id);
});
