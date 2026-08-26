import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle } from
"react";
import { Audio } from "expo-av";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  LayoutAnimation,
  BackHandler,
  Linking } from
"react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { api, getUploadUrl } from "../../api";
import {
  Avatar,
  IconButton,
  Input,
  EmptyState,
  VerificationBadge,
  CustomModal } from
"../../components/ui/ui";
import { useTheme } from "../../theme";
import { errorMessage, userName, listFrom } from "../../lib/format";
import { PostCard } from "../../components/feed/PostCard";
import { Composer } from "../../components/feed/Composer";
import { AudioMessagePlayer } from "../mensagens/Mensagens";
import { ReelShareCard } from "../../components/chat/ReelShareCard";
import { MediaViewerModal } from "../../components/modals/media-viewer-modal";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";
import { GoldBadgeBenefitsModal } from "../../components/modals/gold-badge-modal";
import { VideoStickerMessage } from "../../components/chat/VideoStickerMessage";
import * as Haptics from "expo-haptics";
import { CreateVideoStickerModal } from "../../components/chat/CreateVideoStickerModal";
import { StickerPickerModal } from "../../components/chat/StickerPickerModal";
import { ViewOnceMediaCard } from "../../components/chat/ViewOnceMediaCard";
import { ViewOnceAudioPlayer } from "../../components/chat/ViewOnceAudioPlayer";
import { ViewOnceStickerMessage } from "../../components/chat/ViewOnceStickerMessage";
import { SwipeableMessageRow } from "../../components/chat/SwipeableMessageRow";
import { ReplyPreviewBar } from "../../components/chat/ReplyPreviewBar";
import { QuotedMessageBlock } from "../../components/chat/QuotedMessageBlock";
import { MediaContextMenuSheet } from "../../components/chat/MediaContextMenuSheet";
import { ConfirmDeleteModal } from "../../components/chat/ConfirmDeleteModal";
import { TriboModernToast } from "../../components/chat/TriboModernToast";
import { saveMediaToGallery } from "../../services/mediaDownloadService";
import { saveStickerToInventory } from "../../services/stickerInventory";
import {
  getExpiredMessageIds,
  markMessageAsExpired,
  sanitizeMessagesWithExpiration } from
"../../services/viewOnceService";
import {
  clearChatHistory,
  exportChatHistory,
  filterClearedMessages,
  getClearedChatTimestamp } from
"../../services/chatExportService";
import { getChatSocket } from "../../services/chatSocket";
import { AppHeader } from "../../components/ui/ui";
import {
  setOptimizedAudioMode,
  setLiveVoiceAudioMode,
  setAudioRecordingActive,
  notifyChatScroll } from
"../../services/audioRecordingDucking";
import { liveVoiceStreamer } from "../../services/liveVoiceStreamer";

export function GroupDetailsScreen({
  groupId,
  user,
  onBack,
  onSettings,
  onOpenProfile,
  onOpenMedia,
  onInvite
}) {
  const insets = useSafeAreaInsets();
  const { colors, mode, isDark: themeIsDark } = useTheme();
  const isDark = Boolean(
    themeIsDark || mode === "dark" || mode === "oled" || colors.mode === "dark"
  );
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [enableTriboFeed, setEnableTriboFeed] = useState(false);
  const [enableTriboTrends, setEnableTriboTrends] = useState(false);
  const [targetMessageId, setTargetMessageId] = useState(null);
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);
  const [clearChatConfirmVisible, setClearChatConfirmVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    primaryText: "Entendido",
    onPrimaryPress: null,
    secondaryText: null,
    onSecondaryPress: null
  });
  const chatTabRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const showAlert = ({
    title,
    message,
    type = "info",
    primaryText = "Entendido",
    onPrimaryPress,
    secondaryText,
    onSecondaryPress
  }) => {
    setCustomAlert({
      visible: true,
      type,
      title,
      message,
      primaryText,
      onPrimaryPress,
      secondaryText,
      onSecondaryPress
    });
  };

  const handleExportChatTrigger = () => {
    setGroupMenuVisible(false);
    if (chatTabRef.current?.exportChat) {
      chatTabRef.current.exportChat();
    } else {
      showAlert({
        title: "Exportar Conversa",
        message: "Abra a aba de Chat para exportar o histórico.",
        type: "info"
      });
    }
  };

  const handleClearChatConfirmed = async () => {
    setClearChatConfirmVisible(false);
    if (chatTabRef.current?.clearChat) {
      await chatTabRef.current.clearChat();
    } else {
      await clearChatHistory(groupId);
      showToast("Conversa limpa com sucesso!");
    }
  };

  const loadGroup = useCallback(async () => {
    try {
      const res = await api.groups.get(groupId);
      setGroup(res.group || res);
    } catch (error) {
      showAlert({
        title: "Erro ao Carregar",
        message: errorMessage(error),
        type: "error",
        onPrimaryPress: onBack
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, onBack]);

  const loadAppSettings = useCallback(async () => {
    try {
      const res = await api.app.settings();
      const feedEnabled = Boolean(
        res?.enableTriboFeed ?? res?.enable_tribo_feed ?? false
      );
      const trendsEnabled = Boolean(
        res?.enableTriboTrends ?? res?.enable_tribo_trends ?? false
      );
      setEnableTriboFeed(feedEnabled);
      setEnableTriboTrends(trendsEnabled);

      setActiveTab((prev) => {
        if (prev === "feed" && !feedEnabled) return "chat";
        if (prev === "trends" && !trendsEnabled) return "chat";
        return prev;
      });
    } catch (e) {

    }
  }, []);

  useEffect(() => {
    loadGroup();
    loadAppSettings();
  }, [loadGroup, loadAppSettings]);

  if (loading || !group) {
    return (
      <View
        style={[
        styles.root,
        { backgroundColor: colors.background, justifyContent: "center" }]
        }>
        
        <ActivityIndicator size="large" color={colors.primary} />
      </View>);

  }

  const isAdmin = String(group.admin_id || group.adminId) === String(user?.id);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.background
        }}>
        
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 4, marginRight: 8 }}>
            
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>

          <View style={{ position: "relative", marginRight: 12 }}>
            <Avatar
              url={group.avatarUrl || group.avatar_url}
              size={44}
              fallback={group.name} />
            
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#22c55e",
                borderWidth: 2,
                borderColor: colors.background || "#ffffff"
              }} />
            
          </View>

          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text
              style={{
                fontFamily: "Poppins_700Bold",
                fontSize: 18,
                color: colors.text
              }}
              numberOfLines={1}>
              
              {group.name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 1
              }}>
              
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: "#22c55e",
                  marginRight: 5
                }} />
              
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  fontSize: 12,
                  color: colors.muted || "#64748b"
                }}>
                
                {group.members_count ||
                group.membersCount || (
                group.members ? group.members.length : 1)}{" "}
                membros
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {onInvite &&
          <Pressable
            onPress={onInvite}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor:
              colors.surfaceAlt || (
              colors.mode === "dark" ? "#222" : "#f1f5f9"),
              alignItems: "center",
              justifyContent: "center"
            }}>
            
              <Feather name="user-plus" size={18} color={colors.text} />
            </Pressable>
          }
          <Pressable
            onPress={() => setGroupMenuVisible(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor:
              colors.surfaceAlt || (
              colors.mode === "dark" ? "#222" : "#f1f5f9"),
              alignItems: "center",
              justifyContent: "center"
            }}>
            
            <Feather name="more-vertical" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {}
      {(enableTriboFeed || enableTriboTrends) &&
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border || "#e2e8f0",
          backgroundColor: colors.background
        }}>
        
          {enableTriboFeed &&
        <Pressable
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            position: "relative"
          }}
          onPress={() => {
            Keyboard.dismiss();
            setActiveTab("feed");
          }}>
          
              <Text
            style={{
              fontSize: 14,
              fontFamily:
              activeTab === "feed" ?
              "Poppins_600SemiBold" :
              "Poppins_500Medium",
              color:
              activeTab === "feed" ?
              colors.primary || "#0284c7" :
              colors.muted
            }}>
            
                Feed
              </Text>
              {activeTab === "feed" &&
          <View
            style={{
              position: "absolute",
              bottom: 0,
              width: "45%",
              height: 2.5,
              borderRadius: 2,
              backgroundColor: colors.primary || "#0284c7"
            }} />

          }
            </Pressable>
        }

          <Pressable
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            position: "relative"
          }}
          onPress={() => setActiveTab("chat")}>
          
            <Text
            style={{
              fontSize: 14,
              fontFamily:
              activeTab === "chat" ?
              "Poppins_600SemiBold" :
              "Poppins_500Medium",
              color:
              activeTab === "chat" ?
              colors.primary || "#0284c7" :
              colors.muted
            }}>
            
              Chat
            </Text>
            {activeTab === "chat" &&
          <View
            style={{
              position: "absolute",
              bottom: 0,
              width: "45%",
              height: 2.5,
              borderRadius: 2,
              backgroundColor: colors.primary || "#0284c7"
            }} />

          }
          </Pressable>

          {enableTriboTrends &&
        <Pressable
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            position: "relative"
          }}
          onPress={() => {
            Keyboard.dismiss();
            setActiveTab("trends");
          }}>
          
              <Text
            style={{
              fontSize: 14,
              fontFamily:
              activeTab === "trends" ?
              "Poppins_600SemiBold" :
              "Poppins_500Medium",
              color:
              activeTab === "trends" ?
              colors.primary || "#0284c7" :
              colors.muted
            }}>
            
                Trends
              </Text>
              {activeTab === "trends" &&
          <View
            style={{
              position: "absolute",
              bottom: 0,
              width: "45%",
              height: 2.5,
              borderRadius: 2,
              backgroundColor: colors.primary || "#0284c7"
            }} />

          }
            </Pressable>
        }
        </View>
      }

      <View style={styles.content}>
        {activeTab === "feed" && enableTriboFeed &&
        <GroupFeedTab
          groupId={groupId}
          user={user}
          colors={colors}
          group={group}
          isAdmin={isAdmin}
          onOpenProfile={onOpenProfile} />

        }
        {(activeTab === "chat" ||
        !enableTriboFeed && activeTab === "feed" ||
        !enableTriboTrends && activeTab === "trends") &&
        <GroupChatTab
          ref={chatTabRef}
          groupId={groupId}
          group={group}
          user={user}
          colors={colors}
          targetMessageId={targetMessageId}
          onTargetReached={() => setTargetMessageId(null)}
          onOpenProfile={onOpenProfile}
          onShowToast={showToast}
          onShowAlert={showAlert} />

        }
        {activeTab === "trends" && enableTriboTrends &&
        <GroupTrendsTab
          groupId={groupId}
          colors={colors}
          onTrendClick={(msgId) => {
            setTargetMessageId(msgId);
            setActiveTab("chat");
          }}
          onPlayVideo={(media) => onOpenMedia(media)} />

        }
      </View>

      {}
      <Modal
        visible={groupMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupMenuVisible(false)}>
        
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            justifyContent: "flex-end"
          }}
          onPress={() => setGroupMenuVisible(false)}>
          
          <Pressable
            style={{
              backgroundColor: colors.card || "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom + 16, 28),
              paddingHorizontal: 20,
              borderWidth: 1,
              borderColor: colors.border || "#e2e8f0",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 10
            }}
            onPress={(e) => e.stopPropagation()}>
            
            {}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border || "#cbd5e1",
                alignSelf: "center",
                marginBottom: 16
              }} />
            

            {}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border || "#f1f5f9"
              }}>
              
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flex: 1
                }}>
                
                <Avatar
                  url={group.avatarUrl || group.avatar_url}
                  size={36}
                  fallback={group.name} />
                
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_700Bold",
                      fontSize: 15,
                      color: colors.text
                    }}
                    numberOfLines={1}>
                    
                    {group.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 12,
                      color: colors.muted || "#64748b"
                    }}>
                    
                    Opções do Grupo
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setGroupMenuVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.surfaceAlt || "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>

            {}
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              
              {}
              <Pressable
                onPress={() => {
                  setGroupMenuVisible(false);
                  onSettings(group);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: pressed ?
                  colors.mode === "dark" ?
                  "rgba(255, 255, 255, 0.06)" :
                  "#f8fafc" :
                  "transparent",
                  gap: 14
                })}>
                
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor:
                    colors.mode === "dark" ? "#1e293b" : "#f1f5f9",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                  
                  <Feather
                    name="settings"
                    size={20}
                    color={colors.primary || "#0284c7"} />
                  
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 14,
                      color: colors.text
                    }}>
                    
                    Configurações do Grupo
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 12,
                      color: colors.muted || "#64748b"
                    }}>
                    
                    Ver detalhes, membros e permissões
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.muted || "#94a3b8"} />
                
              </Pressable>

              {}
              <Pressable
                onPress={handleExportChatTrigger}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: pressed ?
                  colors.mode === "dark" ?
                  "rgba(255, 255, 255, 0.06)" :
                  "#f8fafc" :
                  "transparent",
                  gap: 14
                })}>
                
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor:
                    colors.mode === "dark" ? "#0c4a6e" : "#e0f2fe",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                  
                  <Feather name="download" size={20} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 14,
                      color: colors.text
                    }}>
                    
                    Exportar Conversa
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 12,
                      color: colors.muted || "#64748b"
                    }}>
                    
                    Gerar arquivo .txt com todo o histórico
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.muted || "#94a3b8"} />
                
              </Pressable>

              {}
              <Pressable
                onPress={() => {
                  setGroupMenuVisible(false);
                  setClearChatConfirmVisible(true);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: pressed ?
                  colors.mode === "dark" ?
                  "rgba(239, 68, 68, 0.1)" :
                  "#fef2f2" :
                  "transparent",
                  gap: 14
                })}>
                
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor:
                    colors.mode === "dark" ?
                    "rgba(239, 68, 68, 0.15)" :
                    "#fee2e2",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                  
                  <Feather name="trash-2" size={20} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 14,
                      color: "#ef4444"
                    }}>
                    
                    Limpar Conversa
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 12,
                      color: colors.muted || "#64748b"
                    }}>
                    
                    Remover mensagens do seu histórico
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#ef4444" />
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {}
      <CustomModal
        visible={clearChatConfirmVisible}
        type="delete"
        title="Limpar conversa"
        message="Tem certeza que deseja limpar as mensagens deste grupo? As mensagens serão removidas do seu histórico visual."
        primaryText="Limpar Conversa"
        primaryVariant="destructive"
        onPrimaryPress={handleClearChatConfirmed}
        secondaryText="Cancelar"
        onSecondaryPress={() => setClearChatConfirmVisible(false)}
        onClose={() => setClearChatConfirmVisible(false)} />
      

      {}
      <CustomModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        primaryText={customAlert.primaryText}
        onPrimaryPress={() => {
          if (customAlert.onPrimaryPress) customAlert.onPrimaryPress();
          setCustomAlert((prev) => ({ ...prev, visible: false }));
        }}
        secondaryText={customAlert.secondaryText}
        onSecondaryPress={() => {
          if (customAlert.onSecondaryPress) customAlert.onSecondaryPress();
          setCustomAlert((prev) => ({ ...prev, visible: false }));
        }}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))} />
      

      {}
      {Boolean(toastMessage) &&
      <View
        style={{
          position: "absolute",
          bottom: 30,
          alignSelf: "center",
          backgroundColor:
          colors.mode === "dark" ?
          "rgba(30, 41, 59, 0.96)" :
          "rgba(15, 23, 42, 0.94)",
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 11,
          paddingHorizontal: 18,
          borderRadius: 25,
          gap: 9,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 12,
          zIndex: 9999
        }}>
        
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text
          style={{
            color: "#ffffff",
            fontFamily: "Poppins_600SemiBold",
            fontSize: 13.5
          }}>
          
            {toastMessage}
          </Text>
        </View>
      }
    </View>);

}




