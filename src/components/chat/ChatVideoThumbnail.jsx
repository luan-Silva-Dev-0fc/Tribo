import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";

export const ChatVideoThumbnail = React.memo(function ChatVideoThumbnail({
  url,
  onPress,
  onLongPress
}) {
  if (!url || typeof url !== "string" || !url.trim()) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={200}
        style={styles.chatVideoBox}
      />
    );
  }
  return (
    <ActiveChatVideoThumbnailInner
      url={url}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  );
});

function ActiveChatVideoThumbnailInner({ url, onPress, onLongPress }) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      Promise.resolve(p.play()).catch(() => {});
    } catch (e) {}
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
      style={styles.chatVideoBox}
    >
      {isMountedRef.current && player ? (
        <VideoView
          key={url}
          player={player}
          nativeControls={false}
          contentFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <View style={{ width: "100%", height: "100%", backgroundColor: "#18181b" }} />
      )}
      <View pointerEvents="none" style={styles.chatVideoOverlay}>
        <View style={styles.chatVideoPlayBadge}>
          <Ionicons name="play" size={24} color="#ffffff" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chatVideoBox: {
    width: 220,
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#09090b",
    position: "relative"
  },
  chatVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)"
  },
  chatVideoPlayBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center"
  }
});
