import { dom } from "./dom.js";
import { setHeader, unlockHeader } from "./headerState.js";

let hoverActive = false;
let inactivityTimer = null;
const INACTIVITY_MS = 30000/3; // 30 seconds

// Reference to sleep overlay
const overlay = document.getElementById("sleepOverlay");

// --- Show overlay ---
function showOverlay() {
  overlay.style.display = "flex";
  setHeader("lay", true);
}

// --- Hide overlay ---
function hideOverlay() {
  overlay.style.display = "none";
  unlockHeader();
}

// --- Reset inactivity timer ---
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    showOverlay();
  }, INACTIVITY_MS);
}

// --- User activity handler ---
function userActivity() {
  if (overlay.style.display === "flex") {
    hideOverlay(); // hide overlay on any activity
  }
  if (!dom.header.classList.contains("lay")) {
    resetInactivityTimer();
    if (!hoverActive) setHeader("idle");
  }
}

// Listen for user activity globally
["mousemove", "mousedown", "keydown", "touchstart"].forEach(evt => {
  document.addEventListener(evt, userActivity);
});

// Initialize timer
resetInactivityTimer();

// --- Hover interaction ---
dom.header.addEventListener("mouseenter", () => {
  if (!hoverActive && overlay.style.display !== "flex") {
    hoverActive = true;
    setHeader("shy");
  }
});

dom.header.addEventListener("mouseleave", () => {
  if (hoverActive && overlay.style.display !== "flex") {
    hoverActive = false;
    setHeader("idle");
  }
});

// --- Click interaction ---
dom.header.addEventListener("click", () => {
  if (overlay.style.display !== "flex") {
    setHeader("punch", true);
    setTimeout(() => {
      unlockHeader();
      resetInactivityTimer();
    }, 1000);
  }
});