function GroupFeedTab({
  groupId,
  user,
  colors,
  group,
  isAdmin,
  onOpenProfile
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [alertState, setAlertState] = useState({ visible: false });

  const [commentPost, setCommentPost] = useState(null);

  const loadFeed = async () => {
    try {
      const res = await api.groups.getFeed(groupId);
      const data = Array.isArray(res) ?
      res :
      res.feed || res.posts || res.data || [];
      setPosts(data);
    } catch (err) {
      console.warn("Error loading group feed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (post) => {
    const isCurrentlyLiked = post.is_liked || post.isLiked;
    const currentCount = parseInt(post.likes_count || 0, 10);


    setPosts((prev) =>
    prev.map((p) => {
      if (p.id === post.id) {
        return {
          ...p,
          is_liked: !isCurrentlyLiked,
          likes_count: isCurrentlyLiked ?
          Math.max(0, currentCount - 1) :
          currentCount + 1
        };
      }
      return p;
    })
    );

    try {
      if (isCurrentlyLiked) {
        await api.groups.unlikePost(groupId, post.id);
      } else {
        await api.groups.likePost(groupId, post.id);
      }
    } catch (err) {
      console.warn("Error toggling like", err);

      loadFeed();
    }
  };

  const handleSave = async (post) => {
    const isCurrentlySaved = post.is_saved || post.isSaved;


    setPosts((prev) =>
    prev.map((p) => {
      if (p.id === post.id) {
        return { ...p, is_saved: !isCurrentlySaved };
      }
      return p;
    })
    );

    try {
      if (isCurrentlySaved) {
        await api.groups.unsavePost(groupId, post.id);
      } else {
        await api.groups.savePost(groupId, post.id);
      }
    } catch (err) {
      console.warn("Error toggling save", err);
      loadFeed();
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    setAlertState({
      visible: true,
      type: "danger",
      title: "Apagar",
      message: "Tem certeza que deseja apagar esta publicação?",
      buttonText: "Apagar",
      secondaryButtonText: "Cancelar",
      onSecondaryPress: () => setAlertState({ visible: false }),
      onClose: async () => {
        setAlertState({ visible: false });
        try {
          await api.groups.deleteFeedPost(groupId, selectedPost.id);
          setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
          setSelectedPost(null);
        } catch (err) {
          setTimeout(
            () =>
            setAlertState({
              visible: true,
              type: "danger",
              title: "Erro",
              message: "Não foi possível apagar a publicação.",
              buttonText: "OK",
              onClose: () => setAlertState({ visible: false })
            }),
            300
          );
        }
      }
    });
  };

  const handleKickUser = async () => {
    if (!selectedPost) return;
    const authorId =
    selectedPost.user?.id || selectedPost.userId || selectedPost.user_id;
    setAlertState({
      visible: true,
      type: "danger",
      title: "Remover Membro",
      message: "Deseja realmente expulsar este usuário do grupo?",
      buttonText: "Expulsar",
      secondaryButtonText: "Cancelar",
      onSecondaryPress: () => setAlertState({ visible: false }),
      onClose: async () => {
        setAlertState({ visible: false });
        try {
          await api.groups.kickMember(groupId, authorId);
          setTimeout(
            () =>
            setAlertState({
              visible: true,
              type: "success",
              title: "Sucesso",
              message: "Usuário removido do grupo.",
              buttonText: "OK",
              onClose: () => setAlertState({ visible: false })
            }),
            300
          );
          setSelectedPost(null);
          loadFeed();
        } catch (err) {
          setTimeout(
            () =>
            setAlertState({
              visible: true,
              type: "danger",
              title: "Erro",
              message: "Não foi possível remover o usuário.",
              buttonText: "OK",
              onClose: () => setAlertState({ visible: false })
            }),
            300
          );
        }
      }
    });
  };

  return (
    <View style={styles.tabContent}>
      {loading ?
      <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> :

      <FlatList
        data={posts}
        keyExtractor={(i) => String(i.id)}
        ListHeaderComponent={
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8
          }}>
          
              <Composer
            user={user}
            onCreate={(data) => {
              const payload = {
                content: data.content,
                mediaUrl:
                data.imageUrl || data.videoUrl || data.mediaUrl || null
              };
              return api.groups.createPost(groupId, payload);
            }}
            onPublished={() => {
              loadFeed();
            }} />
          
            </View>
        }
        renderItem={({ item, index }) => {
          const isMe = [
          item.userId,
          item.user_id,
          item.user?.id,
          item.sender?.id,
          item.author?.id].
          some((id) => String(id) === String(user?.id));
          const authorName =
          item.user?.name ||
          item.user?.username ||
          item.author?.name ||
          item.author?.username ||
          item.sender?.name ||
          item.sender?.username ||
          "Usuário";

          const isDeleted = item.is_deleted || item.deleted_for_everyone;

          const handleLongPress = () => {
            if (isDeleted) return;
            setActionSheet({ visible: true, message: item });
          };

          let timeStr = "";
          try {
            const dt = new Date(item.createdAt || item.created_at);
            if (!isNaN(dt.getTime())) {
              timeStr = dt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              });
            }
          } catch (e) {}

          let resolvedReplyContext = item.reply_context || item.replyContext;
          if (!resolvedReplyContext && (item.reply_to_id || item.replyToId)) {
            const targetId = String(item.reply_to_id || item.replyToId);
            const original = messages.find(
              (m) => String(m.id || m._id) === targetId
            );
            if (original) {
              resolvedReplyContext =
              buildReplyContext(original).reply_context;
            }
          }



          const prevItem = messages[index + 1];
          const nextItem = messages[index - 1];

          const getSenderId = (m) =>
          String(
            m?.userId ||
            m?.user?.id ||
            m?.sender?.id ||
            m?.user?._id ||
            m?.author?.id ||
            ""
          );
          const currentSenderId = getSenderId(item);

          const isSameSenderAsPrev = Boolean(
            prevItem && getSenderId(prevItem) === currentSenderId
          );
          const isSameSenderAsNext = Boolean(
            nextItem && getSenderId(nextItem) === currentSenderId
          );

          const currTime = new Date(
            item.createdAt || item.created_at || 0
          ).getTime();
          const prevTime = prevItem ?
          new Date(
            prevItem.createdAt || prevItem.created_at || 0
          ).getTime() :
          0;
          const nextTime = nextItem ?
          new Date(
            nextItem.createdAt || nextItem.created_at || 0
          ).getTime() :
          0;

          const isWithinTimeWithPrev =
          isSameSenderAsPrev && Math.abs(currTime - prevTime) < 120000;
          const isWithinTimeWithNext =
          isSameSenderAsNext && Math.abs(currTime - nextTime) < 120000;

          const isFirstInCluster = !isWithinTimeWithPrev;
          const isLastInCluster = !isWithinTimeWithNext;

          const isSticker = Boolean(
            item.media_type === "STICKER" ||
            item.mediaType === "STICKER" ||
            item.type === "STICKER" ||
            item.sticker_id ||
            item.stickerId
          );
          const isViewOnce = Boolean(item.is_view_once || item.isViewOnce);
          const isBorderlessMedia = isSticker || isViewOnce;


          const bubbleBg = isMe ?
          colors.primary || "#0284c7" :
          isDark ?
          "#27272a" :
          "#f1f5f9";

          const bubbleBorderColor = isMe ?
          "transparent" :
          isDark ?
          "#3f3f46" :
          "#e2e8f0";

          const textColor = isMe ? "#ffffff" : isDark ? "#f4f4f5" : "#0f172a";

          const timeTextColor = isMe ?
          "rgba(255, 255, 255, 0.75)" :
          isDark ?
          "#a1a1aa" :
          "#64748b";

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
              if (item.content.video_id || item.content.videoId || item.content.youtube_video_id) {
                reelData = item.content;
                isReelShare = true;
              }
            } else if (typeof item.content === "string") {
              const trimmed = item.content.trim();
              if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed && (parsed.video_id || parsed.videoId || parsed.youtube_video_id || parsed.thumbnail_url || parsed.thumbnailUrl)) {
                    reelData = parsed;
                    isReelShare = true;
                  }
                } catch (e) {}
              }
            }
          }

          return (
            <SwipeableMessageRow
              item={item}
              onSwipeToReply={handleSwipeToReply}
              isHighlighted={
              highlightedMessageId === String(item.id || item._id)
              }
              disabled={isBanned}>
              
                <Pressable
                onLongPress={handleLongPress}
                style={{
                  width: "100%",
                  opacity: isDeleted ? 0.6 : 1,
                  marginTop: isFirstInCluster ? 6 : 2,
                  marginBottom: isLastInCluster ? 4 : 2,
                  paddingHorizontal: 14
                }}>
                
                  {isMe ?

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "flex-end"
                  }}>
                  
                      <View
                    style={{
                      alignItems: "flex-end",
                      maxWidth: isBorderlessMedia ? "85%" : "80%",
                      minWidth: resolvedReplyContext ? 220 : undefined
                    }}>
                    
                        {isBorderlessMedia ?

                    <View
                      style={{ overflow: "hidden", borderRadius: 18 }}>
                      
                            {isViewOnce ?
                      item.media_type === "STICKER" ||
                      item.mediaType === "STICKER" ||
                      item.type === "STICKER" ?
                      <ViewOnceStickerMessage
                        item={item}
                        isMe={true}
                        onExpire={handleExpireMessage} /> :

                      item.audio_url || item.audioUrl ?
                      <ViewOnceAudioPlayer
                        item={item}
                        isMe={true}
                        onExpire={handleExpireMessage} /> :


                      <ViewOnceMediaCard
                        item={item}
                        isMe={true}
                        onExpire={handleExpireMessage}
                        groupId={groupId}
                        currentUser={user} /> :



                      <VideoStickerMessage
                        item={item}
                        isMe={true}
                        currentUser={user}
                        onDelete={(msg) =>
                        setActionSheet({
                          visible: true,
                          message: msg
                        })
                        } />

                      }
                          </View> :


                    <View
                      style={{
                        backgroundColor: bubbleBg,
                        borderRadius: 18,
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                        borderTopRightRadius: isFirstInCluster ? 18 : 6,
                        borderBottomRightRadius: isLastInCluster ? 4 : 6,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderWidth: isMe ? 0 : 1,
                        borderColor: bubbleBorderColor,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 3,
                        elevation: 1.5,
                        width: resolvedReplyContext ? "100%" : undefined,
                        minWidth: resolvedReplyContext ? 220 : undefined
                      }}>
                      
                            {}
                            {Boolean(resolvedReplyContext) &&
                      <QuotedMessageBlock
                        replyContext={resolvedReplyContext}
                        isMe={true}
                        onPress={handleScrollToQuotedMessage} />

                      }

                            {isDeleted ?
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontStyle: "italic",
                          fontSize: 13
                        }}>
                        
                                <Feather
                          name="slash"
                          size={12}
                          color="rgba(255, 255, 255, 0.7)" />
                        {" "}
                                Mensagem apagada
                              </Text> :

                      <>
                                {!!(item.audio_url || item.audioUrl) &&
                        <AudioMessagePlayer
                          audioUrl={item.audio_url || item.audioUrl}
                          isMe={true} />

                        }
                                {isReelShare && !!reelData && (
                                  <ReelShareCard
                                    reelData={reelData}
                                    isMe={true}
                                    onPress={(data) => {
                                      const vId = data?.video_id || data?.videoId || data?.youtube_video_id;
                                      if (vId) {
                                        Linking.openURL(`https://www.youtube.com/shorts/${vId}`).catch(() => {});
                                      }
                                    }}
                                  />
                                )}
                                {!!item.content && !isReelShare && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                            flexWrap: "wrap"
                          }}>
                          
                                    <Text
                            style={{
                              color: textColor,
                              fontSize: 14.5,
                              fontFamily: "Poppins_400Regular",
                              lineHeight: 20
                            }}>
                            
                                      {item.content}
                                    </Text>
                                    <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginLeft: "auto",
                              paddingLeft: 10,
                              paddingTop: 2
                            }}>
                            
                                      {!!timeStr &&
                            <Text
                              style={{
                                color: timeTextColor,
                                fontSize: 10,
                                fontFamily: "Poppins_400Regular"
                              }}>
                              
                                          {timeStr}
                                        </Text>
                            }
                                      <View
                              style={{
                                flexDirection: "row",
                                marginLeft: 3
                              }}>
                              
                                        <Feather
                                name="check"
                                size={11}
                                color="#ffffff"
                                style={{ marginRight: -5 }} />
                              
                                        <Feather
                                name="check"
                                size={11}
                                color="#ffffff" />
                              
                                      </View>
                                    </View>
                                  </View>
                                )}
                              </>
                      }
                          </View>
                    }
                      </View>
                    </View> :


                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    alignItems: "flex-end",
                    gap: 8
                  }}>
                  
                      {}
                      {isLastInCluster ?
                  <Pressable
                    onPress={() =>
                    onOpenProfile &&
                    onOpenProfile(
                      item.user || item.sender || item.author
                    )
                    }>
                    
                          <Avatar
                      url={
                      item.user?.avatar_url ||
                      item.sender?.avatar_url ||
                      item.author?.avatar_url
                      }
                      fallback={authorName}
                      size={32} />
                    
                        </Pressable> :

                  <View style={{ width: 32 }} />
                  }

                      <View
                    style={{
                      alignItems: "flex-start",
                      maxWidth: isBorderlessMedia ? "85%" : "80%",
                      minWidth: resolvedReplyContext ? 220 : undefined
                    }}>
                    
                        {}
                        {isFirstInCluster && !isBorderlessMedia &&
                    <Text
                      style={{
                        color: colors.primary || "#38bdf8",
                        fontSize: 11.5,
                        fontFamily: "Poppins_600SemiBold",
                        marginBottom: 2,
                        marginLeft: 4
                      }}>
                      
                            {authorName}
                          </Text>
                    }

                        {isBorderlessMedia ?

                    <View
                      style={{ overflow: "hidden", borderRadius: 18 }}>
                      
                            {isViewOnce ?
                      item.media_type === "STICKER" ||
                      item.mediaType === "STICKER" ||
                      item.type === "STICKER" ?
                      <ViewOnceStickerMessage
                        item={item}
                        isMe={false}
                        onExpire={handleExpireMessage} /> :

                      item.audio_url || item.audioUrl ?
                      <ViewOnceAudioPlayer
                        item={item}
                        isMe={false}
                        onExpire={handleExpireMessage} /> :


                      <ViewOnceMediaCard
                        item={item}
                        isMe={false}
                        onExpire={handleExpireMessage}
                        groupId={groupId}
                        currentUser={user} /> :



                      <VideoStickerMessage
                        item={item}
                        isMe={false}
                        currentUser={user} />

                      }
                          </View> :


                    <View
                      style={{
                        backgroundColor: bubbleBg,
                        borderRadius: 18,
                        borderTopRightRadius: 18,
                        borderBottomRightRadius: 18,
                        borderTopLeftRadius: isFirstInCluster ? 18 : 6,
                        borderBottomLeftRadius: isLastInCluster ? 4 : 6,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderWidth: 1,
                        borderColor: bubbleBorderColor,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isDark ? 0.2 : 0.05,
                        shadowRadius: 3,
                        elevation: 1.5,
                        width: resolvedReplyContext ? "100%" : undefined,
                        minWidth: resolvedReplyContext ? 220 : undefined
                      }}>
                      
                            {}
                            {Boolean(resolvedReplyContext) &&
                      <QuotedMessageBlock
                        replyContext={resolvedReplyContext}
                        isMe={false}
                        onPress={handleScrollToQuotedMessage} />

                      }

                            {isDeleted ?
                      <Text
                        style={{
                          color: colors.muted,
                          fontStyle: "italic",
                          fontSize: 13
                        }}>
                        
                                <Feather
                          name="slash"
                          size={12}
                          color={colors.muted} />
                        {" "}
                                Mensagem apagada
                              </Text> :

                      <>
                                {!!(item.audio_url || item.audioUrl) &&
                        <AudioMessagePlayer
                          audioUrl={item.audio_url || item.audioUrl}
                          isMe={false} />

                        }
                                {isReelShare && !!reelData && (
                                  <ReelShareCard
                                    reelData={reelData}
                                    isMe={false}
                                    onPress={(data) => {
                                      const vId = data?.video_id || data?.videoId || data?.youtube_video_id;
                                      if (vId) {
                                        Linking.openURL(`https://www.youtube.com/shorts/${vId}`).catch(() => {});
                                      }
                                    }}
                                  />
                                )}
                                {!!item.content && !isReelShare && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                            flexWrap: "wrap"
                          }}>
                          
                                    <Text
                            style={{
                              color: textColor,
                              fontSize: 14.5,
                              fontFamily: "Poppins_400Regular",
                              lineHeight: 20
                            }}>
                            
                                      {item.content}
                                    </Text>
                                    {!!timeStr &&
                          <Text
                            style={{
                              color: timeTextColor,
                              fontSize: 10,
                              fontFamily: "Poppins_400Regular",
                              marginLeft: "auto",
                              paddingLeft: 10,
                              paddingTop: 2
                            }}>
                            
                                        {timeStr}
                                      </Text>
                          }
                                  </View>
                                )}
                              </>
                      }
                          </View>
                    }
                      </View>
                    </View>
                }
                </Pressable>
              </SwipeableMessageRow>);

        }}
        ListEmptyComponent={
        <Text
          style={{
            color: colors.muted,
            textAlign: "center",
            marginTop: 40
          }}>
          
              Nenhuma postagem na tribo ainda.
            </Text>
        } />

      }

      {}
      {commentPost &&
      <GroupComments
        groupId={groupId}
        post={commentPost}
        currentUser={user}
        onClose={() => setCommentPost(null)}
        onOpenProfile={onOpenProfile} />

      }

      {}
      <MediaViewerModal
        visible={Boolean(fullscreenMedia)}
        mediaUrl={fullscreenMedia?.url}
        mediaType={fullscreenMedia?.type || "image"}
        post={fullscreenMedia?.post}
        onDelete={(media) => {
          const targetPost = media?.post || fullscreenMedia?.post;
          setFullscreenMedia(null);
          if (targetPost) {
            setSelectedPost(targetPost);
          }
        }}
        onClose={() => setFullscreenMedia(null)} />
      

      {}
      {selectedPost &&
      <Modal
        transparent
        visible
        animationType="slide"
        onRequestClose={() => setSelectedPost(null)}>
        
          <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end"
          }}
          onPress={() => setSelectedPost(null)}>
          
            <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 10
            }}>
            
              <View
              style={{
                width: 48,
                height: 6,
                backgroundColor: colors.border,
                borderRadius: 3,
                alignSelf: "center",
                marginBottom: 24
              }} />
            

              <Text
              style={{
                color: colors.text,
                fontFamily: "Poppins_600SemiBold",
                fontSize: 18,
                marginBottom: 20,
                textAlign: "center"
              }}>
              
                Opções da Publicação
              </Text>

              {}
              {(isAdmin ||
            String(
              selectedPost.user?.id ||
              selectedPost.userId ||
              selectedPost.user_id
            ) === String(user?.id)) &&
            <Pressable
              style={({ pressed }) => [
              styles.settingRow,
              {
                backgroundColor: pressed ?
                colors.surfaceAlt :
                "transparent",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 8
              }]
              }
              onPress={handleDeletePost}>
              
                  <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(239,68,68,0.1)",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                
                    <Feather
                  name="trash-2"
                  size={18}
                  color={colors.danger || "#ef4444"} />
                
                  </View>
                  <Text
                style={{
                  color: colors.danger || "#ef4444",
                  fontSize: 16,
                  fontFamily: "Inter_500Medium",
                  marginLeft: 16
                }}>
                
                    Apagar Publicação
                  </Text>
                </Pressable>
            }

              {}
              {isAdmin &&
            String(
              selectedPost.user?.id ||
              selectedPost.userId ||
              selectedPost.user_id
            ) !== String(user?.id) &&
            <Pressable
              style={({ pressed }) => [
              styles.settingRow,
              {
                backgroundColor: pressed ?
                colors.surfaceAlt :
                "transparent",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 8
              }]
              }
              onPress={handleKickUser}>
              
                    <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(239,68,68,0.1)",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                
                      <Feather
                  name="user-x"
                  size={18}
                  color={colors.danger || "#ef4444"} />
                
                    </View>
                    <Text
                style={{
                  color: colors.danger || "#ef4444",
                  fontSize: 16,
                  fontFamily: "Inter_500Medium",
                  marginLeft: 16
                }}>
                
                      Remover Autor do Grupo
                    </Text>
                  </Pressable>
            }

              <Pressable
              style={({ pressed }) => [
              {
                marginTop: 12,
                paddingVertical: 16,
                alignItems: "center",
                backgroundColor: pressed ?
                colors.surfaceAlt :
                colors.background,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border
              }]
              }
              onPress={() => setSelectedPost(null)}>
              
                <Text
                style={{
                  color: colors.text,
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 16
                }}>
                
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      }

      {}
      <TriboAlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttonText={alertState.buttonText}
        onClose={() => {
          if (alertState.onClose) alertState.onClose();
          setAlertState({ visible: false });
        }}
        secondaryButtonText={alertState.secondaryButtonText}
        onSecondaryPress={alertState.onSecondaryPress} />
      
    </View>);

}

