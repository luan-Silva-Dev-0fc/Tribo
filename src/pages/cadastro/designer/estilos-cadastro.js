import { StyleSheet, Platform } from "react-native";

export const CORES_CADASTRO = {
  submitText: "#ffffff",
  fundoEscuro: "#000000",
  fundoClaro: "#F5F5F7",
  googleVerified: "#10B981",
  bioCounter: "#9EA0A5"
};

export const estilosCadastro = StyleSheet.create({
  containerPrincipal: {
    flex: 1,
    backgroundColor: "#000000"
  },

  flex: {
    flex: 1
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24
  },

  ambientGlow: {
    position: "absolute",
    top: "10%",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(0, 149, 246, 0.08)",
    pointerEvents: "none"
  },

  cabecalho: {
    width: "100%",
    maxWidth: 440,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4
  },

  botaoVoltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center"
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },

  logoTexto: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    letterSpacing: -0.5
  },

  cardFlutuante: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: "0px 16px 40px rgba(0,0,0,0.3)"
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 10
      }
    })
  },

  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 18
  },

  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2
  },

  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 14,
    gap: 6
  },

  badgeText: {
    fontSize: 12.5,
    fontFamily: "Poppins_600SemiBold"
  },

  tituloCard: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
    letterSpacing: -0.3
  },

  descricaoCard: {
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
    marginBottom: 20
  },

  field: {
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 12
  },

  fieldInput: {
    flex: 1,
    alignSelf: "stretch",
    paddingHorizontal: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 14
  },

  fieldRightIcon: {
    padding: 6
  },

  submit: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },

  submitText: {
    color: CORES_CADASTRO.submitText,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15
  },

  skipButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6
  },

  skipButtonText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5
  },

  secondaryButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12
  },

  secondaryButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  },

  stepCenter: {
    alignItems: "stretch"
  },

  avatarPreviewContainer: {
    alignSelf: "center",
    position: "relative",
    marginVertical: 16
  },

  avatarPreview: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2
  },

  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  avatarCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff"
  },

  bioContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14
  },

  bioInput: {
    minHeight: 96,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    textAlignVertical: "top"
  },

  bioCounter: {
    alignSelf: "flex-end",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: CORES_CADASTRO.bioCounter,
    marginTop: 6
  },

  linkText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5
  },

  backToLoginBottom: {
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 6
  },

  googleVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 4
  },

  googleVerifiedText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: CORES_CADASTRO.googleVerified
  }
});