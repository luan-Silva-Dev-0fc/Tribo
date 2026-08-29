import React from "react";
import { ConversationsListScreen } from "./ConversationsListScreen";
import { DirectChatScreen } from "./DirectChatScreen";

export { ConversationsListScreen } from "./ConversationsListScreen";
export { DirectChatScreen } from "./DirectChatScreen";
export { AudioMessagePlayer } from "../../components/chat/AudioMessagePlayer";

export default function MensagensScreen(props) {
  if (props.targetUser) {
    return <DirectChatScreen {...props} />;
  }
  return <ConversationsListScreen {...props} />;
}