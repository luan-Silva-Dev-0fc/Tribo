export const GOOGLE_WEB_CLIENT_ID =
"182013147973-obbsctpkrptmnf1bco7kua29i24bvviq.apps.googleusercontent.com";

export function configureGoogleSignIn() {

}




export async function handleGoogleLogin({ onAuthenticated, onNewUser } = {}) {
  throw new Error(
    "O login nativo com Google está disponível no aplicativo móvel (Android/iOS)."
  );
}