import {
  GoogleSignin,
  statusCodes } from
"@react-native-google-signin/google-signin";
import { api, session } from "../api";
import { supabase } from "../lib/supabase";
import { unwrap } from "../lib/format";

export const GOOGLE_WEB_CLIENT_ID =
"182013147973-obbsctpkrptmnf1bco7kua29i24bvviq.apps.googleusercontent.com";

let isConfigured = false;

export function configureGoogleSignIn() {
  if (isConfigured) return;
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false
    });
    isConfigured = true;
  } catch (err) {
    console.warn("[GoogleAuth] Erro ao configurar GoogleSignin:", err?.message);
  }
}





export async function handleGoogleLogin({ onAuthenticated, onNewUser } = {}) {
  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });


    try {
      await GoogleSignin.signOut();
    } catch (e) {

    }

    const response = await GoogleSignin.signIn();
    const idToken = response?.data?.idToken || response?.idToken;
    const googleUser = response?.data?.user || response?.user || {};

    const profileData = {
      idToken,
      email: googleUser.email || response?.data?.user?.email || "",
      fullName:
      googleUser.name ||
      [googleUser.givenName, googleUser.familyName].
      filter(Boolean).
      join(" ") ||
      "",
      givenName: googleUser.givenName || "",
      familyName: googleUser.familyName || "",
      avatarUrl: googleUser.photo || "",
      isGoogleProvider: true
    };

    if (!idToken && !profileData.email) {
      throw new Error(
        "Não foi possível capturar os dados de autenticação do Google."
      );
    }

    let authenticatedUser = null;
    let token = null;


    try {
      if (idToken) {
        const backendRes = await api.auth.google(idToken);
        token =
        backendRes?.token ||
        backendRes?.data?.token ||
        backendRes?.accessToken;
        if (token) {
          await session.save(token);
        }
        authenticatedUser =
        unwrap(backendRes, "user") ||
        backendRes?.user ||
        backendRes?.data?.user;
      }
    } catch (backendError) {
      console.warn(
        "[GoogleAuth] api.auth.google falhou, tentando Supabase fallback:",
        backendError?.message
      );


      if (idToken && supabase?.auth?.signInWithIdToken) {
        try {
          const { data: supaData, error: supaError } =
          await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken
          });

          if (!supaError && supaData?.user) {
            token = supaData?.session?.access_token;
            if (token) {
              await session.save(token);
            }
            authenticatedUser = supaData?.user;
          }
        } catch (supaErr) {
          console.warn("[GoogleAuth] Fallback Supabase:", supaErr?.message);
        }
      }
    }

    if (authenticatedUser && onAuthenticated) {
      onAuthenticated(authenticatedUser);
      return {
        idToken,
        user: authenticatedUser,
        token,
        googleProfile: profileData
      };
    }


    if (onNewUser) {
      onNewUser(profileData);
    }

    return {
      idToken,
      user: authenticatedUser,
      token,
      googleProfile: profileData
    };
  } catch (error) {
    if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
      console.log("[GoogleAuth] Operação cancelada pelo usuário.");
      return null;
    } else if (error?.code === statusCodes?.IN_PROGRESS) {
      console.log("[GoogleAuth] Login em andamento.");
      return null;
    } else if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error(
        "Google Play Services indisponível ou desatualizado no dispositivo."
      );
    }
    throw error;
  }
}