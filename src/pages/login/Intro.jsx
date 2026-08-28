import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Text } from "react-native";
import { StatusBar } from "expo-status-bar";

const logoSource = require("../../../assets/icon.png");

export default function IntroScreen({ onFinish }) {
  const containerFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(14)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(containerFade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5.5,
          tension: 45,
          useNativeDriver: true
        }),
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.spring(glowScale, {
          toValue: 1.2,
          friction: 6,
          tension: 40,
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([
            Animated.timing(titleFade, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true
            }),
            Animated.spring(titleTranslateY, {
              toValue: 0,
              friction: 6,
              tension: 50,
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
            duration: 450,
            useNativeDriver: true
          }),
          Animated.timing(exitScale, {
            toValue: 1.06,
            duration: 450,
            useNativeDriver: true
          })
        ]).start(() => {
          if (typeof onFinish === "function") {
            onFinish();
          }
        });
      }, 1000);
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
              styles.glow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }]
              }
            ]}
          />
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

        <Animated.View
          style={{
            opacity: titleFade,
            transform: [{ translateY: titleTranslateY }]
          }}>
          <Text style={styles.title}>Tribo</Text>
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
    marginBottom: 6
  },
  glow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(245, 158, 11, 0.22)"
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 26
  },
  title: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 2,
    textShadowColor: "rgba(255, 255, 255, 0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10
  }
});