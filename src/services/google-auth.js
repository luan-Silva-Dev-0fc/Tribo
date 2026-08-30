import { Platform } from "react-native";
import * as NativeAuth from "./google-auth.native";
import * as WebAuth from "./google-auth.web";

const selected = Platform.OS === "web" ? WebAuth : NativeAuth;

export const GOOGLE_WEB_CLIENT_ID = selected.GOOGLE_WEB_CLIENT_ID;
export const configureGoogleSignIn = selected.configureGoogleSignIn;
export const handleGoogleLogin = selected.handleGoogleLogin;
export const signOutGoogle = selected.signOutGoogle;