function formatAudioTime(millis) {
  const totalSeconds = Math.floor(millis / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}




const ChatVideoThumbnail = React.memo(function ChatVideoThumbnail({
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
        style={{
          width: 230,
          height: 230,
          borderRadius: 16,
          backgroundColor: "#18181b",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)"
        }} />);


  }
  return <ActiveChatVideoThumbnailInner url={url} onPress={onPress} onLongPress={onLongPress} />;
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
      style={{
        width: 230,
        height: 230,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#18181b",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        position: "relative"
      }}>
      
      {isMountedRef.current && player ?
      <VideoView
        key={url}
        player={player}
        nativeControls={false}
        contentFit="cover"
        style={{ width: "100%", height: "100%" }} /> :


      <View style={{ width: "100%", height: "100%", backgroundColor: "#18181b" }} />
      }
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.25)"
        }}>
        
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.35)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4
          }}>
          
          <Feather
            name="play"
            size={22}
            color="#FFFFFF"
            style={{ marginLeft: 3 }} />
          
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 4
        }}>
        
        <Feather name="video" size={11} color="#FFFFFF" />
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 10,
            fontFamily: "Poppins_600SemiBold"
          }}>
          
          Vídeo
        </Text>
      </View>
    </Pressable>);

}

const GroupChatTab = React.forwardRef(function GroupChatTab(
{
  groupId,
  group,
  user,
  colors,
  targetMessageId,
  onTargetReached,
  onOpenProfile,
  onShowToast,
  onShowAlert
},
ref)
{
  const insets = useSafeAreaInsets();
  const { isDark: themeIsDark, mode } = useTheme();
  const isDark = Boolean(
    themeIsDark ||
    mode === "dark" ||
    mode === "oled" ||
    colors?.mode === "dark"
  );

  const [messages, setMessages] = useState([]);
  const [actionSheet, setActionSheet] = useState({
    visible: false,
    message: null
  });
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    setAudioRecordingActive(isRecording);
    return () => {
      setAudioRecordingActive(false);
    };
  }, [isRecording]);

  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUri, setAudioUri] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [recording, setRecording] = useState(null);
  const recordingRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [createStickerVisible, setCreateStickerVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [showGoldBenefitsModal, setShowGoldBenefitsModal] = useState(false);
  const [isMeSpeaking, setIsMeSpeaking] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState([]);
  const [viewerMedia, setViewerMedia] = useState(null);
  const [firstUnreadGroupId, setFirstUnreadGroupId] = useState(null);
  const groupInitialScrollDoneRef = useRef(false);

  useEffect(() => {
    const showEvent =
    Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
    Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isUserGold = Boolean(
    user?.badge_type === "GOLD" ||
    user?.badge_type === "GOLD_VERIFIED" ||
    user?.badgeType === "GOLD" ||
    user?.is_gold ||
    user?.isGold ||
    user?.is_vip ||
    user?.badge === "GOLD"
  );

  const isAnySpeakerActive = activeSpeakers.length > 0 || isMeSpeaking;

  const getSpeakersSubtitle = () => {
    if (activeSpeakers.length === 0) {
      return isMeSpeaking ?
      "Você ao vivo (Falando...)" :
      "Toque para falar ao vivo na tribo";
    }
    const formatted = activeSpeakers.map((s) =>
    String(s.id || s.userId) === String(user?.id) ?
    "Você" :
    s.name || s.username || "Membro"
    );
    if (formatted.length === 1) {
      return `${formatted[0]} ao vivo (Falando...)`;
    }
    if (formatted.length === 2) {
      return `${formatted[0]} e ${formatted[1]} ao vivo (Falando...)`;
    }
    return `${formatted[0]}, ${formatted[1]} e mais ${formatted.length - 2} ao vivo (Falando...)`;
  };

  const handleToggleLiveVoice = async () => {
    if (!isMeSpeaking) {
      if (!isUserGold) {
        setInternalAlert({
          visible: true,
          title: "Recurso Exclusivo VIP",
          message: "A transmissão de voz ao vivo é permitida apenas para membros com Selo Dourado.",
          type: "warning",
          primaryText: "Entendido",
          onPrimaryPress: () => setInternalAlert({ visible: false })
        });
        return;
      }
      const socket = getChatSocket();
      if (!socket) return;
      await setLiveVoiceAudioMode(true).catch(() => {});
      setIsMeSpeaking(true);
      socket.emit("group-live-voice-start", {
        room: groupId,
        groupId,
        userId: user?.id,
        user: {
          id: user?.id,
          name: user?.name,
          username: user?.username,
          avatar_url: user?.avatar_url,
          badge_type: user?.badge_type
        }
      });


      liveVoiceStreamer.startStreaming({
        groupId,
        user: {
          id: user?.id,
          name: user?.name,
          username: user?.username,
          avatar_url: user?.avatar_url
        },
        socket,
        onError: (err) => {
          console.warn("[LIVE VOICE ERROR]:", err);
          handleToggleLiveVoice();
        }
      });
    } else {
      const socket = getChatSocket();
      if (socket) {
        socket.emit("group-live-voice-stop", {
          room: groupId,
          groupId,
          userId: user?.id
        });
      }
      liveVoiceStreamer.stopStreaming();
      setIsMeSpeaking(false);
      await setLiveVoiceAudioMode(false).catch(() => {});
    }
  };
  const [internalAlert, setInternalAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
    primaryText: "Entendido",
    onPrimaryPress: null,
    secondaryText: null,
    onSecondaryPress: null
  });

  const [contextSheet, setContextSheet] = useState({ visible: false, message: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, mode: "me", message: null });
  const [modernToast, setModernToast] = useState({ visible: false, message: "", type: "success" });

  const isGroupAdmin = Boolean(
    group?.creator_id === user?.id ||
    group?.creatorId === user?.id ||
    group?.is_admin ||
    group?.isAdmin ||
    group?.role === "admin" ||
    group?.role === "creator" ||
    group?.role === "owner"
  );

  const flatListRef = useRef(null);
  const isBanned = Boolean(group?.is_banned || group?.isBanned);
  const banReason = group?.ban_reason || group?.banReason || "";

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    clearMessagesLocally: () => {
      setMessages([]);
    },
    loadMessages
  }));

  const showInternalAlert = ({
    title,
    message,
    type = "info",
    primaryText = "Entendido",
    onPrimaryPress = null,
    secondaryText = null,
    onSecondaryPress = null
  }) => {
    setInternalAlert({
      visible: true,
      title,
      message,
      type,
      primaryText,
      onPrimaryPress,
      secondaryText,
      onSecondaryPress
    });
  };

  const handleOpenContextMenu = (item) => {
    if (!item || item.is_deleted || item.deleted_for_everyone) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {}
    setContextSheet({ visible: true, message: item });
  };

  const handleSaveMedia = async (msg, mediaType) => {
    const url = msg?.media_url || msg?.mediaUrl || msg?.video_url || msg?.url;
    if (!url) return;
    try {
      const res = await saveMediaToGallery({ url, type: mediaType });
      setModernToast({
        visible: true,
        message: res.message || "Mídia salva na galeria com sucesso!",
        type: "success"
      });
    } catch (err) {
      showInternalAlert({
        title: "Erro ao Salvar",
        message: err.message || "Não foi possível salvar a mídia na galeria.",
        type: "error"
      });
    }
  };

  const handleSaveSticker = async (msg) => {
    const url = msg?.media_url || msg?.mediaUrl || msg?.video_url || msg?.url;
    const stickerId = msg?.sticker_id || msg?.stickerId || msg?.id;
    if (!url) return;
    try {
      await saveStickerToInventory({
        id: stickerId,
        sticker_id: stickerId,
        video_url: url,
        media_url: url,
        sticker_name: msg?.sticker_name || msg?.stickerName || "Figurinha de Vídeo",
        pack_name: msg?.pack_name || msg?.packName || "Gerais",
        author_name: msg?.author_name || msg?.authorName || "Tribo",
        description: msg?.description || null
      });
      setModernToast({
        visible: true,
        message: "Figurinha adicionada aos favoritos!",
        type: "success"
      });
    } catch (err) {
      showInternalAlert({
        title: "Erro",
        message: "Não foi possível salvar a figurinha no inventário.",
        type: "error"
      });
    }
  };

  const handleExecuteDelete = async () => {
    const { mode, message: msg } = deleteConfirm;
    const msgId = msg?.id || msg?._id;
    setDeleteConfirm({ visible: false, mode: "me", message: null });
    if (!msgId) return;

    if (mode === "me") {

      setMessages((prev) => prev.filter((m) => String(m.id || m._id) !== String(msgId)));
      setModernToast({
        visible: true,
        message: "Mensagem apagada para você.",
        type: "info"
      });
      api.groups.deleteChatMessage(groupId, msgId, { forEveryone: false, type: "me" }).catch((err) => {
        console.warn("Erro ao apagar para mim:", err);
      });
    } else {

      setMessages((prev) =>
      prev.map((m) =>
      String(m.id || m._id) === String(msgId) ?
      {
        ...m,
        is_deleted: true,
        deleted_for_everyone: true,
        content: "Esta mensagem foi apagada",
        media_url: null,
        audio_url: null
      } :
      m
      )
      );
      setModernToast({
        visible: true,
        message: "Mensagem apagada para todos.",
        type: "info"
      });

      try {
        const socket = getChatSocket();
        if (socket) {
          socket.emit("group-message-deleted", {
            groupId: String(groupId),
            messageId: msgId,
            forEveryone: true
          });
          socket.emit("delete-message", {
            room: String(groupId),
            messageId: msgId,
            forEveryone: true
          });
        }
      } catch (e) {}

      api.groups.deleteChatMessage(groupId, msgId, { forEveryone: true, type: "everyone" }).catch((err) => {
        console.warn("Erro ao apagar para todos:", err);
      });
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.groups.messages(groupId);
      let rawMsgs = listFrom(res, ["messages", "data"]) || res || [];
      const clearedTimestamp = await getClearedChatTimestamp(groupId);
      let list = filterClearedMessages(rawMsgs, clearedTimestamp);
      const expiredIds = await getExpiredMessageIds(groupId);
      list = sanitizeMessagesWithExpiration(list, expiredIds);

      list.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      setMessages(list);

      const lastReadTimeStr = await AsyncStorage.getItem(`@tribo_group_last_read_${groupId}`);
      if (!groupInitialScrollDoneRef.current && lastReadTimeStr) {
        const lastReadTime = new Date(lastReadTimeStr).getTime();
        const unreadMsgs = list.filter((m) => {
          const isSenderMe = [
            m.userId,
            m.user_id,
            m.user?.id,
            m.sender?.id,
            m.author?.id
          ].some((id) => String(id) === String(user?.id));
          const msgTime = new Date(m.createdAt || m.created_at || 0).getTime();
          return !isSenderMe && msgTime > lastReadTime;
        });

        if (unreadMsgs.length > 0) {
          const oldestUnread = unreadMsgs[unreadMsgs.length - 1];
          const oldestUnreadId = String(oldestUnread.id || oldestUnread._id);
          const oldestUnreadIdx = list.findIndex((m) => String(m.id || m._id) === oldestUnreadId);

          if (oldestUnreadIdx > 0) {
            setFirstUnreadGroupId(oldestUnreadId);
            groupInitialScrollDoneRef.current = true;
            setTimeout(() => {
              try {
                flatListRef.current?.scrollToIndex({
                  index: oldestUnreadIdx,
                  animated: true,
                  viewPosition: 0.5
                });
              } catch (e) {
                flatListRef.current?.scrollToOffset({
                  offset: oldestUnreadIdx * 75,
                  animated: true
                });
              }
            }, 250);
          }
        }
      }

      AsyncStorage.setItem(`@tribo_group_last_read_${groupId}`, new Date().toISOString()).catch(() => {});
      AsyncStorage.setItem(`@tribo_unread_count_${groupId}`, "0").catch(() => {});
    } catch (err) {
      console.warn("Erro ao buscar mensagens:", errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);


  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    socket.emit("join_group", groupId);

    const handleNewMessage = (msg) => {
      if (String(msg.groupId || msg.group_id) === String(groupId)) {
        setMessages((prev) => {
          if (
          prev.some(
            (m) => String(m.id || m._id) === String(msg.id || msg._id)
          ))
          {
            return prev;
          }
          return [msg, ...prev];
        });
      }
    };

    socket.on("group_message", handleNewMessage);
    socket.on("new_message", handleNewMessage);

    const handleActiveSpeakersUpdated = (payload) => {
      if (String(payload?.room || payload?.groupId) === String(groupId)) {
        const speakers = Array.isArray(payload.speakers) ? payload.speakers : [];
        setActiveSpeakers(speakers);
        const amISpeaking = speakers.some((s) => String(s.id || s.userId) === String(user?.id));
        if (amISpeaking && !isMeSpeaking) {
          setIsMeSpeaking(true);
        } else if (!amISpeaking && isMeSpeaking) {
          setIsMeSpeaking(false);
          liveVoiceStreamer.stopStreaming();
        }
      }
    };

    const handleUserStartedSpeaking = (payload) => {
      if (String(payload?.room || payload?.groupId) === String(groupId)) {
        const spk = payload.user || { id: payload.userId, name: payload.userName };
        setActiveSpeakers((prev) => {
          const exists = prev.some((s) => String(s.id || s.userId) === String(spk.id || spk.userId));
          if (exists) return prev;
          return [...prev, spk];
        });
        if (String(payload.userId || spk.id) === String(user?.id)) {
          setIsMeSpeaking(true);
        }
      }
    };

    const handleUserStoppedSpeaking = (payload) => {
      if (String(payload?.room || payload?.groupId) === String(groupId)) {
        const targetId = String(payload.userId || payload.user?.id);
        setActiveSpeakers((prev) => prev.filter((s) => String(s.id || s.userId) !== targetId));
        if (targetId === String(user?.id)) {
          setIsMeSpeaking(false);
          liveVoiceStreamer.stopStreaming();
        }
      }
    };

    const handleLiveVoiceStopped = (payload) => {
      if (String(payload?.room || payload?.groupId) === String(groupId)) {
        setActiveSpeakers([]);
        setIsMeSpeaking(false);
        liveVoiceStreamer.stopStreaming();
      }
    };

    const handleLiveVoiceChunk = async (payload) => {
      if (String(payload?.room || payload?.groupId) === String(groupId)) {
        liveVoiceStreamer.playChunk(payload, user?.id);
      }
    };

    const handleMessageDeleted = (payload) => {
      const targetId = String(payload?.messageId || payload?.id);
      if (targetId) {
        setMessages((prev) =>
        prev.map((m) =>
        String(m.id || m._id) === targetId ?
        {
          ...m,
          is_deleted: true,
          deleted_for_everyone: true,
          content: "Esta mensagem foi apagada",
          media_url: null,
          audio_url: null
        } :
        m
        )
        );
      }
    };

    socket.on("active-speakers-updated", handleActiveSpeakersUpdated);
    socket.on("user-started-speaking", handleUserStartedSpeaking);
    socket.on("user-stopped-speaking", handleUserStoppedSpeaking);
    socket.on("group-live-voice-started", handleActiveSpeakersUpdated);
    socket.on("group-live-voice-stopped", handleLiveVoiceStopped);
    socket.on("group-live-voice-chunk", handleLiveVoiceChunk);
    socket.on("group-message-deleted", handleMessageDeleted);
    socket.on("message-deleted", handleMessageDeleted);


    socket.emit("get-active-speakers", { room: groupId, groupId });

    return () => {
      liveVoiceStreamer.stopStreaming();
      socket.off("group_message", handleNewMessage);
      socket.off("new_message", handleNewMessage);
      socket.off("active-speakers-updated", handleActiveSpeakersUpdated);
      socket.off("user-started-speaking", handleUserStartedSpeaking);
      socket.off("user-stopped-speaking", handleUserStoppedSpeaking);
      socket.off("group-live-voice-started", handleActiveSpeakersUpdated);
      socket.off("group-live-voice-stopped", handleLiveVoiceStopped);
      socket.off("group-live-voice-chunk", handleLiveVoiceChunk);
      socket.off("group-message-deleted", handleMessageDeleted);
      socket.off("message-deleted", handleMessageDeleted);
      socket.emit("leave_group", groupId);
    };
  }, [groupId]);

  const handleExpireMessage = (expiredMsgId) => {
    markMessageAsExpired(groupId, expiredMsgId);
    setMessages((prev) =>
    prev.map((m) =>
    String(m.id || m._id) === String(expiredMsgId) ?
    {
      ...m,
      is_expired: true,
      isExpired: true,
      content: "[Mídia temporária expirada]"
    } :
    m
    )
    );
  };

  const handleSwipeToReply = (msg) => {
    if (isBanned) return;
    setReplyingTo(msg);
  };

  const handleScrollToQuotedMessage = (quotedMsgId) => {
    if (!quotedMsgId) return;
    const targetIdStr = String(quotedMsgId);
    const targetIndex = messages.findIndex(
      (m) => String(m.id || m._id) === targetIdStr
    );

    if (targetIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: targetIndex,
        animated: true,
        viewPosition: 0.5
      });
      setHighlightedMessageId(targetIdStr);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    }
  };

  const handleSendSticker = async (sticker) => {
    if (sending || isBanned) return;
    try {
      setSending(true);
      const stickerUrl =
      sticker?.video_url ||
      sticker?.videoUrl ||
      sticker?.media_url ||
      sticker?.mediaUrl ||
      sticker?.url;
      const stickerId =
      sticker?.id || sticker?.sticker_id || sticker?.stickerId;
      const stickerName =
      sticker?.sticker_name || sticker?.stickerName || "Figurinha";
      const packName = sticker?.pack_name || sticker?.packName || "Gerais";

      const payload = {
        groupId,
        content: "",
        media_url: stickerUrl,
        media_type: "STICKER",
        sticker_id: stickerId,
        sticker_name: stickerName,
        pack_name: packName,
        is_view_once: isViewOnce,
        reply_to_id: replyingTo ?
        String(replyingTo.id || replyingTo._id) :
        null
      };

      await api.groups.sendMessage(groupId, payload);
      setIsViewOnce(false);
      setReplyingTo(null);
      setStickerPickerVisible(false);
      setCreateStickerVisible(false);
      loadMessages();
    } catch (err) {
      showInternalAlert({
        title: "Erro ao enviar figurinha",
        message: errorMessage(err),
        type: "error"
      });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !audioUri && !selectedMedia || sending || isBanned)
    return;
    try {
      setSending(true);
      let mediaUrl = null;
      let mediaType = "TEXT";
      let uploadedAudioUrl = audioUri;

      if (audioUri) {
        try {
          const uploadFn = api.uploads?.audio || api.upload?.audio;
          if (uploadFn) {
            const uploadRes = await uploadFn(
              audioUri,
              "audio.m4a",
              "audio/m4a"
            );
            uploadedAudioUrl =
            getUploadUrl(uploadRes) || uploadRes?.url || audioUri;
          }
        } catch (e) {}
      }

      if (selectedMedia) {
        const rawUri = selectedMedia.url || selectedMedia.uri;
        mediaUrl = rawUri;
        mediaType = selectedMedia.type === "video" ? "VIDEO" : "IMAGE";
        try {
          if (mediaType === "VIDEO" && api.uploads?.video) {
            const uploadRes = await api.uploads.video(
              rawUri,
              "video.mp4",
              "video/mp4"
            );
            mediaUrl = getUploadUrl(uploadRes) || uploadRes?.url || rawUri;
          } else if (api.uploads?.photo) {
            const uploadRes = await api.uploads.photo(
              rawUri,
              "photo.jpg",
              "image/jpeg"
            );
            mediaUrl = getUploadUrl(uploadRes) || uploadRes?.url || rawUri;
          }
        } catch (e) {}
      }

      const payload = {
        groupId,
        content: text.trim(),
        media_url: mediaUrl,
        media_type: audioUri ? "AUDIO" : mediaType,
        audio_url: uploadedAudioUrl,
        is_view_once: isViewOnce,
        reply_to_id: replyingTo ?
        String(replyingTo.id || replyingTo._id) :
        null
      };

      await api.groups.sendMessage(groupId, payload);
      setText("");
      setSelectedMedia(null);
      setAudioUri(null);
      setIsViewOnce(false);
      setReplyingTo(null);
      loadMessages();
    } catch (err) {
      showInternalAlert({
        title: "Erro ao enviar",
        message: errorMessage(err),
        type: "error"
      });
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      await setOptimizedAudioMode(true);
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        showInternalAlert({
          title: "Permissão Necessária",
          message: "Permita o acesso ao microfone para gravar áudios.",
          type: "info"
        });
        return;
      }
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = newRecording;
      setRecording(newRecording);
      setIsRecording(true);
      setRecordSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      console.warn("Erro ao iniciar gravação:", err);
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setRecording(null);
      setIsRecording(false);
      setAudioUri(null);
      setRecordSeconds(0);
      await setOptimizedAudioMode(false);
    } catch (err) {}
  };

  const stopAndSendRecording = async () => {
    try {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        setRecording(null);
        setIsRecording(false);
        await setOptimizedAudioMode(false);

        if (uri) {
          setSending(true);


          const tempMsgId = `temp_audio_${Date.now()}`;
          const optimisticMsg = {
            id: tempMsgId,
            _id: tempMsgId,
            userId: user?.id,
            user: user,
            sender: user,
            author: user,
            audio_url: uri,
            audioUrl: uri,
            media_type: "AUDIO",
            mediaType: "AUDIO",
            content: "",
            is_view_once: isViewOnce,
            reply_to_id: replyingTo ?
            String(replyingTo.id || replyingTo._id) :
            null,
            createdAt: new Date().toISOString(),
            is_sending: true
          };

          setMessages((prev) => [optimisticMsg, ...prev]);


          const uploadFn =
          api.uploads?.audio ||
          api.upload?.audio ||
          api.uploads?.media ||
          api.upload?.media;

          if (!uploadFn) {
            throw new Error("Serviço de upload de áudio indisponível.");
          }

          const uploadRes = await uploadFn(
            uri,
            `audio_${Date.now()}.m4a`,
            "audio/m4a"
          );
          const finalAudioUrl =
          getUploadUrl(uploadRes) ||
          uploadRes?.url ||
          uploadRes?.secure_url ||
          uploadRes?.data?.url ||
          uploadRes?.audio_url ||
          uploadRes?.file_url;

          if (
          !finalAudioUrl ||
          !finalAudioUrl.startsWith("http://") &&
          !finalAudioUrl.startsWith("https://") &&
          !finalAudioUrl.startsWith("/"))
          {
            throw new Error(
              "Não foi possível obter a URL do áudio no servidor. Verifique a conexão com a API."
            );
          }


          const sentRes = await api.groups.sendMessage(groupId, {
            groupId,
            content: "",
            audio_url: finalAudioUrl,
            media_type: "AUDIO",
            is_view_once: isViewOnce,
            reply_to_id: replyingTo ?
            String(replyingTo.id || replyingTo._id) :
            null
          });


          const realMsg = sentRes?.message || sentRes?.data || sentRes;
          setMessages((prev) =>
          prev.map((m) =>
          m.id === tempMsgId || m._id === tempMsgId ?
          {
            ...m,
            ...realMsg,
            is_sending: false,
            audio_url: finalAudioUrl,
            audioUrl: finalAudioUrl
          } :
          m
          )
          );

          setAudioUri(null);
          setIsViewOnce(false);
          setReplyingTo(null);
          loadMessages();
        }
      }
    } catch (err) {

      setMessages((prev) =>
      prev.filter((m) => !String(m.id).startsWith("temp_audio_"))
      );
      showInternalAlert({
        title: "Erro ao enviar áudio",
        message:
        errorMessage(err) ||
        "Não foi possível enviar o áudio. Verifique a conexão com o servidor.",
        type: "error"
      });
    } finally {
      setSending(false);
      setIsRecording(false);
      await setOptimizedAudioMode(false);
    }
  };

  const pickMedia = async () => {
    if (isBanned || sending) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.85
      });

      if (res.canceled || !res.assets || !res.assets[0]) return;
      const asset = res.assets[0];
      const isVideo = asset.type === "video" || asset.uri && asset.uri.toLowerCase().endsWith(".mp4");
      const tempId = `temp_media_${Date.now()}`;


      const optimisticMsg = {
        id: tempId,
        _id: tempId,
        groupId,
        userId: user?.id,
        user_id: user?.id,
        media_url: asset.uri,
        mediaUrl: asset.uri,
        media_type: isVideo ? "VIDEO" : "IMAGE",
        mediaType: isVideo ? "VIDEO" : "IMAGE",
        content: "",
        is_view_once: isViewOnce,
        isViewOnce,
        created_at: new Date().toISOString(),
        is_sending: true,
        user: {
          id: user?.id,
          name: user?.name,
          username: user?.username,
          avatar_url: user?.avatar_url
        },
        sender: {
          id: user?.id,
          name: user?.name,
          username: user?.username,
          avatar_url: user?.avatar_url
        }
      };

      setMessages((prev) => [optimisticMsg, ...prev]);


      let uploadedUrl = asset.uri;
      try {
        if (isVideo && api.uploads?.video) {
          const uploadRes = await api.uploads.video(
            asset.uri,
            "video.mp4",
            "video/mp4"
          );
          uploadedUrl = getUploadUrl(uploadRes) || uploadRes?.url || asset.uri;
        } else if (api.uploads?.photo) {
          const uploadRes = await api.uploads.photo(
            asset.uri,
            "photo.jpg",
            "image/jpeg"
          );
          uploadedUrl = getUploadUrl(uploadRes) || uploadRes?.url || asset.uri;
        } else if (api.upload?.file) {
          const formData = new FormData();
          formData.append("file", {
            uri:
            Platform.OS === "ios" ?
            asset.uri.replace("file://", "") :
            asset.uri,
            name: isVideo ? `video_${Date.now()}.mp4` : `image_${Date.now()}.jpg`,
            type: isVideo ? "video/mp4" : "image/jpeg"
          });
          const uploadRes = await api.upload.file(formData);
          uploadedUrl = getUploadUrl(uploadRes) || uploadRes?.url || asset.uri;
        }
      } catch (uploadErr) {
        console.warn("Upload fallback de mídia:", uploadErr);
      }


      const payload = {
        groupId,
        content: "",
        media_url: uploadedUrl,
        media_type: isVideo ? "VIDEO" : "IMAGE",
        is_view_once: isViewOnce,
        reply_to_id: replyingTo ?
        String(replyingTo.id || replyingTo._id) :
        null
      };

      const sentRes = await api.groups.sendMessage(groupId, payload);
      const realMsg =
      sentRes?.data || sentRes?.message || sentRes?.direct_message || sentRes;

      setMessages((prev) =>
      prev.map((m) =>
      m.id === tempId || m._id === tempId ?
      {
        ...m,
        ...realMsg,
        is_sending: false,
        media_url: uploadedUrl,
        mediaUrl: uploadedUrl,
        media_type: isVideo ? "VIDEO" : "IMAGE",
        mediaType: isVideo ? "VIDEO" : "IMAGE"
      } :
      m
      )
      );

      setIsViewOnce(false);
      setReplyingTo(null);
      loadMessages();
    } catch (err) {
      setMessages((prev) =>
      prev.filter((m) => !String(m.id).startsWith("temp_media_"))
      );
      showInternalAlert({
        title: "Erro ao enviar mídia",
        message: errorMessage(err) || "Não foi possível enviar a mídia selecionada.",
        type: "error"
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000000" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      
      {}
      <Pressable
        onPress={handleToggleLiveVoice}
        style={({ pressed }) => [{
          marginHorizontal: 10,
          marginTop: 4,
          marginBottom: 4,
          backgroundColor: '#18181b',
          borderRadius: 22,
          borderWidth: 1,
          borderColor: isAnySpeakerActive ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.06)',
          paddingHorizontal: 12,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1
        }]}>
        
        <View style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: isAnySpeakerActive ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.15)',
          borderWidth: 1,
          borderColor: isAnySpeakerActive ? 'rgba(245, 158, 11, 0.5)' : 'rgba(245, 158, 11, 0.3)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 9,
          shadowColor: '#f59e0b',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isAnySpeakerActive ? 0.6 : 0.2,
          shadowRadius: 5,
          elevation: 3
        }}>
          <Ionicons name="radio" size={17} color="#f59e0b" />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'Poppins_700Bold' }}>
              Voz ao Vivo
            </Text>
            <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 5, paddingVertical: 0, borderRadius: 5 }}>
              <Text style={{ color: '#f59e0b', fontSize: 9, fontFamily: 'Poppins_700Bold' }}>VIP</Text>
            </View>
            {isAnySpeakerActive &&
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
            }
          </View>
          <Text style={{ color: isAnySpeakerActive ? '#fbbf24' : '#a1a1aa', fontSize: 11, fontFamily: 'Poppins_400Regular' }} numberOfLines={1}>
            {getSpeakersSubtitle()}
          </Text>
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleToggleLiveVoice();
          }}
          style={({ pressed }) => [{
            backgroundColor: isMeSpeaking ? '#ef4444' : '#eab308',
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            opacity: pressed ? 0.85 : 1
          }]}>
          
          <Feather name={isMeSpeaking ? 'mic-off' : 'mic'} size={12} color="#000000" />
          <Text style={{ color: '#000000', fontSize: 11.5, fontFamily: 'Poppins_700Bold' }}>
            {isMeSpeaking ? 'Sair' : 'Falar ao Vivo'}
          </Text>
        </Pressable>
      </Pressable>

      {loading && messages.length === 0 ?
      <ActivityIndicator style={{ marginTop: 40 }} color="#0284c7" /> :

      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(i) => String(i.id || i._id)}
        contentContainerStyle={{ paddingBottom: 8, paddingTop: 8 }}
        onScroll={notifyChatScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const isMe = [
          item.userId,
          item.user_id,
          item.user?.id,
          item.sender?.id,
          item.author?.id].
          some((id) => String(id) === String(user?.id));
          const authorName =
          item.user?.name ||
          item.user?.username ||
          item.author?.name ||
          item.author?.username ||
          item.sender?.name ||
          item.sender?.username ||
          "Usuário";

          const isDeleted = item.is_deleted || item.deleted_for_everyone;

          const handleLongPress = () => {
            handleOpenContextMenu(item);
          };

          let timeStr = "";
          try {
            const dt = new Date(item.createdAt || item.created_at);
            if (!isNaN(dt.getTime())) {
              timeStr = dt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              });
            }
          } catch (e) {}

          let resolvedReplyContext = item.reply_context || item.replyContext;
          if (!resolvedReplyContext && (item.reply_to_id || item.replyToId)) {
            const targetId = String(item.reply_to_id || item.replyToId);
            const original = messages.find(
              (m) => String(m.id || m._id) === targetId
            );
            if (original) {
              resolvedReplyContext =
              buildReplyContext(original).reply_context;
            }
          }



          const prevItem = messages[index + 1];
          const nextItem = messages[index - 1];

          const getSenderId = (m) =>
          String(
            m?.userId ||
            m?.user?.id ||
            m?.sender?.id ||
            m?.user?._id ||
            m?.author?.id ||
            ""
          );
          const currentSenderId = getSenderId(item);

          const isSameSenderAsPrev = Boolean(
            prevItem && getSenderId(prevItem) === currentSenderId
          );
          const isSameSenderAsNext = Boolean(
            nextItem && getSenderId(nextItem) === currentSenderId
          );

          const currTime = new Date(
            item.createdAt || item.created_at || 0
          ).getTime();
          const prevTime = prevItem ?
          new Date(
            prevItem.createdAt || prevItem.created_at || 0
          ).getTime() :
          0;
          const nextTime = nextItem ?
          new Date(
            nextItem.createdAt || nextItem.created_at || 0
          ).getTime() :
          0;

          const isWithinTimeWithPrev =
          isSameSenderAsPrev && Math.abs(currTime - prevTime) < 120000;
          const isWithinTimeWithNext =
          isSameSenderAsNext && Math.abs(currTime - nextTime) < 120000;

          const isFirstInCluster = !isWithinTimeWithPrev;
          const isLastInCluster = !isWithinTimeWithNext;

          const isSticker = Boolean(
            item.media_type === "STICKER" ||
            item.mediaType === "STICKER" ||
            item.type === "STICKER" ||
            item.sticker_id ||
            item.stickerId
          );
          const isViewOnce = Boolean(item.is_view_once || item.isViewOnce);
          const isBorderlessMedia = isSticker || isViewOnce;
          const isAudio = Boolean(item.audio_url || item.audioUrl);

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
              if (item.content.video_id || item.content.videoId || item.content.youtube_video_id) {
                reelData = item.content;
                isReelShare = true;
              }
            } else if (typeof item.content === "string") {
              const trimmed = item.content.trim();
              if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed && (parsed.video_id || parsed.videoId || parsed.youtube_video_id || parsed.thumbnail_url || parsed.thumbnailUrl)) {
                    reelData = parsed;
                    isReelShare = true;
                  }
                } catch (e) {}
              }
            }
          }

          const isMediaOnly = Boolean(
            (item.media_url || item.mediaUrl) &&
            !item.audio_url &&
            !item.audioUrl &&
            !item.content?.trim() &&
            !resolvedReplyContext
          );

          const bubbleBg = isMe ?
          isAudio ?
          "#1e293b" :
          colors.primary || "#0284c7" :
          "#18181b";

          const bubbleBorderColor = isMe ? "transparent" : "#27272a";
          const isFirstUnread = String(item.id || item._id) === String(firstUnreadGroupId);

          return (
            <View key={String(item.id || item._id)}>
              {isFirstUnread && (
                <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 12, paddingHorizontal: 16 }}>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }} />
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.primary || "#0284c7",
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 14,
                    marginHorizontal: 8,
                    shadowColor: "#0284c7",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3
                  }}>
                    <Feather name="bell" size={11} color="#ffffff" style={{ marginRight: 5 }} />
                    <Text style={{ color: "#ffffff", fontSize: 11, fontFamily: "Poppins_600SemiBold" }}>Novas Mensagens Não Lidas</Text>
                  </View>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }} />
                </View>
              )}
              <SwipeableMessageRow
                item={item}
                onSwipeToReply={handleSwipeToReply}
                isHighlighted={
                highlightedMessageId === String(item.id || item._id)
                }
                disabled={isBanned}>
              
                <Pressable
                onLongPress={handleLongPress}
                style={{
                  width: "100%",
                  opacity: isDeleted ? 0.6 : 1,
                  marginTop: isFirstInCluster ? 6 : 2,
                  marginBottom: isLastInCluster ? 4 : 2,
                  paddingHorizontal: 12
                }}>
                
                  {isMe ?

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "flex-end"
                  }}>
                  
                      <View
                    style={{
                      alignItems: "flex-end",
                      maxWidth: isBorderlessMedia ? "85%" : "82%",
                      minWidth: resolvedReplyContext ? 220 : undefined
                    }}>
                    
                        {isBorderlessMedia ?

                    <View
                      style={{ overflow: "hidden", borderRadius: 16 }}>
                      
                            {isViewOnce ?
                      item.media_type === "STICKER" ||
                      item.mediaType === "STICKER" ||
                      item.type === "STICKER" ?
                      <ViewOnceStickerMessage
                        item={item}
                        isMe={true}
                        onExpire={handleExpireMessage} /> :

                      item.audio_url || item.audioUrl ?
                      <ViewOnceAudioPlayer
                        item={item}
                        isMe={true}
                        onExpire={handleExpireMessage} /> :


                      <ViewOnceMediaCard
                        item={item}
                        isMe={true}
                        onExpire={handleExpireMessage}
                        groupId={groupId}
                        currentUser={user} /> :



                      <VideoStickerMessage
                        item={item}
                        isMe={true}
                        currentUser={user}
                        onLongPress={handleLongPress}
                        onDelete={handleLongPress} />

                      }
                          </View> :


                    <View
                      style={{
                        backgroundColor: isMediaOnly ?
                        "transparent" :
                        bubbleBg,
                        borderRadius: 16,
                        borderTopLeftRadius: 16,
                        borderBottomLeftRadius: 16,
                        borderTopRightRadius: isFirstInCluster ? 16 : 4,
                        borderBottomRightRadius: isLastInCluster ? 4 : 4,
                        paddingHorizontal: isMediaOnly ? 0 : 14,
                        paddingVertical: isMediaOnly ? 0 : 9,
                        borderWidth: isMe || isMediaOnly ? 0 : 1,
                        borderColor: isMediaOnly ? "transparent" : bubbleBorderColor,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isMediaOnly ? 0 : 0.15,
                        shadowRadius: 3,
                        elevation: isMediaOnly ? 0 : 2,
                        width: resolvedReplyContext ? "100%" : undefined,
                        minWidth: resolvedReplyContext ? 220 : undefined
                      }}>
                      
                            {}
                            {Boolean(resolvedReplyContext) &&
                      <QuotedMessageBlock
                        replyContext={resolvedReplyContext}
                        isMe={true}
                        onPress={handleScrollToQuotedMessage} />

                      }

                            {isDeleted ?
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontStyle: "italic",
                          fontSize: 13
                        }}>
                        
                                <Feather
                          name="slash"
                          size={12}
                          color="rgba(255, 255, 255, 0.7)" />
                        {" "}
                                Mensagem apagada
                              </Text> :

                      <>
                                {Boolean(item.audio_url || item.audioUrl) &&
                        <AudioMessagePlayer
                          audioUrl={item.audio_url || item.audioUrl}
                          isMe={true} />

                        }
                                {Boolean(item.media_url || item.mediaUrl) && !item.audio_url && !item.audioUrl && (
                        item.media_type === "VIDEO" || String(item.media_url || item.mediaUrl).toLowerCase().endsWith(".mp4") ?
                        <ChatVideoThumbnail
                          url={item.media_url || item.mediaUrl}
                          onPress={() =>
                          setViewerMedia({
                            url: item.media_url || item.mediaUrl,
                            type: "video",
                            user: item.user || item.sender || item.author || (isMe ? user : null),
                            created_at: item.created_at || item.createdAt,
                            content: item.content || "",
                            message: item
                          })
                          }
                          onLongPress={handleLongPress} /> :


                        <Pressable
                          onPress={() =>
                          setViewerMedia({
                            url: item.media_url || item.mediaUrl,
                            type: "image",
                            user: item.user || item.sender || item.author || (isMe ? user : null),
                            created_at: item.created_at || item.createdAt,
                            content: item.content || "",
                            message: item
                          })
                          }
                          onLongPress={handleLongPress}
                          delayLongPress={200}
                          style={{
                            borderRadius: 12,
                            overflow: "hidden",
                            marginBottom: item.content ? 6 : 0,
                            backgroundColor: "rgba(0,0,0,0.2)"
                          }}>
                          
                                      <Image
                            source={{ uri: item.media_url || item.mediaUrl }}
                            style={{
                              width: 230, height: 230, borderRadius: 16
                            }}
                            resizeMode="cover" />
                          
                                    </Pressable>)

                        }
                                {isReelShare && !!reelData && (
                                  <ReelShareCard
                                    reelData={reelData}
                                    isMe={true}
                                    onPress={(data) => {
                                      const vId = data?.video_id || data?.videoId || data?.youtube_video_id;
                                      if (vId) {
                                        if (Platform.OS === "web" && typeof window !== "undefined") {
                                          window.open(`https://www.youtube.com/shorts/${vId}`, "_blank");
                                        } else {
                                          Linking.openURL(`https://www.youtube.com/shorts/${vId}`).catch(() => {});
                                        }
                                      }
                                    }}
                                  />
                                )}
                                {Boolean(item.content) && !isReelShare && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                            flexWrap: "wrap"
                          }}>
                          
                                    <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 14.5,
                              fontFamily: "Poppins_400Regular",
                              lineHeight: 20
                            }}>
                            
                                      {item.content}
                                    </Text>
                                    <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginLeft: "auto",
                              paddingLeft: 10,
                              paddingTop: 2
                            }}>
                            
                                      {Boolean(timeStr) &&
                            <Text
                              style={{
                                color: "#cbd5e1",
                                fontSize: 10,
                                fontFamily: "Poppins_400Regular"
                              }}>
                              
                                          {timeStr}
                                        </Text>
                            }
                                      <View
                              style={{
                                flexDirection: "row",
                                marginLeft: 3
                              }}>
                              
                                        <Feather
                                name="check"
                                size={11}
                                color="#38bdf8"
                                style={{ marginRight: -5 }} />
                              
                                        <Feather
                                name="check"
                                size={11}
                                color="#38bdf8" />
                              
                                      </View>
                                    </View>
                                  </View>
                                )}
                              </>
                      }
                          </View>
                    }
                      </View>
                    </View> :


                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    alignItems: "flex-end",
                    gap: 8
                  }}>
                  
                      {}
                      {isLastInCluster ?
                  <Pressable
                    onPress={() =>
                    onOpenProfile &&
                    onOpenProfile(
                      item.user || item.sender || item.author
                    )
                    }>
                    
                          <Avatar
                      url={
                      item.user?.avatar_url ||
                      item.sender?.avatar_url ||
                      item.author?.avatar_url
                      }
                      fallback={authorName}
                      size={32} />
                    
                        </Pressable> :

                  <View style={{ width: 32 }} />
                  }

                      <View
                    style={{
                      alignItems: "flex-start",
                      maxWidth: isBorderlessMedia ? "85%" : "82%",
                      minWidth: resolvedReplyContext ? 220 : undefined
                    }}>
                    
                        {}
                        {isFirstInCluster && !isBorderlessMedia &&
                    <Text
                      style={{
                        color: "#60a5fa",
                        fontSize: 11.5,
                        fontFamily: "Poppins_600SemiBold",
                        marginBottom: 2,
                        marginLeft: 4
                      }}>
                      
                            {authorName}
                          </Text>
                    }

                        {isBorderlessMedia ?

                    <View
                      style={{ overflow: "hidden", borderRadius: 16 }}>
                      
                            {isViewOnce ?
                      item.media_type === "STICKER" ||
                      item.mediaType === "STICKER" ||
                      item.type === "STICKER" ?
                      <ViewOnceStickerMessage
                        item={item}
                        isMe={false}
                        onExpire={handleExpireMessage} /> :

                      item.audio_url || item.audioUrl ?
                      <ViewOnceAudioPlayer
                        item={item}
                        isMe={false}
                        onExpire={handleExpireMessage} /> :


                      <ViewOnceMediaCard
                        item={item}
                        isMe={false}
                        onExpire={handleExpireMessage}
                        groupId={groupId}
                        currentUser={user} /> :



                      <VideoStickerMessage
                        item={item}
                        isMe={false}
                        currentUser={user}
                        onLongPress={handleLongPress}
                        onDelete={handleLongPress} />

                      }
                          </View> :


                    <View
                      style={{
                        backgroundColor: isMediaOnly ?
                        "transparent" :
                        bubbleBg,
                        borderRadius: 16,
                        borderTopRightRadius: 16,
                        borderBottomRightRadius: 16,
                        borderTopLeftRadius: isFirstInCluster ? 16 : 4,
                        borderBottomLeftRadius: isLastInCluster ? 4 : 4,
                        paddingHorizontal: isMediaOnly ? 0 : 14,
                        paddingVertical: isMediaOnly ? 0 : 9,
                        borderWidth: isMediaOnly ? 0 : 1,
                        borderColor: isMediaOnly ? "transparent" : bubbleBorderColor,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isMediaOnly ? 0 : 0.2,
                        shadowRadius: 3,
                        elevation: isMediaOnly ? 0 : 2,
                        width: resolvedReplyContext ? "100%" : undefined,
                        minWidth: resolvedReplyContext ? 220 : undefined
                      }}>
                      
                            {}
                            {Boolean(resolvedReplyContext) &&
                      <QuotedMessageBlock
                        replyContext={resolvedReplyContext}
                        isMe={false}
                        onPress={handleScrollToQuotedMessage} />

                      }

                            {isDeleted ?
                      <Text
                        style={{
                          color: "#71717a",
                          fontStyle: "italic",
                          fontSize: 13
                        }}>
                        
                                <Feather
                          name="slash"
                          size={12}
                          color="#71717a" />
                        {" "}
                                Mensagem apagada
                              </Text> :

                      <>
                                {Boolean(item.audio_url || item.audioUrl) &&
                        <AudioMessagePlayer
                          audioUrl={item.audio_url || item.audioUrl}
                          isMe={false} />

                        }
                                {Boolean(item.media_url || item.mediaUrl) && !item.audio_url && !item.audioUrl && (
                        item.media_type === "VIDEO" || String(item.media_url || item.mediaUrl).toLowerCase().endsWith(".mp4") ?
                        <ChatVideoThumbnail
                          url={item.media_url || item.mediaUrl}
                          onPress={() =>
                          setViewerMedia({
                            url: item.media_url || item.mediaUrl,
                            type: "video",
                            user: item.user || item.sender || item.author,
                            created_at: item.created_at || item.createdAt,
                            content: item.content || "",
                            message: item
                          })
                          }
                          onLongPress={handleLongPress} /> :


                        <Pressable
                          onPress={() =>
                          setViewerMedia({
                            url: item.media_url || item.mediaUrl,
                            type: "image",
                            user: item.user || item.sender || item.author,
                            created_at: item.created_at || item.createdAt,
                            content: item.content || "",
                            message: item
                          })
                          }
                          onLongPress={handleLongPress}
                          delayLongPress={200}
                          style={{
                            borderRadius: 12,
                            overflow: "hidden",
                            marginBottom: item.content ? 6 : 0,
                            backgroundColor: "rgba(0,0,0,0.2)"
                          }}>
                          
                                      <Image
                            source={{ uri: item.media_url || item.mediaUrl }}
                            style={{
                              width: 230, height: 230, borderRadius: 16
                            }}
                            resizeMode="cover" />
                          
                                    </Pressable>)

                        }
                                {isReelShare && !!reelData && (
                                  <ReelShareCard
                                    reelData={reelData}
                                    isMe={false}
                                    onPress={(data) => {
                                      const vId = data?.video_id || data?.videoId || data?.youtube_video_id;
                                      if (vId) {
                                        if (Platform.OS === "web" && typeof window !== "undefined") {
                                          window.open(`https://www.youtube.com/shorts/${vId}`, "_blank");
                                        } else {
                                          Linking.openURL(`https://www.youtube.com/shorts/${vId}`).catch(() => {});
                                        }
                                      }
                                    }}
                                  />
                                )}
                                {Boolean(item.content) && !isReelShare && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                            flexWrap: "wrap"
                          }}>
                          
                                    <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 14.5,
                              fontFamily: "Poppins_400Regular",
                              lineHeight: 20
                            }}>
                            
                                      {item.content}
                                    </Text>
                                    {Boolean(timeStr) &&
                          <Text
                            style={{
                              color: "#a1a1aa",
                              fontSize: 10,
                              fontFamily: "Poppins_400Regular",
                              marginLeft: "auto",
                              paddingLeft: 10,
                              paddingTop: 2
                            }}>
                            
                                        {timeStr}
                                      </Text>
                          }
                                  </View>
                                )}
                              </>
                      }
                          </View>
                    }
                      </View>
                    </View>
                }
                </Pressable>
              </SwipeableMessageRow>
            </View>
          );

        }}
        ListEmptyComponent={
        <Text
          style={{
            color: "#a1a1aa",
            textAlign: "center",
            marginTop: 40
          }}>
          
              Nenhuma mensagem no chat.
            </Text>
        }
        ListFooterComponent={
        <View style={{ alignItems: 'center', marginVertical: 12 }}>
              <View style={{
            backgroundColor: isDark ? '#27272a' : colors.surfaceAlt || '#f1f5f9',
            paddingHorizontal: 14,
            paddingVertical: 4,
            borderRadius: 14,
            marginBottom: 12
          }}>
                <Text style={{
              color: isDark ? '#a1a1aa' : colors.muted || '#64748b',
              fontSize: 11,
              fontFamily: 'Poppins_500Medium'
            }}>Hoje</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '85%', justifyContent: 'center' }}>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: isDark ? '#27272a' : colors.border || '#e2e8f0' }} />
                <Text style={{ marginHorizontal: 12, fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: isDark ? '#d4d4d8' : colors.text }}>
                  Tribo Chat
                </Text>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: isDark ? '#27272a' : colors.border || '#e2e8f0' }} />
              </View>
            </View>
        } />

      }

      {}
      {!isBanned &&
      <ReplyPreviewBar
        replyMessage={replyingTo}
        onCancelReply={() => setReplyingTo(null)} />

      }

      {}
      {isBanned ?
      <View
        style={{
          marginHorizontal: 14,
          marginTop: 6,
          marginBottom: Math.max(
            insets.bottom > 0 ? insets.bottom + 6 : 14,
            16
          ),
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: colors.mode === "dark" ? "#18181b" : "#fef2f2",
          borderWidth: 1.5,
          borderColor:
          colors.mode === "dark" ? "rgba(239, 68, 68, 0.35)" : "#fecaca",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 3
        }}>
        
          <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 4
          }}>
          
            <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor:
              colors.mode === "dark" ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
              alignItems: "center",
              justifyContent: "center"
            }}>
            
              <Feather name="slash" size={15} color="#ef4444" />
            </View>
            <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 14.5,
              color: "#ef4444"
            }}>
            
              Você foi banido deste grupo
            </Text>
          </View>

          {Boolean(banReason) &&
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            marginVertical: 4,
            backgroundColor:
            colors.mode === "dark" ?
            "rgba(255, 255, 255, 0.05)" :
            "rgba(0, 0, 0, 0.04)",
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 8
          }}>
          
              <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 12.5,
              color: colors.mode === "dark" ? "#a1a1aa" : "#64748b"
            }}>
            
                Motivo:{" "}
              </Text>
              <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 12.5,
              color: colors.mode === "dark" ? "#f4f4f5" : "#1f2937"
            }}>
            
                {banReason}
              </Text>
            </View>
        }

          <Text
          style={{
            fontFamily: "Poppins_400Regular",
            fontSize: 11.5,
            color: colors.muted || "#64748b",
            textAlign: "center",
            marginTop: 2
          }}>
          
            Você não pode enviar mensagens ou interagir nesta conversa.
          </Text>
        </View> :


      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingTop: 4,
          paddingBottom:
          keyboardHeight > 0 ?
          Platform.OS === "ios" ?
          keyboardHeight + 8 :
          keyboardHeight + 4 :
          Math.max(insets.bottom > 0 ? insets.bottom - 4 : 8, 10),
          gap: 8,
          backgroundColor: colors.background
        }}>
        
          {isRecording ?

        <View style={{ flex: 1, position: "relative" }}>
              {isViewOnce &&
          <View
            style={{
              position: "absolute",
              top: -34,
              left: 0,
              right: 0,
              backgroundColor: "#8b5cf6",
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              shadowColor: "#8b5cf6",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
              zIndex: 10
            }}>
            
                  <MaterialCommunityIcons
              name="numeric-2-circle"
              size={15}
              color="#ffffff" />
            
                  <Text
              style={{
                color: "#ffffff",
                fontSize: 11,
                fontFamily: "Poppins_600SemiBold"
              }}>
              
                    🔒 Gravando áudio de visualização única (escuta limitada a
                    2x)
                  </Text>
                </View>
          }
              <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: isViewOnce ?
              colors.mode === "dark" ?
              "#1e1b4b" :
              "#f5f3ff" :
              colors.surfaceAlt || (
              colors.mode === "dark" ? "#1e1e1e" : "#fef2f2"),
              borderRadius: 28,
              borderWidth: 1,
              borderColor: isViewOnce ? "#c084fc" : "#fca5a5",
              paddingHorizontal: 16,
              minHeight: 52
            }}>
            
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: isViewOnce ? "#8b5cf6" : "#ef4444",
                  marginRight: 8,
                  shadowColor: isViewOnce ? "#8b5cf6" : "#ef4444",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  elevation: 3
                }} />
              
                  <Feather
                name="mic"
                size={18}
                color={isViewOnce ? "#8b5cf6" : "#ef4444"}
                style={{ marginRight: 8 }} />
              
                  <Text
                style={{
                  color: isViewOnce ? "#8b5cf6" : "#ef4444",
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 15,
                  letterSpacing: 0.5
                }}>
                
                    {Math.floor(recordSeconds / 60).
                toString().
                padStart(2, "0")}
                    :{(recordSeconds % 60).toString().padStart(2, "0")}
                  </Text>
                </View>

                <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10
              }}>
              
                  <Pressable
                onPress={cancelRecording}
                style={{
                  padding: 8,
                  borderRadius: 18,
                  backgroundColor: "rgba(239, 68, 68, 0.12)"
                }}
                accessibilityLabel="Cancelar gravação">
                
                    <Feather name="trash-2" size={18} color="#ef4444" />
                  </Pressable>

                  <Pressable
                onPress={stopAndSendRecording}
                style={({ pressed }) => [
                {
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: colors.primary || "#0284c7",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1
                }]
                }
                accessibilityLabel="Enviar áudio">
                
                    <Feather
                  name="send"
                  size={16}
                  color="#ffffff"
                  style={{ marginLeft: -1, marginTop: 1 }} />
                
                  </Pressable>
                </View>
              </View>
            </View> :
        audioUri ?

        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.card || "#ffffff",
            borderRadius: 28,
            borderWidth: 1,
            borderColor: colors.border || "#e2e8f0",
            paddingHorizontal: 16,
            minHeight: 52
          }}>
          
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#e0f2fe",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10
              }}>
              
                  <Feather name="mic" size={16} color="#0284c7" />
                </View>
                <Text
              style={{
                color: colors.text,
                fontFamily: "Poppins_500Medium",
                fontSize: 14
              }}>
              
                  Áudio gravado ({recordSeconds}s)
                </Text>
              </View>

              <Pressable
            onPress={cancelRecording}
            style={{
              padding: 8,
              borderRadius: 18,
              backgroundColor: "rgba(239, 68, 68, 0.12)"
            }}
            accessibilityLabel="Descartar áudio">
            
                <Feather name="trash-2" size={18} color="#ef4444" />
              </Pressable>
            </View> :


        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark ? "#1e1e24" : colors.card || "#ffffff",
            borderRadius: 26,
            borderWidth: 1,
            borderColor: isDark ? "#2f2f38" : colors.border || "#e2e8f0",
            paddingHorizontal: 10,
            minHeight: 50,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.25 : 0.05,
            shadowRadius: 4,
            elevation: 2
          }}>
          
              <Pressable
            onPress={pickMedia}
            style={({ pressed }) => [
            {
              padding: 6,
              borderRadius: 14,
              opacity: pressed ? 0.7 : 1
            }]
            }
            accessibilityLabel="Anexar imagem">
            
                <Feather
              name="image"
              size={21}
              color={colors.primary || "#0284c7"} />
            
              </Pressable>
              <Pressable
            onPress={() => setStickerPickerVisible(true)}
            style={({ pressed }) => [
            {
              padding: 6,
              borderRadius: 14,
              opacity: pressed ? 0.7 : 1
            }]
            }
            accessibilityLabel="Figurinhas da Tribo">
            
                <MaterialCommunityIcons
              name="sticker-emoji"
              size={22}
              color={colors.primary || "#0284c7"} />
            
              </Pressable>
              <Pressable
            onPress={() => setIsViewOnce((prev) => !prev)}
            style={({ pressed }) => [
            {
              padding: 6,
              borderRadius: 14,
              backgroundColor: isViewOnce ?
              "rgba(139, 92, 246, 0.18)" :
              "transparent",
              opacity: pressed ? 0.75 : 1
            }]
            }
            accessibilityLabel="Visualização única">
            
                <MaterialCommunityIcons
              name={
              isViewOnce ? "numeric-1-circle" : "numeric-1-circle-outline"
              }
              size={22}
              color={
              isViewOnce ? "#a855f7" : isDark ? "#71717a" : "#94a3b8"
              } />
            
              </Pressable>
              <TextInput
            placeholder="Digite uma mensagem..."
            placeholderTextColor={isDark ? "#71717a" : "#94a3b8"}
            value={text}
            onChangeText={setText}
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: "Poppins_400Regular",
              fontSize: 14.5,
              maxHeight: 120,
              paddingVertical: 6,
              paddingHorizontal: 4
            }}
            multiline />
          
              {!text.trim() && !selectedMedia &&
          <Pressable
            onPress={startRecording}
            style={({ pressed }) => [
            {
              padding: 7,
              borderRadius: 18,
              backgroundColor: pressed ?
              "rgba(2, 132, 199, 0.15)" :
              "transparent"
            }]
            }
            accessibilityLabel="Gravar áudio">
            
                  <Feather
              name="mic"
              size={21}
              color={colors.primary || "#0284c7"} />
            
                </Pressable>
          }
            </View>
        }

          {!isRecording &&
        <Pressable
          onPress={handleSend}
          disabled={
          sending || !text.trim() && !audioUri && !selectedMedia
          }
          style={({ pressed }) => [
          {
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor:
            sending || !text.trim() && !audioUri && !selectedMedia ?
            colors.mode === "dark" ?
            "#333" :
            "#e2e8f0" :
            colors.primary || "#0284c7",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.85 : 1,
            shadowColor: colors.primary || "#0284c7",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity:
            sending || !text.trim() && !audioUri && !selectedMedia ?
            0 :
            0.35,
            shadowRadius: 5,
            elevation:
            sending || !text.trim() && !audioUri && !selectedMedia ?
            0 :
            4
          }]
          }
          accessibilityLabel="Enviar mensagem">
          
              {sending ?
          <ActivityIndicator size="small" color="#ffffff" /> :

          <Feather
            name="send"
            size={20}
            color={
            sending || !text.trim() && !audioUri && !selectedMedia ?
            colors.subtext || "#94a3b8" :
            "#ffffff"
            }
            style={{ marginLeft: -1, marginTop: 1 }} />

          }
            </Pressable>
        }
        </View>
      }

      {}
      <MediaContextMenuSheet
        visible={contextSheet.visible}
        message={contextSheet.message}
        currentUser={user}
        isGroupAdmin={isGroupAdmin}
        onReply={(msg) => handleSwipeToReply(msg)}
        onSaveToGallery={(msg, type) => handleSaveMedia(msg, type)}
        onSaveSticker={(msg) => handleSaveSticker(msg)}
        onDeleteForMe={(msg) => setDeleteConfirm({ visible: true, mode: "me", message: msg })}
        onDeleteForEveryone={(msg) => setDeleteConfirm({ visible: true, mode: "everyone", message: msg })}
        onClose={() => setContextSheet({ visible: false, message: null })} />
      

      {}
      <ConfirmDeleteModal
        visible={deleteConfirm.visible}
        mode={deleteConfirm.mode}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteConfirm({ visible: false, mode: "me", message: null })} />
      

      {}
      <TriboModernToast
        visible={modernToast.visible}
        message={modernToast.message}
        type={modernToast.type}
        onHide={() => setModernToast({ visible: false, message: "", type: "success" })} />
      

      {}
      <StickerPickerModal
        visible={stickerPickerVisible}
        onClose={() => setStickerPickerVisible(false)}
        onSelectSticker={handleSendSticker}
        onOpenCreateModal={() => {
          if (!isUserGold) {
            setShowGoldBenefitsModal(true);
          } else {
            setCreateStickerVisible(true);
          }
        }}
        currentUser={user} />
      

      {}
      <GoldBadgeBenefitsModal
        visible={showGoldBenefitsModal}
        onClose={() => setShowGoldBenefitsModal(false)} />
      

      {}
      <CreateVideoStickerModal
        visible={createStickerVisible}
        onClose={() => setCreateStickerVisible(false)}
        onStickerCreated={handleSendSticker}
        currentUser={user}
        onShowGoldModal={() => setShowGoldBenefitsModal(true)} />
      

      {}
      <CustomModal
        visible={internalAlert.visible}
        type={internalAlert.type}
        title={internalAlert.title}
        message={internalAlert.message}
        primaryText={internalAlert.primaryText}
        onPrimaryPress={() => {
          if (internalAlert.onPrimaryPress) internalAlert.onPrimaryPress();
          setInternalAlert((prev) => ({ ...prev, visible: false }));
        }}
        secondaryText={internalAlert.secondaryText}
        onSecondaryPress={() => {
          if (internalAlert.onSecondaryPress) internalAlert.onSecondaryPress();
          setInternalAlert((prev) => ({ ...prev, visible: false }));
        }}
        onClose={() =>
        setInternalAlert((prev) => ({ ...prev, visible: false }))
        } />
      

      {}
      <MediaViewerModal
        visible={Boolean(viewerMedia)}
        media={viewerMedia}
        onDelete={(media) => {
          setViewerMedia(null);
          if (media?.message) {
            handleOpenContextMenu(media.message);
          }
        }}
        onClose={() => setViewerMedia(null)} />
      
    </KeyboardAvoidingView>);

});

