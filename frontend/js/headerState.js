// ==============================
// headerState.js — manages Seekura header states (idle, shy, laugh, handsign, lay, punch)
// ==============================

// Exported initializer for header state handling
export function initHeaderState(headerImage) {
  let currentHeaderState = "idle";
  let headerLock = false;

  function setHeaderState(state, lock = false) {
    headerImage.classList.remove("lay", "lay-breathe", "punch-shake");

    if (headerLock && !lock) return; // Don't override a locked state

    switch (state) {
      case "idle": headerImage.src = "/assets/seekura.jpg"; break;
      case "handsign": headerImage.src = "/assets/seekura_handsign.jpg"; break;
      case "laugh": headerImage.src = "/assets/seekura_laugh.jpg"; break;
      case "shy": headerImage.src = "/assets/seekura_shy.jpg"; break;
      case "punch": headerImage.src = "/assets/seekura_punch.jpg"; break;
      case "lay":
        headerImage.src = "/assets/seekura_lay.jpg";
        headerImage.classList.add("lay", "lay-breathe");
        break;
    }

    currentHeaderState = state;
    headerLock = lock;
  }

  function unlockHeader() {
    headerLock = false;
    if (currentHeaderState !== "lay") setHeaderState("idle");
  }

  // Hover interactions
  headerImage.addEventListener("mouseenter", () => {
    if (!headerLock) setHeaderState("shy");
  });
  headerImage.addEventListener("mouseleave", () => {
    if (!headerLock) setHeaderState("idle");
  });
  headerImage.addEventListener("click", () => {
    setHeaderState("punch", true);
    headerImage.classList.add("punch-shake");
    setTimeout(() => {
      headerImage.classList.remove("punch-shake");
      if (!headerLock) setHeaderState("idle");
    }, 3000);
  });

  return { setHeaderState, unlockHeader };
}
