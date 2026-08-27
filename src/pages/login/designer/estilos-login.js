import { StyleSheet, Platform } from "react-native";

export const CORES_LOGIN = {
  placeholder: "#9EA0A5",
  submitText: "#ffffff",
  dividerText: "#A1A6AC",
  fundoEscuro: "#000000",
  fundoClaro: "#F5F5F7"
};

export const estilosLogin = StyleSheet.create({
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

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24
  },

  logoTexto: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 38,
    letterSpacing: -0.5
  },

  cardFlutuante: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 24,
    paddingTop: 28,
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
    marginTop: 6
  },

  submitText: {
    color: CORES_LOGIN.submitText,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15
  },

  links: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16
  },

  linkText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16
  },

  dividerLine: {
    height: 1,
    flex: 1
  },

  dividerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: CORES_LOGIN.dividerText
  },

  social: {
    gap: 12
  },

  socialButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10
  },

  socialIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain"
  },

  socialText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5
  }
});