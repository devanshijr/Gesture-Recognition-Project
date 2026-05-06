// Gesture classifier using MediaPipe Hands 21 landmarks.
// Landmarks: 0=wrist, 1-4=thumb, 5-8=index, 9-12=middle, 13-16=ring, 17-20=pinky.

const TIP = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIP = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };
const MCP = { thumb: 2, index: 5, middle: 9, ring: 13, pinky: 17 };

function isFingerExtended(lm, finger) {
  // For non-thumb fingers: tip y < pip y (image-coords y grows downwards) means extended (when palm faces camera).
  if (finger === "thumb") {
    // Use x distance vs MCP, since thumb opens sideways. Detect by tip-mcp distance > pip-mcp distance.
    const tip = lm[TIP.thumb];
    const pip = lm[PIP.thumb];
    const mcp = lm[MCP.thumb];
    const dTip = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
    const dPip = Math.hypot(pip.x - mcp.x, pip.y - mcp.y);
    return dTip > dPip * 1.15;
  }
  return lm[TIP[finger]].y < lm[PIP[finger]].y - 0.02;
}

function thumbDirection(lm) {
  // Returns "up", "down", or "side" relative to wrist.
  const wrist = lm[0];
  const tip = lm[TIP.thumb];
  const dy = tip.y - wrist.y; // negative = above wrist (up)
  const dx = Math.abs(tip.x - wrist.x);
  if (dy < -0.12 && Math.abs(dy) > dx * 0.6) return "up";
  if (dy > 0.12 && Math.abs(dy) > dx * 0.6) return "down";
  return "side";
}

export function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return { gesture: "none", confidence: 0 };

  const fingers = {
    thumb: isFingerExtended(landmarks, "thumb"),
    index: isFingerExtended(landmarks, "index"),
    middle: isFingerExtended(landmarks, "middle"),
    ring: isFingerExtended(landmarks, "ring"),
    pinky: isFingerExtended(landmarks, "pinky"),
  };
  const extendedCount = Object.values(fingers).filter(Boolean).length;

  // Open Palm: 4 or 5 fingers extended (index + middle + ring + pinky at minimum)
  if (fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
    return { gesture: "open_palm", confidence: 0.92 };
  }

  // Fist: 0 or 1 (thumb may stick out a bit) extended; specifically index..pinky all curled
  if (!fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    // distinguish thumbs up/down from fist:
    if (fingers.thumb) {
      const dir = thumbDirection(landmarks);
      if (dir === "up") return { gesture: "thumbs_up", confidence: 0.9 };
      if (dir === "down") return { gesture: "thumbs_down", confidence: 0.9 };
    }
    return { gesture: "fist", confidence: 0.92 };
  }

  // Peace / V: index + middle extended, ring + pinky curled
  if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
    return { gesture: "peace", confidence: 0.9 };
  }

  // Point: only index extended
  if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    return { gesture: "point", confidence: 0.9 };
  }

  return { gesture: "unknown", confidence: 0.4 + extendedCount * 0.05 };
}

export const GESTURE_LABELS = {
  open_palm: "OPEN PALM",
  fist: "FIST",
  thumbs_up: "THUMBS UP",
  thumbs_down: "THUMBS DOWN",
  peace: "PEACE",
  point: "POINT",
  unknown: "UNKNOWN",
  none: "NO HAND",
};

export const GESTURE_ACTIONS = {
  open_palm: "POWER_ON",
  fist: "POWER_OFF",
  thumbs_up: "INCREASE_LEVEL",
  thumbs_down: "DECREASE_LEVEL",
  peace: "SELECT_NEXT",
  point: "SELECT_CONFIRM",
};
