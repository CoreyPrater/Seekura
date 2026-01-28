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


if (!crypto.randomUUID) {
  crypto.randomUUID = () => {
    // simple UUID v4 polyfill
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}