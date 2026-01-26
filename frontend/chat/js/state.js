export const state = {
  userId: null,
  sessionId: null,
  currentCharacter: null,
  characters: [],
  messages: [],
};

// Optional helper function
export function initUserId() {
  if (!state.userId) state.userId = crypto.randomUUID();
  return state.userId;
}
