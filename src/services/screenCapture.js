/**
 * Helper seguro para controle de captura e gravação de tela
 */
let ScreenCapture = null;
try {
  ScreenCapture = require("expo-screen-capture");
} catch (e) {}

export async function enableScreenCaptureProtection() {
  try {
    if (ScreenCapture?.preventScreenCaptureAsync) {
      await ScreenCapture.preventScreenCaptureAsync();
    }
  } catch (e) {
    console.warn("Aviso ao ativar proteção de tela:", e?.message);
  }
}

export async function disableScreenCaptureProtection() {
  try {
    if (ScreenCapture?.allowScreenCaptureAsync) {
      await ScreenCapture.allowScreenCaptureAsync();
    }
  } catch (e) {
    console.warn("Aviso ao desativar proteção de tela:", e?.message);
  }
}
