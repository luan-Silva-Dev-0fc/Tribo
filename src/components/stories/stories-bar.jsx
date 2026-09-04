import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View } from
"react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../api";
import { Avatar } from "../ui/ui";
import { CreateStoryModal } from "../modals/create-story-modal";
import { StoryViewerModal } from "../modals/story-viewer-modal";
import { userName } from "../../lib/format";
import { useTheme } from "../../theme";

export function StoriesBar({ user, onStoryChange }) {
  const { colors } = useTheme();
  const [userGroups, setUserGroups] = useState([]);
  const [myGroup, setMyGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.stories.list();
      const rawList = Array.isArray(res) ?
      res :
      res?.stories || res?.data || [];


      const groupsMap = new Map();
      const currentUid = String(user?.id || user?.userId || "");

      rawList.forEach((story) => {
        const u = story.user || story.author || {};
        const uId = String(
          u.id ||
          story.userId ||
          story.user_id ||
          story.author_id ||
          story.authorId ||
          ""
        );
        if (!uId) return;

        const resolvedUser =
        Object.keys(u).length > 0 ?
        u :
        uId === currentUid && user ?
        user :
        { id: uId };

        if (!groupsMap.has(uId)) {
          groupsMap.set(uId, {
            user: resolvedUser,
            userId: uId,
            stories: [],
            hasUnseen: true
          });
        }
        groupsMap.get(uId).stories.push(story);
      });

      let own = null;
      const others = [];

      groupsMap.forEach((group, id) => {
        const hasUnseen = group.stories.some(
          (s) => !s.is_seen && !s.isSeen && !s.viewed && !s.has_viewed
        );
        const updatedGroup = { ...group, hasUnseen };

        if (id === currentUid) {
          own = {
            ...updatedGroup,
            user: user || group.user
          };
        } else {
          others.push(updatedGroup);
        }
      });

      setMyGroup(own);
      setUserGroups(others);
    } catch {

    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const handleOpenViewer = (group) => {
    setSelectedGroup(group);
    setViewerVisible(true);
  };

  const handleStoryDeleted = (deletedId) => {
    loadStories();
    onStoryChange?.();
  };

  const handleStoryViewed = useCallback((storyId, uId) => {
    if (!storyId) return;
    const strStoryId = String(storyId);
    const strUId = String(uId || "");

    setUserGroups((prev) =>
      prev.map((group) => {
        if (!strUId || String(group.userId) === strUId) {
          const updatedStories = group.stories.map((s) =>
            String(s.id) === strStoryId
              ? { ...s, is_seen: true, isSeen: true, viewed: true, has_viewed: true }
              : s
          );
          const hasUnseen = updatedStories.some(
            (s) => !s.is_seen && !s.isSeen && !s.viewed && !s.has_viewed
          );
          return { ...group, stories: updatedStories, hasUnseen };
        }
        return group;
      })
    );

    setMyGroup((prev) => {
      if (!prev) return null;
      if (!strUId || String(prev.userId) === strUId) {
        const updatedStories = prev.stories.map((s) =>
          String(s.id) === strStoryId
            ? { ...s, is_seen: true, isSeen: true, viewed: true, has_viewed: true }
            : s
        );
        const hasUnseen = updatedStories.some(
          (s) => !s.is_seen && !s.isSeen && !s.viewed && !s.has_viewed
        );
        return { ...prev, stories: updatedStories, hasUnseen };
      }
      return prev;
    });
  }, []);

  const hasMyStory = Boolean(myGroup && myGroup.stories && myGroup.stories.length > 0);
  const allGroupsForViewer = myGroup ? [myGroup, ...userGroups] : userGroups;

  return (
    <View style={[styles.container, { borderBottomColor: colors.line }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}>
        
        {}
        <View style={styles.storyItem}>
          <View style={styles.avatarWrapper}>
            {}
            <Pressable
              onPress={() => {
                if (hasMyStory) {
                  handleOpenViewer(myGroup);
                } else {
                  setCreateVisible(true);
                }
              }}
              accessibilityLabel={hasMyStory ? "Ver seu story" : "Criar story"}>
              
              <View
                style={[
                styles.storyRing,
                {
                  borderColor: hasMyStory
                    ? myGroup?.hasUnseen
                      ? "#3b82f6"
                      : "rgba(255, 255, 255, 0.15)"
                    : colors.line,
                  borderWidth: hasMyStory ? (myGroup?.hasUnseen ? 2.5 : 1.5) : 1
                }]
                }>
                
                <Avatar user={user} size={56} />
              </View>
            </Pressable>

            {}
            <Pressable
              style={[
              styles.addBadge,
              {
                backgroundColor: colors.accent,
                borderColor: colors.background || "#000000"
              }]
              }
              onPress={() => setCreateVisible(true)}
              accessibilityLabel="Criar Story"
              hitSlop={6}>
              
              <Feather name="plus" size={13} color="#ffffff" />
            </Pressable>
          </View>

          {}
          <Pressable
            onPress={() => {
              if (hasMyStory) {
                handleOpenViewer(myGroup);
              } else {
                setCreateVisible(true);
              }
            }}>
            
            <Text numberOfLines={1} style={[styles.storyLabel, { color: colors.text }]}>
              Seu Story
            </Text>
          </Pressable>
        </View>

        {}
        {userGroups.map((group) => {
          const u = group.user;
          return (
            <Pressable
              key={group.userId}
              style={styles.storyItem}
              onPress={() => handleOpenViewer(group)}>
              
              <View
                style={[
                styles.storyRing,
                {
                  borderColor: group.hasUnseen
                    ? "#3b82f6"
                    : "rgba(255, 255, 255, 0.15)",
                  borderWidth: group.hasUnseen ? 2.5 : 1.5
                }]
                }>
                
                <Avatar user={u} size={56} />
              </View>
              <Text numberOfLines={1} style={[styles.storyLabel, { color: colors.text }]}>
                {u?.firstName || userName(u).split(" ")[0]}
              </Text>
            </Pressable>);

        })}

        {loading && userGroups.length === 0 && !hasMyStory &&
        <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={colors.muted} />
          </View>
        }
      </ScrollView>

      {}
      <CreateStoryModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSuccess={() => {
          loadStories();
          onStoryChange?.();
        }} />
      

      {}
      <StoryViewerModal
        visible={viewerVisible}
        initialUserGroup={selectedGroup}
        userGroups={allGroupsForViewer}
        currentUser={user}
        onClose={() => {
          setViewerVisible(false);
          setSelectedGroup(null);
        }}
        onStoryDeleted={handleStoryDeleted}
        onStoryViewed={handleStoryViewed} />
      
    </View>);

}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  scrollList: {
    paddingHorizontal: 18,
    gap: 18,
    alignItems: "center"
  },
  storyItem: {
    alignItems: "center",
    width: 72
  },
  avatarWrapper: {
    position: "relative"
  },
  storyRing: {
    padding: 3,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },
  addBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  storyLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 72
  },
  loadingIndicator: {
    justifyContent: "center",
    paddingHorizontal: 12
  }
});