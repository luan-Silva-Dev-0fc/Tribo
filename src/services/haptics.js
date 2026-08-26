let Haptics = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {}

export async function triggerLightHaptic() {
  try {
    if (Haptics?.impactAsync) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (e) {}
}

export async function triggerMediumHaptic() {
  try {
    if (Haptics?.impactAsync) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (e) {}
}