function GroupTrendsTab({ groupId, colors, onTrendClick, onPlayVideo }) {
  const { isDark: themeIsDark, mode } = useTheme();
  const isDark = Boolean(
    themeIsDark ||
    mode === "dark" ||
    mode === "oled" ||
    colors?.mode === "dark"
  );
  const [trends, setTrends] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <View style={styles.tabContent}>
      <Text style={{ textAlign: "center", color: colors.text, marginTop: 20 }}>
        Em breve...
      </Text>
    </View>);

}

function CommentOptionsModal({
  comment,
  currentUser,
  postAuthorId,
  onClose,
  onReport,
  onBlock,
  onDelete
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!comment) return null;

  const author = comment.author || comment.user || {};
  const authorId =
  author.id ||
  author._id ||
  author.userId ||
  comment.user_id ||
  comment.userId ||
  comment.author_id;

  const currentUserId =
  currentUser?.id ||
  currentUser?._id ||
  currentUser?.userId ||
  currentUser?.user_id ||
  currentUser?.sub;

  const isMine = Boolean(
    authorId &&
    currentUserId &&
    String(authorId).toLowerCase() === String(currentUserId).toLowerCase()
  );

  const isPostAuthor = Boolean(
    postAuthorId &&
    currentUserId &&
    String(postAuthorId).toLowerCase() === String(currentUserId).toLowerCase()
  );

  const authorHandle =
  author.username || author.handle || comment.username || "usuario";

  const handleBlock = () => {
    if (isMine) return;
    onClose();
    onBlock?.(authorId, authorHandle);
  };

  const handleReport = () => {
    if (isMine) return;
    onClose();
    onReport?.({
      targetType: "COMMENT",
      targetId: comment.id,
      authorId: authorId,
      targetName: `comentário de @${authorHandle}`
    });
  };

  const handleDelete = () => {
    onClose();
    onDelete?.(comment);
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end"
        }}
        onPress={onClose}>
        
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            paddingBottom: Math.max(insets.bottom + 16, 28)
          }}
          onPress={(e) => e.stopPropagation()}>
          
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.border,
              alignSelf: "center",
              marginBottom: 16
            }} />
          
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 16,
              color: colors.text,
              textAlign: "center",
              marginBottom: 16
            }}>
            
            Ações do Comentário
          </Text>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 4 }}>
            
            {(isMine || isPostAuthor) &&
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                gap: 12
              }}
              onPress={handleDelete}>
              
                <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                
                  <Feather name="trash-2" size={20} color="#ef4444" />
                </View>
                <Text
                style={{
                  fontFamily: "Poppins_500Medium",
                  fontSize: 15,
                  color: "#ef4444"
                }}>
                
                  Excluir Comentário
                </Text>
              </Pressable>
            }

            {!isMine &&
            <>
                <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  gap: 12
                }}
                onPress={handleBlock}>
                
                  <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    justifyContent: "center",
                    alignItems: "center"
                  }}>
                  
                    <Feather name="user-x" size={20} color="#f59e0b" />
                  </View>
                  <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    fontSize: 15,
                    color: "#f59e0b"
                  }}>
                  
                    Bloquear @{authorHandle}
                  </Text>
                </Pressable>

                <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  gap: 12
                }}
                onPress={handleReport}>
                
                  <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    justifyContent: "center",
                    alignItems: "center"
                  }}>
                  
                    <Feather name="flag" size={20} color="#ef4444" />
                  </View>
                  <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    fontSize: 15,
                    color: "#ef4444"
                  }}>
                  
                    Denunciar e Bloquear
                  </Text>
                </Pressable>
              </>
            }
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>);

}

