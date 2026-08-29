import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../../api";
import { Avatar, EmptyState, IconButton, VerificationBadge } from "../../components/ui/ui";
import { formatRelativeTime, userName } from "../../lib/format";
import { useTheme } from "../../theme";
import { useDirectChat } from "../../hooks/useDirectChat";
import { AudioMessagePlayer } from "../../components/chat/AudioMessagePlayer";
import { ChatVideoThumbnail } from "../../components/chat/ChatVideoThumbnail";
import { VideoStickerMessage } from "../../components/chat/VideoStickerMessage";
import { ReelShareCard } from "../../components/chat/ReelShareCard";
import { MediaContextMenuSheet } from "../../components/chat/MediaContextMenuSheet";
import { ConfirmDeleteModal } from "../../components/chat/ConfirmDeleteModal";
import { TriboModernToast } from "../../components/chat/TriboModernToast";
import { MediaViewerModal } from "../../components/modals/media-viewer-modal";
import { GoldBadgeModal } from "../../components/modals/gold-badge-modal";
import { StickerPickerModal } from "../../components/chat/StickerPickerModal";
import { CreateVideoStickerModal } from "../../components/chat/CreateVideoStickerModal";
import { notifyChatScroll } from "../../services/audioRecordingDucking";

function formatAudioTime(millis) {
  if (!millis || isNaN(millis) || millis < 0) return "0:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function DirectChatScreen({
  targetUser,
  currentUser,
  onBack,
  onOpenProfile
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    messages,
    content,
    setContent,
    sending,
    loading,
    mutualBlocked,
    blockedReason,
    selectedMedia,
    setSelectedMedia,
    isViewOnce,
    setIsViewOnce,
    followingBack,
    editingMessage,
    setEditingMessage,
    stickerPickerVisible,
    setStickerPickerVisible,
    createStickerVisible,
    setCreateStickerVisible,
    goldModalVisible,
    setGoldModalVisible,
    viewerMedia,
    setViewerMedia,
    contextMenu,
    setContextMenu,
    deleteModal,
    setDeleteModal,
    toast,
    setToast,
    isRecording,
    recordSeconds,
    settingsVisible,
    setSettingsVisible,
    showOnlineStatus,
    setShowOnlineStatus,
    readReceipts,
    setReadReceipts,
    firstUnreadId,
    flatListRef,
    keyboardHeight,
    showToast,
    pickMedia,
    handleSend,
    handleSelectSticker,
    startRecording,
    cancelRecording,
    stopAndSendRecording,
    handleFollowBack,
    handleOpenContextMenu,
    handleSaveToGallery,
    handleSaveSticker,
    confirmDeleteMessage
  } = useDirectChat(targetUser, currentUser);

  const topInset = Math.max(
    insets?.top || 0,
    Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0
  );

  const isOnline = Boolean(targetUser?.is_online || targetUser?.isOnline);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerDirect,
          {
            paddingTop: topInset + 6,
            backgroundColor: colors.background,
            borderBottomColor: colors.border || "rgba(255, 255, 255, 0.08)"
          }
        ]}
      >
        <IconButton name="arrow-left" onPress={onBack} label="Voltar" />

        <Pressable
          style={styles.headerUserPressable}
          onPress={() => onOpenProfile?.(targetUser)}
        >
          <View style={{ position: "relative" }}>
            <Avatar user={targetUser} size={42} />
            {isOnline && (
              <View
                style={[
                  styles.onlineDotHeader,
                  { borderColor: colors.background }
                ]}
              />
            )}
          </View>

          <View style={styles.headerUserText}>
            <View style={styles.nameBadgeRow}>
              <Text
                numberOfLines={1}
                style={[styles.headerUserName, { color: colors.text }]}
              >
                {userName(targetUser)}
              </Text>
              <VerificationBadge user={targetUser} size={14} />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.headerUserHandle,
                { color: isOnline ? "#22c55e" : colors.muted }
              ]}
            >
              {isOnline
                ? "● Online agora"
                : targetUser?.last_seen || targetUser?.lastSeen
                ? `Visto ${formatRelativeTime(
                    targetUser?.last_seen || targetUser?.lastSeen
                  )}`
                : `@${targetUser?.username || "usuario"}`}
            </Text>
          </View>
        </Pressable>

        <IconButton
          name="settings"
          onPress={() => setSettingsVisible(true)}
          label="Configurações"
        />
      </View>

      {mutualBlocked && (
        <View
          style={[
            styles.mutualBlockBanner,
            {
              backgroundColor: colors.surfaceAlt || "#18181b",
              borderColor: colors.border || "rgba(255, 255, 255, 0.1)"
            }
          ]}
        >
          <View style={styles.mutualBlockHeader}>
            <Feather
              name="shield"
              size={18}
              color={colors.primary || "#0284c7"}
            />
            <Text style={[styles.mutualBlockTitle, { color: colors.text }]}>
              Mútua Seguição Necessária
            </Text>
          </View>
          <Text style={[styles.mutualBlockMessage, { color: colors.muted }]}>
            {blockedReason ||
              "Vocês precisam se seguir mutuamente para trocar mensagens diretas."}
          </Text>
          <Pressable
            style={[
              styles.followBackBtn,
              { backgroundColor: colors.primary || "#0284c7" }
            ]}
            onPress={handleFollowBack}
            disabled={followingBack}
          >
            {followingBack ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Feather
                  name="user-plus"
                  size={16}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.followBackBtnText}>Seguir de Volta</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={styles.chatListContent}
        onScroll={notifyChatScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const isMe =
            String(
              item.sender_id || item.userId || item.user_id || item.user?.id
            ) === String(currentUser?.id);

          const isFirstUnread = String(item.id) === String(firstUnreadId);
          const storyData = item.story || item.story_preview;
          const hasStory = Boolean(item.story_id || storyData);
          const audioUrl =
            item.audio_url ||
            item.audioUrl ||
            (item.media_type === "audio" ? item.media_url : null);
          const mediaUrl = item.media_url || item.mediaUrl;
          const isSticker =
            item.media_type === "STICKER" || item.mediaType === "STICKER";
          const isVideo =
            !isSticker &&
            (item.media_type === "VIDEO" ||
              item.mediaType === "VIDEO" ||
              String(mediaUrl || "").toLowerCase().endsWith(".mp4") ||
              String(mediaUrl || "").toLowerCase().includes("/videos/"));

          let isReelShare =
            item.media_type === "REEL_SHARE" ||
            item.media_type === "reel_share" ||
            item.mediaType === "REEL_SHARE" ||
            item.mediaType === "reel_share" ||
            item.type === "reel_share" ||
            item.type === "REEL_SHARE";

          let reelData = null;
          if (item.content) {
            if (typeof item.content === "object" && item.content !== null) {
              if (
                item.content.video_id ||
                item.content.videoId ||
                item.content.youtube_video_id
              ) {
                reelData = item.content;
                isReelShare = true;
              }
            } else if (typeof item.content === "string") {
              const trimmed = item.content.trim();
              if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                try {
                  const parsed = JSON.parse(trimmed);
                  if (
                    parsed &&
                    (parsed.video_id ||
                      parsed.videoId ||
                      parsed.youtube_video_id ||
                      parsed.thumbnail_url ||
                      parsed.thumbnailUrl)
                  ) {
                    reelData = parsed;
                    isReelShare = true;
                  }
                } catch (e) {}
              }
            }
          }
          const isPhoto = Boolean(mediaUrl && !isVideo && !isSticker && !isReelShare);

          return (
            <View key={String(item.id)}>
              {isFirstUnread && (
                <View style={styles.unreadDividerContainer}>
                  <View
                    style={[
                      styles.unreadDividerLine,
                      {
                        backgroundColor:
                          colors.border || "rgba(255, 255, 255, 0.12)"
                      }
                    ]}
                  />
                  <View
                    style={[
                      styles.unreadDividerBadge,
                      { backgroundColor: colors.primary || "#0284c7" }
                    ]}
                  >
                    <Feather
                      name="bell"
                      size={11}
                      color="#ffffff"
                      style={{ marginRight: 5 }}
                    />
                    <Text style={styles.unreadDividerText}>
                      Novas Mensagens Não Lidas
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.unreadDividerLine,
                      {
                        backgroundColor:
                          colors.border || "rgba(255, 255, 255, 0.12)"
                      }
                    ]}
                  />
                </View>
              )}

              {isSticker &&
              mediaUrl &&
              !(item.is_deleted || item.deleted_for_everyone) ? (
                <View
                  style={[
                    styles.msgRow,
                    isMe ? styles.msgRowMe : styles.msgRowOther,
                    { marginVertical: 6 }
                  ]}
                >
                  <VideoStickerMessage
                    item={item}
                    isMe={isMe}
                    currentUser={currentUser}
                    onLongPress={() => handleOpenContextMenu(item)}
                    onDelete={() =>
                      setDeleteModal({
                        visible: true,
                        message: item,
                        forEveryone: isMe
                      })
                    }
                  />
                </View>
              ) : (
                <Pressable
                  onLongPress={() => handleOpenContextMenu(item)}
                  delayLongPress={200}
                  style={[
                    styles.msgRow,
                    isMe ? styles.msgRowMe : styles.msgRowOther
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isMe
                        ? [
                            styles.bubbleMe,
                            { backgroundColor: colors.primary || "#0284c7" }
                          ]
                        : [
                            styles.bubbleOther,
                            {
                              backgroundColor: colors.surfaceAlt || "#18181b",
                              borderColor:
                                colors.border || "rgba(255, 255, 255, 0.06)"
                            }
                          ]
                    ]}
                  >
                    {item.is_deleted || item.deleted_for_everyone ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        <Feather
                          name="slash"
                          size={14}
                          color={isMe ? "rgba(255,255,255,0.7)" : colors.muted}
                        />
                        <Text
                          style={[
                            styles.msgText,
                            {
                              color: isMe
                                ? "rgba(255,255,255,0.7)"
                                : colors.muted,
                              fontStyle: "italic"
                            }
                          ]}
                        >
                          Esta mensagem foi apagada
                        </Text>
                      </View>
                    ) : (
                      <>
                        {hasStory && (
                          <View
                            style={[
                              styles.storyCardPreview,
                              {
                                backgroundColor: isMe
                                  ? "rgba(0,0,0,0.25)"
                                  : "rgba(255,255,255,0.06)"
                              }
                            ]}
                          >
                            <View style={styles.storyCardHeader}>
                              <Feather
                                name="film"
                                size={12}
                                color={
                                  isMe ? "#ffffff" : colors.primary || "#0284c7"
                                }
                              />
                              <Text
                                style={[
                                  styles.storyCardLabel,
                                  {
                                    color: isMe
                                      ? "rgba(255,255,255,0.9)"
                                      : colors.text
                                  }
                                ]}
                              >
                                Story de @{targetUser?.username || "usuario"}
                              </Text>
                            </View>
                            {storyData?.mediaUrl && (
                              <Image
                                source={{ uri: storyData.mediaUrl }}
                                style={styles.storyCardThumbnail}
                                resizeMode="cover"
                              />
                            )}
                          </View>
                        )}

                        {isReelShare && Boolean(reelData) && (
                          <ReelShareCard
                            reelData={reelData}
                            isMe={isMe}
                            onPress={(data) => {
                              const vId =
                                data?.video_id ||
                                data?.videoId ||
                                data?.youtube_video_id;
                              if (vId) {
                                if (
                                  Platform.OS === "web" &&
                                  typeof window !== "undefined"
                                ) {
                                  window.open(
                                    `https://www.youtube.com/shorts/${vId}`,
                                    "_blank"
                                  );
                                } else {
                                  Linking.openURL(
                                    `https://www.youtube.com/shorts/${vId}`
                                  ).catch(() => {});
                                }
                              }
                            }}
                          />
                        )}

                        {isPhoto && (
                          <Pressable
                            onPress={() =>
                              setViewerMedia({
                                url: mediaUrl,
                                type: "image",
                                user: isMe ? currentUser : targetUser,
                                created_at: item.createdAt || item.created_at,
                                content: item.content || "",
                                message: item
                              })
                            }
                            onLongPress={() => handleOpenContextMenu(item)}
                            delayLongPress={200}
                            style={styles.mediaContainer}
                          >
                            <Image
                              source={{ uri: mediaUrl }}
                              style={styles.chatImage}
                              resizeMode="cover"
                            />
                          </Pressable>
                        )}

                        {isVideo && (
                          <ChatVideoThumbnail
                            url={mediaUrl}
                            onPress={() =>
                              setViewerMedia({
                                url: mediaUrl,
                                type: "video",
                                user: isMe ? currentUser : targetUser,
                                created_at: item.createdAt || item.created_at,
                                content: item.content || "",
                                message: item
                              })
                            }
                            onLongPress={() => handleOpenContextMenu(item)}
                          />
                        )}

                        {Boolean(audioUrl) && (
                          <AudioMessagePlayer audioUrl={audioUrl} isMe={isMe} />
                        )}

                        {Boolean(item.content) && !isReelShare && (
                          <Text
                            style={[
                              styles.msgText,
                              { color: isMe ? "#FFFFFF" : colors.text }
                            ]}
                          >
                            {item.content}
                          </Text>
                        )}
                      </>
                    )}

                    <View style={styles.msgMetaRow}>
                      <Text
                        style={[
                          styles.msgTime,
                          {
                            color: isMe
                              ? "rgba(255, 255, 255, 0.75)"
                              : colors.muted || "#a1a1aa"
                          }
                        ]}
                      >
                        {formatRelativeTime(item.createdAt || item.created_at)}
                        {(item.is_edited || item.isEdited) &&
                        !(item.is_deleted || item.deleted_for_everyone)
                          ? " (editada)"
                          : ""}
                      </Text>

                      {isMe &&
                        !(item.is_deleted || item.deleted_for_everyone) && (
                          <View
                            style={{ flexDirection: "row", marginLeft: 4 }}
                          >
                            {item.read_at || item.isRead ? (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center"
                                }}
                              >
                                <Ionicons
                                  name="checkmark-done"
                                  size={15}
                                  color="#38bdf8"
                                />
                              </View>
                            ) : (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="rgba(255, 255, 255, 0.7)"
                              />
                            )}
                          </View>
                        )}
                    </View>
                  </View>
                </Pressable>
              )}
            </View>
          );
        }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && (
            <EmptyState icon="message-circle">
              Sem mensagens ainda. Envie uma figurinha ou diga olá!
            </EmptyState>
          )
        }
      />

      <View
        style={[
          styles.composerContainer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border || "rgba(255, 255, 255, 0.08)",
            paddingBottom:
              keyboardHeight > 0
                ? keyboardHeight + 8
                : Math.max(insets.bottom + 8, 16)
          }
        ]}
      >
        {isRecording ? (
          <View
            style={[
              styles.recordingBar,
              {
                backgroundColor: colors.surfaceAlt || "#18181b",
                borderColor: "rgba(239, 68, 68, 0.3)"
              }
            ]}
          >
            <View style={styles.recordingLiveInfo}>
              <View style={styles.recordingDot} />
              <Feather
                name="mic"
                size={18}
                color="#ef4444"
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.recordingTimerText, { color: colors.text }]}>
                {formatAudioTime(recordSeconds * 1000)}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Pressable
                onPress={cancelRecording}
                style={styles.trashRecordBtn}
                accessibilityLabel="Cancelar gravação"
              >
                <Feather name="trash-2" size={18} color="#ef4444" />
              </Pressable>

              <Pressable
                onPress={stopAndSendRecording}
                style={({ pressed }) => [
                  styles.sendRecordBtn,
                  {
                    backgroundColor: colors.primary || "#0284c7",
                    opacity: pressed ? 0.85 : 1
                  }
                ]}
                accessibilityLabel="Enviar áudio"
              >
                <Feather name="send" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {Boolean(editingMessage) && (
              <View
                style={[
                  styles.editingBanner,
                  {
                    backgroundColor: colors.surfaceAlt || "#18181b",
                    borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
                  }
                ]}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Feather
                    name="edit-2"
                    size={14}
                    color={colors.primary || "#0284c7"}
                  />
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 12.5,
                      fontFamily: "Poppins_500Medium"
                    }}
                  >
                    Editando mensagem
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditingMessage(null);
                    setContent("");
                  }}
                  style={{ padding: 4 }}
                >
                  <Feather name="x" size={16} color={colors.muted} />
                </Pressable>
              </View>
            )}

            <View
              style={[
                styles.composerInputWrapper,
                {
                  backgroundColor: colors.surfaceAlt || "#18181b",
                  borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
                }
              ]}
            >
              {Boolean(selectedMedia) && (
                <View style={styles.selectedMediaPreview}>
                  <Image
                    source={{ uri: selectedMedia.uri }}
                    style={styles.selectedMediaThumb}
                  />
                  <Pressable
                    onPress={() => setSelectedMedia(null)}
                    style={styles.removeMediaBtn}
                  >
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                  <Pressable
                    onPress={() => setIsViewOnce(!isViewOnce)}
                    style={[
                      styles.viewOnceBadge,
                      {
                        backgroundColor: isViewOnce
                          ? colors.primary || "#0284c7"
                          : "rgba(0, 0, 0, 0.6)"
                      }
                    ]}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontFamily: "Poppins_700Bold"
                      }}
                    >
                      1x
                    </Text>
                  </Pressable>
                </View>
              )}

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Pressable
                  onPress={pickMedia}
                  style={styles.inputActionBtn}
                  accessibilityLabel="Anexar foto ou vídeo"
                >
                  <Feather
                    name="image"
                    size={21}
                    color={colors.primary || "#0284c7"}
                  />
                </Pressable>

                <Pressable
                  onPress={() => setStickerPickerVisible(true)}
                  style={styles.inputActionBtn}
                  accessibilityLabel="Abrir figurinhas"
                >
                  <MaterialCommunityIcons
                    name="sticker-emoji"
                    size={22}
                    color="#f59e0b"
                  />
                </Pressable>

                <TextInput
                  placeholder={
                    mutualBlocked
                      ? "Mútua seguição necessária..."
                      : "Mensagem..."
                  }
                  placeholderTextColor={colors.muted || "#71717a"}
                  value={content}
                  onChangeText={setContent}
                  style={[styles.textInputMain, { color: colors.text }]}
                  editable={!mutualBlocked && !sending}
                  multiline
                />
              </View>
            </View>

            {content.trim().length > 0 || Boolean(selectedMedia) ? (
              <Pressable
                style={({ pressed }) => [
                  styles.sendCircleBtn,
                  {
                    backgroundColor: colors.primary || "#0284c7",
                    opacity: pressed ? 0.85 : 1
                  }
                ]}
                onPress={handleSend}
                disabled={mutualBlocked || sending}
                accessibilityLabel="Enviar mensagem"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather
                    name="send"
                    size={18}
                    color="#ffffff"
                    style={{ marginLeft: -1, marginTop: 1 }}
                  />
                )}
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.sendCircleBtn,
                  {
                    backgroundColor: mutualBlocked
                      ? "#27272a"
                      : colors.primary || "#0284c7",
                    opacity: pressed ? 0.85 : 1
                  }
                ]}
                onPress={startRecording}
                disabled={mutualBlocked || sending}
                accessibilityLabel="Gravar mensagem de voz"
              >
                <Feather
                  name="mic"
                  size={20}
                  color={mutualBlocked ? colors.muted : "#ffffff"}
                />
              </Pressable>
            )}
          </>
        )}
      </View>

      <StickerPickerModal
        visible={stickerPickerVisible}
        onClose={() => setStickerPickerVisible(false)}
        onSelectSticker={handleSelectSticker}
        onOpenCreateModal={() => {
          setStickerPickerVisible(false);
          setCreateStickerVisible(true);
        }}
        currentUser={currentUser}
      />

      <CreateVideoStickerModal
        visible={createStickerVisible}
        onClose={() => setCreateStickerVisible(false)}
        currentUser={currentUser}
        onStickerCreated={(newSticker) => {
          setCreateStickerVisible(false);
          showToast("Figurinha criada com sucesso!");
          if (newSticker) {
            handleSelectSticker(newSticker);
          }
        }}
        onShowGoldModal={() => setGoldModalVisible(true)}
      />

      <GoldBadgeModal
        visible={goldModalVisible}
        onClose={() => setGoldModalVisible(false)}
      />

      <MediaViewerModal
        visible={Boolean(viewerMedia)}
        mediaUrl={viewerMedia?.url}
        isVideo={viewerMedia?.isVideo}
        onClose={() => setViewerMedia(null)}
        onDelete={
          viewerMedia?.message &&
          String(viewerMedia.message.sender_id || viewerMedia.message.userId) ===
            String(currentUser?.id)
            ? () => {
                const msg = viewerMedia.message;
                setViewerMedia(null);
                setDeleteModal({
                  visible: true,
                  message: msg,
                  forEveryone: true
                });
              }
            : null
        }
      />

      <MediaContextMenuSheet
        visible={contextMenu.visible}
        message={contextMenu.message}
        currentUser={currentUser}
        onClose={() => setContextMenu({ visible: false, message: null })}
        onSaveToGallery={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          handleSaveToGallery(msg);
        }}
        onSaveSticker={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          handleSaveSticker(msg);
        }}
        onReply={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          if (msg?.content) {
            setContent(`> ${msg.content}\n`);
          }
        }}
        onDeleteForMe={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          setDeleteModal({
            visible: true,
            message: msg,
            forEveryone: false
          });
        }}
        onDeleteForEveryone={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          setDeleteModal({
            visible: true,
            message: msg,
            forEveryone: true
          });
        }}
      />

      <ConfirmDeleteModal
        visible={deleteModal.visible}
        forEveryone={deleteModal.forEveryone}
        onClose={() =>
          setDeleteModal({ visible: false, message: null, forEveryone: false })
        }
        onConfirm={confirmDeleteMessage}
      />

      <TriboModernToast
        visible={toast.visible}
        text={toast.text}
        type={toast.type}
        onDismiss={() =>
          setToast({ visible: false, text: "", type: "success" })
        }
      />

      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSettingsVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background || "#121214",
                borderTopColor: colors.border || "rgba(255, 255, 255, 0.1)",
                paddingBottom: Math.max(insets.bottom + 24, 36)
              }
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Configurações da Conversa
            </Text>

            <View style={{ marginTop: 16 }}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Status Online / Visto por Último
                </Text>
                <Switch
                  value={showOnlineStatus}
                  onValueChange={(val) => {
                    setShowOnlineStatus(val);
                    api.users
                      .updateSettings({ showOnlineStatus: val })
                      .catch(() => {});
                  }}
                  trackColor={{
                    false: "#27272a",
                    true: colors.primary || "#0284c7"
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Confirmação de Leitura
                </Text>
                <Switch
                  value={readReceipts}
                  onValueChange={(val) => {
                    setReadReceipts(val);
                    api.users
                      .updateSettings({ readReceipts: val })
                      .catch(() => {});
                  }}
                  trackColor={{
                    false: "#27272a",
                    true: colors.primary || "#0284c7"
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  headerDirect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1
  },
  headerUserPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 10
  },
  headerUserText: {
    flex: 1
  },
  headerUserName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5
  },
  headerUserHandle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    marginTop: 1
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  onlineDotHeader: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#22c55e",
    borderWidth: 2
  },
  mutualBlockBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center"
  },
  mutualBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  mutualBlockTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14
  },
  mutualBlockMessage: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    marginBottom: 14
  },
  followBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16
  },
  followBackBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#ffffff"
  },
  chatListContent: {
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  msgRow: {
    marginVertical: 3,
    flexDirection: "row"
  },
  msgRowMe: {
    justifyContent: "flex-end"
  },
  msgRowOther: {
    justifyContent: "flex-start"
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18
  },
  bubbleMe: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4
  },
  bubbleOther: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1
  },
  msgText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20
  },
  msgMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 3
  },
  msgTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5
  },
  mediaContainer: {
    borderRadius: 14,
    overflow: "hidden",
    marginVertical: 4
  },
  chatImage: {
    width: 220,
    height: 220,
    borderRadius: 14
  },
  storyCardPreview: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 6
  },
  storyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6
  },
  storyCardLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11
  },
  storyCardThumbnail: {
    width: "100%",
    height: 120,
    borderRadius: 8
  },
  composerContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8
  },
  composerInputWrapper: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 46,
    justifyContent: "center"
  },
  textInputMain: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 110,
    paddingVertical: 4
  },
  inputActionBtn: {
    padding: 6
  },
  sendCircleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1
  },
  selectedMediaPreview: {
    position: "relative",
    marginBottom: 8,
    alignSelf: "flex-start"
  },
  selectedMediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 10
  },
  removeMediaBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    padding: 3
  },
  viewOnceBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  recordingBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 48
  },
  recordingLiveInfo: {
    flexDirection: "row",
    alignItems: "center"
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginRight: 8
  },
  recordingTimerText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  },
  trashRecordBtn: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.12)"
  },
  sendRecordBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  editingBanner: {
    position: "absolute",
    top: -38,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end"
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 24
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 16
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  settingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14
  },
  unreadDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 8
  },
  unreadDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth
  },
  unreadDividerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginHorizontal: 8,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  unreadDividerText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5
  }
});
