





import { Dimensions, StyleSheet } from "react-native";

const { height: ALTURA_TELA } = Dimensions.get("window");


const ALTURA_TOPO = ALTURA_TELA * 0.28;

export const CORES_CADASTRO = {
  submitText: "#ffffff",
  fundoEscuro: "#0D0D0D",
  fundoClaro: "#F5F5F7",
  googleVerified: "#10B981",
  bioCounter: "#9EA0A5"
};

export const estilosCadastro = StyleSheet.create({



  containerPrincipal: {
    flex: 1
  },

  fundoAbsoluto: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },

  topoFundoEscuro: {
    height: ALTURA_TOPO,
    backgroundColor: CORES_CADASTRO.fundoEscuro
  },

  corpoFundoClaro: {
    flex: 1,
    backgroundColor: CORES_CADASTRO.fundoClaro
  },

  flex: {
    flex: 1
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
    paddingHorizontal: 20
  },



  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ALTURA_TOPO * 0.28,
    marginBottom: 20,
    paddingHorizontal: 4
  },

  botaoVoltar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },

  logoTexto: {
    color: "#FFFFFF",
    fontFamily: "System",
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: -0.5
  },



  cardFlutuante: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 32,
    marginTop: -(ALTURA_TOPO * 0.2),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6
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
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6
  },

  badgeText: {
    fontSize: 13,
    fontWeight: "600"
  },

  tituloCard: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: -0.4
  },

  descricaoCard: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22
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
    fontFamily: "System",
    fontWeight: "400",
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
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 15
  },

  skipButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },

  skipButtonText: {
    fontFamily: "System",
    fontWeight: "500",
    fontSize: 14
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
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 14
  },



  stepCenter: {
    alignItems: "stretch"
  },

  avatarPreviewContainer: {
    alignSelf: "center",
    position: "relative",
    marginVertical: 18
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
    fontFamily: "System",
    fontSize: 14,
    textAlignVertical: "top"
  },

  bioCounter: {
    alignSelf: "flex-end",
    fontFamily: "System",
    fontSize: 11,
    color: CORES_CADASTRO.bioCounter,
    marginTop: 6
  },



  linkText: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 13.5
  },

  backToLoginBottom: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8
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
    fontFamily: "System",
    fontSize: 12,
    fontWeight: "500",
    color: CORES_CADASTRO.googleVerified
  }
});