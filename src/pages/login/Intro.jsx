import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Text } from "react-native";
import { StatusBar } from "expo-status-bar";

const logoSource = require("../../../assets/icon.png");

export default function IntroScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    // 1. Fade In and Scale Up simultaneously
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Wait 1.2 seconds, then Fade Out gracefully
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400, // Quick fade out for a smooth transition to Feed
          useNativeDriver: true,
        }).start(() => {
          onFinish(); // Tell the app to show the Feed!
        });
      }, 1200); 
    });
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Tribo</Text>
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
    zIndex: 9999,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
    borderRadius: 24, // Optional: smooth the icon edges if it's perfectly square
  },
  title: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 3,
    textShadowColor: "rgba(255, 255, 255, 0.3)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
});
