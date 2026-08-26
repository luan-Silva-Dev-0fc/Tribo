import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api";

const ADULT_CONTENT_KEY = "@tribo_adult_content_enabled";

const UserContext = createContext({
  isAdultContentEnabled: false,
  setAdultContentEnabled: async () => {}
});

export function UserProvider({ children, user }) {
  const [isAdultContentEnabled, setIsAdultContentEnabledState] = useState(false);

  useEffect(() => {
    async function loadPreference() {
      try {
        const stored = await AsyncStorage.getItem(ADULT_CONTENT_KEY);
        if (stored !== null) {
          setIsAdultContentEnabledState(stored === "true");
        } else if (user) {
          const userPref = Boolean(
            user.allow_nsfw_content ??
            user.allowNsfwContent ??
            user.isAdultContentEnabled ??
            user.is_adult_content_enabled ??
            user.adultContentEnabled ??
            false
          );
          setIsAdultContentEnabledState(userPref);
        }
      } catch (err) {
        console.warn("[UserContext] Erro ao carregar preferência NSFW:", err);
      }
    }
    loadPreference();
  }, [user?.id]);

  const setAdultContentEnabled = async (enabled) => {
    const value = Boolean(enabled);
    setIsAdultContentEnabledState(value);
    try {
      await AsyncStorage.setItem(ADULT_CONTENT_KEY, String(value));
      await api.users.updateSettings({
        allow_nsfw_content: value,
        allowNsfwContent: value,
        isAdultContentEnabled: value,
        is_adult_content_enabled: value
      }).catch(() => {});
    } catch (err) {
      console.warn("[UserContext] Erro ao salvar preferência NSFW:", err);
    }
  };

  return (
    <UserContext.Provider
      value={{
        isAdultContentEnabled,
        setAdultContentEnabled
      }}>
      
      {children}
    </UserContext.Provider>);

}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    return {
      isAdultContentEnabled: false,
      setAdultContentEnabled: async () => {}
    };
  }
  return context;
}

export default UserContext;