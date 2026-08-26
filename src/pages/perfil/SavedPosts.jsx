import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { api } from "../../api";
import { PostCard } from "../../components/feed/PostCard";
import { AppLayout } from "../../components/layout/AppLayout";
import { AppHeader } from "../../components/ui/ui";
import { useTheme } from "../../theme";
import { EmptyState } from "../../components/ui/ui";

export function SavedPostsScreen({ user, onBack, onOpenProfile }) {
  const { colors } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async () => {
    setLoading(true);
    try {
      const data = await api.posts.saved();
      let list = Array.isArray(data) ? data : data.posts || [];

      list = list.map((item) => item.post ? item.post : item);
      setPosts(list);
    } catch (err) {
      console.warn("Erro ao carregar posts salvos", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader
          title="Posts Salvos"
          onBack={onBack} />
        
        {loading ?
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} /> :

        <FlatList
          data={posts}
          keyExtractor={(item, index) => String(item.id || item._id || index)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
          <View style={{ marginTop: 60 }}>
                <EmptyState
              title="Nada salvo ainda"
              message="Quando voc� salvar uma publica��o, ela aparecer� aqui."
              icon="bookmark" />
            
              </View>
          }
          renderItem={({ item }) =>
          <PostCard
            post={item}
            currentUser={user}
            currentUserId={user?.id}
            onOpenProfile={onOpenProfile} />

          } />

        }
      </View>
    </AppLayout>);

}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 16,
    flexGrow: 1
  }
});