function GroupComments({
  groupId,
  post,
  onClose,
  onOpenProfile,
  currentUser,
  onReportComment,
  onBlockUser,
  showAlertProp
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const showAlert =
  showAlertProp || ((cfg) => setDeleteAlert({ visible: true, ...cfg }));
  const [items, setItems] = useState([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [optionsComment, setOptionsComment] = useState(null);
  const [deleteConfirmComment, setDeleteConfirmComment] = useState(null);
  const [deleteAlert, setDeleteAlert] = useState({
    visible: false,
    type: "success",
    title: "",
    message: ""
  });


  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef(null);

  const load = useCallback(async () => {
    if (!post) return;
    try {
      if (groupId) {
        const res = await api.groups.getComments(groupId, post.id);
        const data = Array.isArray(res) ?
        res :
        res?.comments || res?.data?.comments || res?.data || [];
        setItems(data);
      } else {
        const res = await api.comments.list(post.id);
        const data = Array.isArray(res) ?
        res :
        res?.comments || res?.data?.comments || res?.data || [];
        setItems(data);
      }
    } catch (error) {
      console.warn("Erro ao carregar comentários:", error);
      showAlert({
        type: "error",
        title: "Comentários indisponíveis",
        message: errorMessage(error),
        onClose: () => showAlert({ visible: false })
      });
    }
  }, [post, groupId]);

  useEffect(() => {
    setItems([]);
    if (post) load();
  }, [post, load]);

  const recordingRef = useRef(null);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      if (recordingRef.current) {
        try {
          recordingRef.current.stopAndUnloadAsync().catch(() => {});
        } catch (e) {

        }
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        return showAlert({
          type: "error",
          title: "Permissão",
          message: "Permita o uso do microfone."
        });
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      await recording.stopAndUnloadAsync();
      await setOptimizedAudioMode(false);
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  };

  const cancelRecording = async () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    if (recording) await recording.stopAndUnloadAsync();
    setRecording(null);
    setIsRecording(false);
    setAudioUri(null);
    setRecordingDuration(0);
  };

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
    Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
    Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const send = async () => {
    if (!content.trim() && !audioUri || sending) return;
    try {
      setSending(true);
      let uploadedAudioUrl = null;
      if (audioUri) {
        const uploadRes = await api.uploads.audio(audioUri);
        uploadedAudioUrl = getUploadUrl(uploadRes);
      }

      if (groupId) {
        const res = await api.groups.addComment(
          groupId,
          post.id,
          content.trim() || undefined,
          uploadedAudioUrl
        );
        if (res?.comment) {
          const newComment = {
            ...res.comment,
            username: currentUser?.username,
            name: currentUser?.name,
            user_avatar: currentUser?.avatar_url,
            badge_type: currentUser?.badge_type,
            email_verified: currentUser?.email_verified,
            user: currentUser
          };
          setItems((prev) => [...prev, newComment]);
        }
      } else {
        const res = await api.comments.create({
          content: content.trim() || undefined,
          postId: post.id,
          audio_url: uploadedAudioUrl
        });
        if (res) {
          setItems((prev) => [...prev, res]);
        }
      }
      setContent("");
      setAudioUri(null);
      setRecordingDuration(0);
      load();
    } catch (error) {
      showAlert({
        type: "error",
        title: "Comentário não enviado",
        message: errorMessage(error),
        onClose: () => showAlert({ visible: false })
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!post) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [post, onClose]);

  if (!post) return null;

  return (
    <View
      style={[
      StyleSheet.absoluteFill,
      { backgroundColor: colors.background, zIndex: 99999 }]
      }>
      
      <AppHeader title="Comentários" onBack={onClose} />
      <FlatList
        data={items}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={styles.commentsList}
        renderItem={({ item }) => {
          const commentUser = item.user ||
          item.author || {
            id: item.user_id || item.userId,
            username: item.username,
            name: item.name,
            avatar_url: item.user_avatar || item.avatar_url,
            badge_type: item.badge_type,
            email_verified: item.email_verified
          };
          const commentAuthorId =
          commentUser.id || commentUser.userId || item.user_id || item.userId;
          const isMine =
          commentAuthorId &&
          currentUser?.id &&
          String(commentAuthorId) === String(currentUser.id);
          const commentHandle =
          commentUser.username || commentUser.handle || item.username || "";
          return (
            <View style={styles.commentItem}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir perfil de ${userName(commentUser)}`}
                onPress={() => onOpenProfile(commentUser)}>
                
                <Avatar
                  user={commentUser}
                  fallbackUser={currentUser}
                  size={34} />
                
              </Pressable>
              <View style={styles.flex}>
                <View style={{ flexDirection: "column", marginBottom: 2 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]}>
                      {userName(commentUser)}
                    </Text>
                    <VerificationBadge user={commentUser} size={13} />
                  </View>
                  {!!commentHandle &&
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 11,
                      color: colors.subtext,
                      marginTop: -2
                    }}>
                    
                      @{commentHandle}
                    </Text>
                  }
                </View>
                {!!item.content &&
                <Text
                  selectable
                  style={[styles.commentText, { color: colors.text }]}>
                  
                    {item.content}
                  </Text>
                }
                {(item.audioUrl || item.audio_url) &&
                <CommentAudioPlayer
                  url={item.audioUrl || item.audio_url}
                  colors={colors} />

                }
              </View>
              <IconButton
                name="more-horizontal"
                small
                label="Opções do comentário"
                onPress={() => setOptionsComment(item)} />
              
            </View>);

        }}
        ListEmptyComponent={
        <EmptyState icon="message-circle">
            Seja a primeira pessoa a comentar.
          </EmptyState>
        } />
      
      <View
        style={[
        styles.reply,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border || "#e5e7eb",
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom:
          keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 12),
          paddingTop: 10,
          paddingHorizontal: 12,
          gap: 10
        }]
        }>
        
        {isRecording ?
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            backgroundColor: colors.surfaceAlt || "#f0f0f0",
            borderRadius: 26,
            borderWidth: 1,
            borderColor: colors.border || "#e5e7eb",
            paddingVertical: 10,
            minHeight: 52
          }}>
          
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
              style={{
                height: 10,
                width: 10,
                borderRadius: 5,
                backgroundColor: "#ff3b30",
                marginRight: 8,
                shadowColor: "#ff3b30",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 4,
                elevation: 3
              }} />
            
              <Text
              style={{
                color: "#ff3b30",
                fontFamily: "Poppins_600SemiBold",
                fontSize: 15,
                letterSpacing: 0.5
              }}>
              
                {Math.floor(recordingDuration / 60).
              toString().
              padStart(2, "0")}
                :{(recordingDuration % 60).toString().padStart(2, "0")}
              </Text>
            </View>
            <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            
              <Pressable
              onPress={cancelRecording}
              style={{
                padding: 10,
                borderRadius: 20,
                backgroundColor: "rgba(255, 59, 48, 0.1)"
              }}
              accessibilityLabel="Cancelar gravação">
              
                <Feather name="trash-2" size={18} color="#ff3b30" />
              </Pressable>
              <Pressable
              onPress={stopRecording}
              style={{
                padding: 10,
                backgroundColor: "#ff3b30",
                borderRadius: 20
              }}
              accessibilityLabel="Parar gravação">
              
                <Feather name="square" size={18} color="#fff" />
              </Pressable>
            </View>
          </View> :
        audioUri ?
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            backgroundColor: colors.surfaceAlt || "#f0f0f0",
            borderRadius: 26,
            borderWidth: 1,
            borderColor: colors.border || "#e5e7eb",
            paddingVertical: 10,
            minHeight: 52
          }}>
          
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
              style={{
                backgroundColor: colors.accent || colors.primary,
                padding: 6,
                borderRadius: 16,
                marginRight: 10
              }}>
              
                <Feather name="mic" size={18} color="#fff" />
              </View>
              <Text
              style={{
                color: colors.text,
                fontFamily: "Poppins_500Medium",
                fontSize: 14
              }}>
              
                Áudio pronto
              </Text>
            </View>
            <Pressable
            onPress={cancelRecording}
            style={{
              padding: 10,
              borderRadius: 20,
              backgroundColor: "rgba(255, 59, 48, 0.1)"
            }}
            accessibilityLabel="Descartar áudio">
            
              <Feather name="trash-2" size={18} color="#ff3b30" />
            </Pressable>
          </View> :

        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor:
            colors.surfaceAlt || (
            colors.mode === "dark" ? "#222" : "#f5f6f8"),
            borderRadius: 26,
            borderWidth: 1,
            borderColor: colors.border || "#e5e7eb",
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === "ios" ? 10 : 6,
            minHeight: 52,
            justifyContent: "center"
          }}>
          
            <TextInput
            placeholder="Escreva um comentário..."
            placeholderTextColor={colors.subtext || "#8E8E93"}
            value={content}
            onChangeText={setContent}
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: "Poppins_400Regular",
              fontSize: 16,
              lineHeight: 22,
              maxHeight: 120,
              paddingVertical: 4
            }}
            multiline />
          
            {!content.trim() &&
          <Pressable
            onPress={startRecording}
            style={({ pressed }) => [
            {
              padding: 6,
              borderRadius: 16,
              backgroundColor: pressed ?
              "rgba(0,0,0,0.05)" :
              "transparent"
            }]
            }
            accessibilityLabel="Gravar áudio">
            
                <Feather
              name="mic"
              size={22}
              color={colors.accent || colors.primary} />
            
              </Pressable>
          }
          </View>
        }

        <Pressable
          onPress={send}
          disabled={sending || !content.trim() && !audioUri}
          style={({ pressed }) => [
          {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor:
            sending || !content.trim() && !audioUri ?
            colors.mode === "dark" ?
            "#333" :
            "#e2e8f0" :
            colors.primary || colors.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
            shadowColor: colors.primary || "#0284c7",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity:
            sending || !content.trim() && !audioUri ? 0 : 0.25,
            shadowRadius: 4,
            elevation: sending || !content.trim() && !audioUri ? 0 : 3
          }]
          }
          accessibilityLabel="Enviar comentário">
          
          {sending ?
          <ActivityIndicator size="small" color="#ffffff" /> :

          <Feather
            name="send"
            size={20}
            color={
            sending || !content.trim() && !audioUri ?
            colors.subtext || "#94a3b8" :
            "#ffffff"
            }
            style={{ marginLeft: -1, marginTop: 1 }} />

          }
        </Pressable>
      </View>

      <CommentOptionsModal
        comment={optionsComment}
        currentUser={currentUser}
        postAuthorId={post?.author_id || post?.user_id || post?.author?.id}
        onClose={() => setOptionsComment(null)}
        onReport={(data) => {
          setOptionsComment(null);
          onReportComment?.(data);
        }}
        onBlock={(authorId, authorHandle) => {
          setOptionsComment(null);
          setItems((prev) =>
          prev.filter((c) => {
            const cUser = c.user || c.author || {};
            const cId = cUser.id || cUser.userId || c.userId;
            return String(cId) !== String(authorId);
          })
          );
          onBlockUser?.(authorId, authorHandle);
        }}
        onDelete={(commentToDelete) => {
          setOptionsComment(null);
          setDeleteConfirmComment(commentToDelete);
        }} />
      

      {}
      <Modal
        visible={!!deleteConfirmComment}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmComment(null)}>
        
        <Pressable
          style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(0,0,0,0.72)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }]
          }
          onPress={() => setDeleteConfirmComment(null)}>
          
          <Pressable
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 24,
              width: "85%",
              maxWidth: 380,
              padding: 24,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10
            }}
            onPress={(e) => e.stopPropagation()}>
            
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16
              }}>
              
              <Feather name="trash-2" size={26} color="#EF4444" />
            </View>

            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                marginBottom: 8,
                textAlign: "center",
                fontFamily: "Poppins_700Bold"
              }}>
              
              Excluir comentário
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: 14,
                fontFamily: "Poppins_400Regular",
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 20
              }}>
              
              Você deseja excluir este comentário? Esta ação não poderá ser
              desfeita.
            </Text>

            <View style={{ width: "100%", gap: 10 }}>
              <Pressable
                style={{
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onPress={async () => {
                  const c = deleteConfirmComment;
                  setDeleteConfirmComment(null);
                  try {
                    if (groupId) {
                      await api.groups.deleteComment(groupId, post.id, c.id);
                    } else {
                      await api.comments.remove(c.id);
                    }
                    setItems((prev) => prev.filter((item) => item.id !== c.id));
                    setDeleteAlert({
                      visible: true,
                      type: "success",
                      title: "Sucesso",
                      message: "Comentário excluído com sucesso"
                    });
                  } catch (err) {
                    setDeleteAlert({
                      visible: true,
                      type: "error",
                      title: "Erro",
                      message:
                      errorMessage(err) ||
                      "Não foi possível excluir o comentário."
                    });
                  }
                }}>
                
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 15
                  }}>
                  
                  Excluir
                </Text>
              </Pressable>

              <Pressable
                style={{
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border
                }}
                onPress={() => setDeleteConfirmComment(null)}>
                
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 15
                  }}>
                  
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {}
      <TriboAlertModal
        visible={deleteAlert.visible}
        type={deleteAlert.type}
        title={deleteAlert.title}
        message={deleteAlert.message}
        buttonText="Entendido"
        onClose={() =>
        setDeleteAlert({
          visible: false,
          type: "success",
          title: "",
          message: ""
        })
        } />
      
    </View>);

}

const STATUSBAR_HEIGHT =
Platform.OS === "android" ? StatusBar.currentHeight || 24 : 44;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    marginHorizontal: 16,
    marginTop: STATUSBAR_HEIGHT + 10,
    marginBottom: 16,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 99
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitleContainer: { marginLeft: 15 },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold" },
  content: { flex: 1 },
  footerContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee"
  },
  footerTab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  footerTabText: { fontSize: 14, fontFamily: "Poppins_500Medium" },
  tabContent: { flex: 1 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4
  },
  composerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  composerTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold" },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: "80%"
  },
  messageMe: { alignSelf: "flex-end", backgroundColor: "#007aff" },
  messageThem: { alignSelf: "flex-start", backgroundColor: "#eee" },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1
  },
  replyInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1
  },
  modal: { flex: 1 },
  commentsList: { padding: 15, paddingBottom: 100 },
  commentItem: {
    flexDirection: "row",
    marginBottom: 20
  },
  flex: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 14, fontFamily: "Poppins_600SemiBold", marginRight: 5 },
  commentText: { fontSize: 14, fontFamily: "Poppins_400Regular", marginTop: 2 },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1
  }
});