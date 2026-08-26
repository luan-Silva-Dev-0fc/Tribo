import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
      const rawList = Array.isArray(res)
        ? res
        : res?.stories || res?.data || [];

      // Agrupar stories por usuário
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
          Object.keys(u).length > 0
            ? u
            : uId === currentUid && user
            ? user
            : { id: uId };

        if (!groupsMap.has(uId)) {
          groupsMap.set(uId, {
            user: resolvedUser,
            userId: uId,
            stories: [],
            hasUnseen: true,
          });
        }
        groupsMap.get(uId).stories.push(story);
      });

      let own = null;
      const others = [];

      groupsMap.forEach((group, id) => {
        if (id === currentUid) {
          own = {
            ...group,
            user: user || group.user,
          };
        } else {
          others.push(group);
        }
      });

      setMyGroup(own);
      setUserGroups(others);
    } catch {
      // Falha silenciosa para não travar o feed
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

  const hasMyStory = Boolean(myGroup && myGroup.stories && myGroup.stories.length > 0);
  const allGroupsForViewer = myGroup ? [myGroup, ...userGroups] : userGroups;

  return (
    <View style={[styles.container, { borderBottomColor: colors.line }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {/* Item do Usuário Logado: Seu Story */}
        <View style={styles.storyItem}>
          <View style={styles.avatarWrapper}>
            {/* Foto / Anel principal */}
            <Pressable
              onPress={() => {
                if (hasMyStory) {
                  handleOpenViewer(myGroup);
                } else {
                  setCreateVisible(true);
                }
              }}
              accessibilityLabel={hasMyStory ? "Ver seu story" : "Criar story"}
            >
              <View
                style={[
                  styles.storyRing,
                  {
                    borderColor: hasMyStory ? colors.accent : colors.line,
                    borderWidth: hasMyStory ? 2.5 : 1,
                  },
                ]}
              >
                <Avatar user={user} size={56} />
              </View>
            </Pressable>

            {/* Badge de adicionar (+) com toque específico */}
            <Pressable
              style={[
                styles.addBadge,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.background || "#000000",
                },
              ]}
              onPress={() => setCreateVisible(true)}
              accessibilityLabel="Criar Story"
              hitSlop={6}
            >
              <Feather name="plus" size={13} color="#ffffff" />
            </Pressable>
          </View>

          {/* Rótulo "Seu Story" */}
          <Pressable
            onPress={() => {
              if (hasMyStory) {
                handleOpenViewer(myGroup);
              } else {
                setCreateVisible(true);
              }
            }}
          >
            <Text numberOfLines={1} style={[styles.storyLabel, { color: colors.text }]}>
              Seu Story
            </Text>
          </Pressable>
        </View>

        {/* Stories dos outros usuários */}
        {userGroups.map((group) => {
          const u = group.user;
          return (
            <Pressable
              key={group.userId}
              style={styles.storyItem}
              onPress={() => handleOpenViewer(group)}
            >
              <View
                style={[
                  styles.storyRing,
                  {
                    borderColor: group.hasUnseen ? colors.accent : colors.line,
                    borderWidth: group.hasUnseen ? 2.5 : 1.5,
                  },
                ]}
              >
                <Avatar user={u} size={56} />
              </View>
              <Text numberOfLines={1} style={[styles.storyLabel, { color: colors.text }]}>
                {u?.firstName || userName(u).split(" ")[0]}
              </Text>
            </Pressable>
          );
        })}

        {loading && userGroups.length === 0 && !hasMyStory && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={colors.muted} />
          </View>
        )}
      </ScrollView>

      {/* Modal de Criação de Story */}
      <CreateStoryModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSuccess={() => {
          loadStories();
          onStoryChange?.();
        }}
      />

      {/* Modal de Visualização de Stories Fullscreen */}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  scrollList: {
    paddingHorizontal: 18,
    gap: 18, // Espaçamento mais limpo e proporcional
    alignItems: "center",
  },
  storyItem: {
    alignItems: "center",
    width: 72,
  },
  avatarWrapper: {
    position: "relative",
  },
  storyRing: {
    padding: 3, // Refinamento do anel do avatar
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3, // Sombra suave
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
    elevation: 2,
  },
  storyLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 72,
  },
  loadingIndicator: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});
