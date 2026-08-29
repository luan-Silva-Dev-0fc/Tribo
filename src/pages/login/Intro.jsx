import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Text } from "react-native";
import { StatusBar } from "expo-status-bar";

const logoSource = require("../../../assets/icon.png");

export default function IntroScreen({ onFinish }) {
  const containerFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(12)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(containerFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true
        }),
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.spring(glowScale, {
          toValue: 1.1,
          friction: 6,
          tension: 35,
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.delay(150),
          Animated.parallel([
            Animated.timing(titleFade, {
              toValue: 1,
              duration: 450,
              useNativeDriver: true
            }),
            Animated.spring(titleTranslateY, {
              toValue: 0,
              friction: 6,
              tension: 45,
              useNativeDriver: true
            })
          ])
        ])
      ])
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(containerFade, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(exitScale, {
            toValue: 1.04,
            duration: 400,
            useNativeDriver: true
          })
        ]).start(() => {
          if (typeof onFinish === "function") {
            onFinish();
          }
        });
      }, 1100);
    });
  }, [containerFade, logoScale, logoFade, titleFade, titleTranslateY, glowScale, glowOpacity, exitScale, onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: containerFade,
            transform: [{ scale: exitScale }]
          }
        ]}>
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.darkAura,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }]
              }
            ]}
          />
          <View style={styles.logoBorder}>
            <Animated.Image
              source={logoSource}
              style={[
                styles.logo,
                {
                  opacity: logoFade,
                  transform: [{ scale: logoScale }]
                }
              ]}
              resizeMode="contain"
            />
          </View>
        </View>

        <Animated.View
          style={{
            alignItems: "center",
            opacity: titleFade,
            transform: [{ translateY: titleTranslateY }]
          }}>
          <Text style={styles.title}>Tribo</Text>
          <Text style={styles.subtitle}>Sua comunidade em tempo real</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },
  content: {
    alignItems: "center",
    justifyContent: "center"
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 16
  },
  darkAura: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  logoBorder: {
    borderRadius: 28,
    padding: 2,
    backgroundColor: "#16161a",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 26
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.5,
    textAlign: "center"
  },
  subtitle: {
    color: "#8E8E93",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    letterSpacing: 0.2,
    marginTop: 3,
    textAlign: "center"
  }
});