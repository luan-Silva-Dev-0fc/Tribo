import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
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
      offlineAccess: false,
    });
    isConfigured = true;
  } catch (err) {
    console.warn("[GoogleAuth] Erro ao configurar GoogleSignin:", err?.message);
  }
}

/**
 * Executa o fluxo de autenticação nativa com o Google no Android / iOS.
 * Suporta login direto e retorno de dados para auto-preenchimento no cadastro.
 */
export async function handleGoogleLogin({ onAuthenticated, onNewUser } = {}) {
  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Força a tela de seleção de conta deslogando a sessão anterior do aparelho
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Ignora erro se não houver usuário logado no GoogleSignin local
    }

    const response = await GoogleSignin.signIn();
    const idToken = response?.data?.idToken || response?.idToken;
    const googleUser = response?.data?.user || response?.user || {};

    const profileData = {
      idToken,
      email: googleUser.email || response?.data?.user?.email || "",
      fullName:
        googleUser.name ||
        [googleUser.givenName, googleUser.familyName]
          .filter(Boolean)
          .join(" ") ||
        "",
      givenName: googleUser.givenName || "",
      familyName: googleUser.familyName || "",
      avatarUrl: googleUser.photo || "",
      isGoogleProvider: true,
    };

    if (!idToken && !profileData.email) {
      throw new Error(
        "Não foi possível capturar os dados de autenticação do Google."
      );
    }

    let authenticatedUser = null;
    let token = null;

    // 1. Tenta autenticar diretamente com a API da Tribo
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

      // 2. Tenta via Supabase signInWithIdToken
      if (idToken && supabase?.auth?.signInWithIdToken) {
        try {
          const { data: supaData, error: supaError } =
            await supabase.auth.signInWithIdToken({
              provider: "google",
              token: idToken,
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
        googleProfile: profileData,
      };
    }

    // Se não logou diretamente (usuário novo que precisa cadastrar/completar perfil):
    if (onNewUser) {
      onNewUser(profileData);
    }

    return {
      idToken,
      user: authenticatedUser,
      token,
      googleProfile: profileData,
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
