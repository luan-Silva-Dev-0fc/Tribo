import React, { useCallback } from "react";
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { EmptyState } from "../../components/ui/ui";
import { AppLayout } from "../../components/layout/AppLayout";
import { StoriesBar } from "../../components/stories/stories-bar";
import { PostCard } from "../../components/feed/PostCard";
import { Composer, Comments } from "../../components/feed/Composer";
import { ReportModal } from "../../components/modals/report-modal";
import { CommunityGuidelinesModal } from "../../components/modals/community-guidelines-modal";
import { MediaViewerModal } from "../../components/modals/media-viewer-modal";
import { RepostModal } from "../../components/modals/repost-modal";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";
import { PostOptionsModal } from "../../components/modals/post-options-modal";
import { useUserContext } from "../../context/user-context";
import { useTheme } from "../../theme";
import { useFeed } from "../../hooks/useFeed";

export default function FeedScreen({ user, onOpenProfile, scrollToTopSignal }) {
  const { colors } = useTheme();
  const { isAdultContentEnabled } = useUserContext();

  const {
    posts,
    loading,
    refreshing,
    commentPost,
    setCommentPost,
    optionsPost,
    setOptionsPost,
    fullscreenMedia,
    setFullscreenMedia,
    repostModalPost,
    setRepostModalPost,
    activeVisiblePostId,
    showScrollTop,
    alertConfig,
    reportModal,
    setReportModal,
    flatListRef,
    scrollTopAnim,
    pullY,
    showAlert,
    hideAlert,
    load,
    onViewableItemsChanged,
    viewabilityConfig,
    handleScroll,
    scrollToTop,
    handleBlockUser,
    handleReportSuccess,
    like,
    executeRepost,
    handleDeletePost
  } = useFeed(user, isAdultContentEnabled, scrollToTopSignal);

  const renderPostItem = useCallback(
    ({ item }) => (
      <PostCard
        post={item}
        currentUser={user}
        currentUserId={user?.id}
        isCentered={activeVisiblePostId === item.id}
        volume={activeVisiblePostId === item.id ? 1.0 : 0.0}
        onLike={() => like(item)}
        onComment={() => setCommentPost(item)}
        onRepost={() => setRepostModalPost(item)}
        onOpenProfile={onOpenProfile}
        onOpenMedia={setFullscreenMedia}
        onOptions={() => setOptionsPost(item)}
        showAlert={showAlert}
      />
    ),
    [
      user,
      activeVisiblePostId,
      like,
      setCommentPost,
      setRepostModalPost,
      onOpenProfile,
      setFullscreenMedia,
      setOptionsPost,
      showAlert
    ]
  );

  return (
    <AppLayout>
      <View style={styles.storiesContainer}>
        <StoriesBar user={user} />
      </View>

      <View style={styles.feedWrapper}>
        <Animated.View
          style={[
            styles.pullSpinnerContainer,
            {
              opacity: pullY.interpolate({
                inputRange: [-80, -20, 0],
                outputRange: [1, 0.5, 0],
                extrapolate: "clamp"
              }),
              transform: [
                {
                  rotate: pullY.interpolate({
                    inputRange: [-100, 0],
                    outputRange: ["-360deg", "0deg"],
                    extrapolate: "clamp"
                  })
                },
                {
                  scale: pullY.interpolate({
                    inputRange: [-100, 0],
                    outputRange: [1.2, 0.5],
                    extrapolate: "clamp"
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[styles.pullSpinnerText, { color: colors.text }]}>@</Text>
        </Animated.View>

        <Animated.FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          removeClippedSubviews={Platform.OS === "android"}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="transparent"
              colors={["transparent"]}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Composer user={user} onPublished={() => load(true)} />
              <View style={{ height: 16 }} />
            </View>
          }
          renderItem={renderPostItem}
          ListEmptyComponent={
            !loading && (
              <EmptyState icon="message-circle">
                Ainda não há publicações na Tribo.
              </EmptyState>
            )
          }
        />

        {showScrollTop && (
          <Animated.View
            style={[
              styles.scrollTopContainer,
              {
                opacity: scrollTopAnim,
                transform: [
                  {
                    scale: scrollTopAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.75, 1]
                    })
                  },
                  {
                    translateY: scrollTopAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <Pressable
              style={[
                styles.scrollTopButton,
                {
                  backgroundColor: colors.surfaceAlt || "#1e293b",
                  borderColor: colors.border
                }
              ]}
              onPress={scrollToTop}
              accessibilityLabel="Voltar ao topo suavemente"
            >
              <Feather name="arrow-up" size={17} color={colors.accent || "#3b82f6"} />
              <Text style={[styles.scrollTopText, { color: colors.text }]}>Topo</Text>
            </Pressable>
          </Animated.View>
        )}

        <MediaViewerModal
          visible={Boolean(fullscreenMedia)}
          mediaUrl={fullscreenMedia?.url}
          mediaType={fullscreenMedia?.type || "image"}
          post={fullscreenMedia?.post}
          onClose={() => setFullscreenMedia(null)}
        />

        <Comments
          showAlert={showAlert}
          post={commentPost}
          onClose={() => setCommentPost(null)}
          onOpenProfile={onOpenProfile}
          currentUser={user}
          onBlockUser={handleBlockUser}
          onReportComment={(data) => {
            if (data?.targetType) {
              setReportModal({ visible: true, ...data });
            } else {
              const cUser = data.user || data.author || {};
              const cUserId = cUser.id || data.userId;
              const cHandle = cUser.username || cUser.handle || "usuario";
              setReportModal({
                visible: true,
                targetType: "COMMENT",
                targetId: data.id,
                authorId: cUserId,
                targetName: `comentário de @${cHandle}`
              });
            }
          }}
        />

        <PostOptionsModal
          post={optionsPost}
          currentUser={user}
          onClose={() => setOptionsPost(null)}
          onReport={(data) => setReportModal({ visible: true, ...data })}
          onBlock={handleBlockUser}
          onDelete={handleDeletePost}
          showAlert={showAlert}
        />

        <ReportModal
          visible={reportModal.visible}
          targetType={reportModal.targetType}
          targetId={reportModal.targetId}
          authorId={reportModal.authorId}
          targetName={reportModal.targetName}
          onClose={() => setReportModal((prev) => ({ ...prev, visible: false }))}
          onSuccess={handleReportSuccess}
        />

        <CommunityGuidelinesModal />

        <TriboAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttonText={alertConfig.buttonText}
          onClose={() => {
            if (alertConfig.onClose) alertConfig.onClose();
            hideAlert();
          }}
          secondaryButtonText={alertConfig.secondaryButtonText}
          onSecondaryPress={alertConfig.onSecondaryPress}
        />

        <RepostModal
          visible={Boolean(repostModalPost)}
          post={repostModalPost}
          currentUser={user}
          onClose={() => setRepostModalPost(null)}
          onRepost={(content) => executeRepost(repostModalPost, content)}
        />
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  storiesContainer: {
    marginTop: 0,
    marginBottom: 10,
    zIndex: 10
  },
  feedWrapper: {
    flex: 1
  },
  pullSpinnerContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1
  },
  pullSpinnerText: {
    fontSize: 36,
    fontWeight: "bold"
  },
  listContent: {
    paddingTop: 4,
    paddingHorizontal: 0,
    paddingBottom: 110,
    flexGrow: 1
  },
  listHeader: {
    marginBottom: 4
  },
  scrollTopContainer: {
    position: "absolute",
    bottom: 95,
    right: 20,
    zIndex: 99
  },
  scrollTopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  scrollTopText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12
  }
});