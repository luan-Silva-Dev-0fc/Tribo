import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";




export async function saveMediaToGallery({ url, type = "image" }) {
  if (!url || typeof url !== "string") {
    throw new Error("URL da mídia inválida.");
  }


  if (Platform.OS === "web" && typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const isVideo = type === "video" || url.toLowerCase().includes(".mp4");
      const filename = isVideo ? "tribo_video_" + Date.now() + ".mp4" : "tribo_foto_" + Date.now() + ".jpg";


      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        return { success: true, message: isVideo ? "Vídeo baixado com sucesso!" : "Foto baixada com sucesso!" };
      } catch (blobErr) {

        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true, message: isVideo ? "Vídeo baixado com sucesso!" : "Foto baixada com sucesso!" };
      }
    } catch (webErr) {
      throw new Error("Não foi possível iniciar o download no navegador.");
    }
  }


  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permissão para acessar a galeria foi negada. Ative nas configurações do dispositivo.");
    }

    const isVideo = type === "video" || url.toLowerCase().includes(".mp4");
    const ext = isVideo ? ".mp4" : ".jpg";
    const localUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + "tribo_media_" + Date.now() + ext;

    const downloadRes = await FileSystem.downloadAsync(url, localUri);
    if (!downloadRes || !downloadRes.uri) {
      throw new Error("Falha ao baixar o arquivo.");
    }

    const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});

    return {
      success: true,
      asset,
      message: isVideo ? "Vídeo salvo na galeria com sucesso!" : "Foto salva na galeria com sucesso!"
    };
  } catch (err) {
    throw new Error(err.message || "Erro ao salvar mídia na galeria.");
  }
}