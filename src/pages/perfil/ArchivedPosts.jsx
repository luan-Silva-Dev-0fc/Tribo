import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator, Pressable, Text } from "react-native";
import { api } from "../../api";
import { PostCard } from "../../components/feed/PostCard";
import { AppLayout } from "../../components/layout/AppLayout";
import { AppHeader } from "../../components/ui/ui";
import { useTheme } from "../../theme";
import { EmptyState } from "../../components/ui/ui";

export function ArchivedPostsScreen({ user, onBack, onOpenProfile }) {
  const { colors } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchivedPosts();
  }, []);

  const loadArchivedPosts = async () => {
    setLoading(true);
    try {
      const data = await api.posts.archived();
      let list = Array.isArray(data) ? data : (data.posts || []);
      list = list.map(item => item.post ? item.post : item);
      setPosts(list);
    } catch (err) {
      console.warn("Erro ao carregar posts arquivados", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (postId) => {
    try {
      await api.posts.restore(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.warn("Erro ao restaurar", err);
    }
  };

  return (
    <AppLayout>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader
          title="Arquivo"
          onBack={onBack}
        />
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item, index) => String(item.id || item._id || index)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={{ marginTop: 60 }}>
                <EmptyState 
                  title="Arquivo vazio" 
                  message="Você não possui publicações arquivadas." 
                  icon="archive" 
                />
              </View>
            }
            renderItem={({ item }) => (
              <View>
                <PostCard
                  post={item}
                  currentUser={user}
                  currentUserId={user?.id}
                  onOpenProfile={onOpenProfile}
                />
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Pressable 
                    onPress={() => handleRestore(item.id)}
                    style={{ backgroundColor: colors.surfaceAlt, padding: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: colors.line }}
                  >
                    <Text style={{ color: colors.text, fontFamily: "Poppins_600SemiBold" }}>Restaurar Publicação</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
});

