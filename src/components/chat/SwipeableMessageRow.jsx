import React, { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { triggerLightHaptic } from "../../services/haptics";

const SWIPE_THRESHOLD = 65;
const MAX_SWIPE_DISTANCE = 90;

export const SwipeableMessageRow = React.memo(function SwipeableMessageRow({
  children,
  item,
  onSwipeToReply,
  isHighlighted,
  disabled = false,
}) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const hasTriggeredHaptic = useRef(false);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  // Animação de pulso/highlight quando o usuário toca em uma mensagem citada
  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0.3,
          duration: 350,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isHighlighted]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabledRef.current) return false;
        return gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (disabledRef.current) return false;
        // Intercepta e captura o gesto horizontal mesmo se os filhos forem Pressables (figurinhas, áudio, vídeos)
        return gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
      },
      onPanResponderGrant: () => {
        hasTriggeredHaptic.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          // Deslizando para a direita com amortecimento
          const damping = 1 + gestureState.dx / 120;
          const currentX = Math.min(MAX_SWIPE_DISTANCE, gestureState.dx / damping);
          translateX.setValue(currentX);

          if (gestureState.dx >= SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
            hasTriggeredHaptic.current = true;
            triggerLightHaptic();
          } else if (gestureState.dx < SWIPE_THRESHOLD && hasTriggeredHaptic.current) {
            hasTriggeredHaptic.current = false;
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SWIPE_THRESHOLD) {
          onSwipeToReply?.(item);
        }
        hasTriggeredHaptic.current = false;
        Animated.spring(translateX, {
          toValue: 0,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        hasTriggeredHaptic.current = false;
        Animated.spring(translateX, {
          toValue: 0,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Interpolações para o ícone de resposta na camada de fundo
  const iconScale = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD, MAX_SWIPE_DISTANCE],
    outputRange: [0.4, 0.7, 1.1, 1.2],
    extrapolate: "clamp",
  });

  const iconOpacity = translateX.interpolate({
    inputRange: [0, 15, SWIPE_THRESHOLD * 0.7, SWIPE_THRESHOLD],
    outputRange: [0, 0.4, 0.8, 1],
    extrapolate: "clamp",
  });

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "transparent",
      colors.mode === "dark" ? "rgba(2, 132, 199, 0.22)" : "rgba(2, 132, 199, 0.15)",
    ],
  });

  return (
    <Animated.View
      style={[
        styles.rowWrapper,
        { backgroundColor: highlightBg },
      ]}
    >
      {/* Camada Traseira com o Ícone Vetorial de Resposta */}
      <View style={styles.backLayer}>
        <Animated.View
          style={[
            styles.replyIconContainer,
            {
              backgroundColor: colors.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
              transform: [{ scale: iconScale }],
              opacity: iconOpacity,
            },
          ]}
        >
          <Ionicons
            name="arrow-undo"
            size={17}
            color={colors.primary || "#0284c7"}
          />
        </Animated.View>
      </View>

      {/* Conteúdo da Mensagem Deslizável */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.messageContent,
          { transform: [{ translateX }] },
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  rowWrapper: {
    width: "100%",
    position: "relative",
    borderRadius: 14,
    marginVertical: 1,
  },
  backLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 14,
    zIndex: 0,
  },
  replyIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  messageContent: {
    width: "100%",
    zIndex: 1,
  },
});
