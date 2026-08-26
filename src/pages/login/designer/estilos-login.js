/**
 * Designer da tela de Login.
 * Estrutura: fundo absoluto dividido (preto/claro) + card flutuante sobreposto.
 */

import { Dimensions, StyleSheet, Platform } from "react-native";

const { height: ALTURA_TELA } = Dimensions.get("window");

// Proporção do topo escuro: 32% da tela garante que o card sempre corte a divisão
const ALTURA_TOPO = ALTURA_TELA * 0.32;

export const CORES_LOGIN = {
  placeholder: "#9EA0A5",
  submitText: "#ffffff",
  dividerText: "#A1A6AC",
  fundoEscuro: "#0D0D0D",
  fundoClaro: "#F5F5F7",
};

export const estilosLogin = StyleSheet.create({

  // ─── 1. ESTRUTURA GERAL ──────────────────────────────────────────────────

  containerPrincipal: {
    flex: 1,
  },

  // Fundo em posição absoluta: preenche tudo por baixo do conteúdo
  fundoAbsoluto: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Faixa escura superior (32% da altura)
  topoFundoEscuro: {
    height: ALTURA_TOPO,
    backgroundColor: CORES_LOGIN.fundoEscuro,
  },

  // Faixa clara que ocupa o restante
  corpoFundoClaro: {
    flex: 1,
    backgroundColor: CORES_LOGIN.fundoClaro,
  },

  // Camada de conteúdo (scroll + card) — fica por cima do fundo absoluto
  flex: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },

  // ─── 2. LOGO ─────────────────────────────────────────────────────────────

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    // Centraliza dentro da faixa escura (subido mais pro topo a pedido):
    marginTop: ALTURA_TOPO * 0.15,
    marginBottom: (ALTURA_TOPO * 0.28) + 32, // Compensa a margem negativa do card para evitar sobreposição
    alignSelf: "center",
  },

  logoTexto: {
    color: "#FFFFFF",
    fontFamily: "System",
    fontWeight: "800",
    fontSize: 42,
    letterSpacing: -1,
  },

  // ─── 3. CARD FLUTUANTE ───────────────────────────────────────────────────

  cardFlutuante: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 40,
    // margem negativa puxa o card sobre a divisão de cores
    marginTop: -(ALTURA_TOPO * 0.28),
    ...Platform.select({
      web: {
        boxShadow: "0px 24px 48px rgba(0,0,0,0.12)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 12,
      },
    }),
  },

  // ─── 4. BADGE / CABEÇALHO DO CARD ────────────────────────────────────────

  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },

  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },

  tituloCard: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: -0.4,
  },

  descricaoCard: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },

  // ─── 5. FORMULÁRIO ───────────────────────────────────────────────────────

  field: {
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 12,
  },

  fieldInput: {
    flex: 1,
    alignSelf: "stretch",
    paddingHorizontal: 10,
    fontFamily: "System",
    fontWeight: "400",
    fontSize: 14,
  },

  fieldRightIcon: {
    padding: 6,
  },

  submit: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  submitText: {
    color: CORES_LOGIN.submitText,
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 15,
  },

  links: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 18,
  },

  linkText: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 13.5,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  dividerLine: {
    height: 1,
    flex: 1,
  },

  dividerText: {
    fontFamily: "System",
    fontWeight: "400",
    fontSize: 14,
    color: CORES_LOGIN.dividerText,
  },

  social: {
    gap: 12,
  },

  socialButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  socialIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },

  socialText: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 14,
  },
});
