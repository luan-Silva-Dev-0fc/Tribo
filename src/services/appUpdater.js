import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, NativeModules, Platform } from 'react-native';

let codePush = null;
try {
  const cp = require('react-native-code-push');
  codePush = cp?.default || cp;
} catch (_) {
  codePush = null;
}

/**
 * Abre a tela do Android para permitir instalação de fontes desconhecidas para o app
 */
export async function openUnknownSourcesSettings() {
  if (Platform.OS !== 'android') return false;

  try {
    if (NativeModules.ApkInstaller?.openUnknownSourcesSettings) {
      return await NativeModules.ApkInstaller.openUnknownSourcesSettings();
    }
  } catch (_) {}

  try {
    await Linking.sendIntent('android.settings.MANAGE_UNKNOWN_APP_SOURCES', [
      { key: 'package', value: 'package:tribo.network.com.br' }
    ]);
    return true;
  } catch (_) {
    try {
      await Linking.openSettings();
      return true;
    } catch (e) {
      console.warn('[AppUpdater] Não foi possível abrir configurações de fontes desconhecidas:', e);
      return false;
    }
  }
}

/**
 * Baixa o APK da atualização internamente no app com acompanhamento de progresso
 */
export async function downloadApkInternally(apkUrl, onProgress) {
  if (!apkUrl) throw new Error('URL de download do APK não informada.');

  const filename = `tribo_update_${Date.now()}.apk`;
  const targetUri = `${FileSystem.cacheDirectory}${filename}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    apkUrl,
    targetUri,
    {},
    (downloadProgress) => {
      if (downloadProgress.totalBytesExpectedToWrite > 0) {
        const percent = Math.min(
          100,
          Math.round((downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100)
        );
        if (onProgress) {
          onProgress({
            percent,
            receivedBytes: downloadProgress.totalBytesWritten,
            totalBytes: downloadProgress.totalBytesExpectedToWrite
          });
        }
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  return result?.uri || targetUri;
}

/**
 * Dispara o instalador de pacotes do Android diretamente para o arquivo baixado
 */
export async function installApk(localUri) {
  if (!localUri) throw new Error('Caminho do arquivo APK inválido.');

  if (Platform.OS !== 'android') {
    return await Linking.openURL(localUri);
  }

  const rawPath = localUri.startsWith('file://') ? localUri.replace('file://', '') : localUri;

  // 1. Tenta instalar usando o módulo nativo com permissão FileProvider
  if (NativeModules.ApkInstaller?.installApk) {
    try {
      return await NativeModules.ApkInstaller.installApk(rawPath);
    } catch (err) {
      console.warn('[AppUpdater] Tentando fallback de instalação via FileSystem/Sharing:', err);
    }
  }

  // 2. Fallback usando expo-sharing com MIME type oficial do instalador Android
  if (await Sharing.isAvailableAsync()) {
    try {
      return await Sharing.shareAsync(localUri, {
        mimeType: 'application/vnd.android.package-archive',
        dialogTitle: 'Instalar Atualização da Tribo',
        UTI: 'com.android.package-archive'
      });
    } catch (shareErr) {
      console.warn('[AppUpdater] Erro ao abrir instalador via sharing:', shareErr);
    }
  }

  // 3. Fallback para abertura direta
  return await Linking.openURL(localUri);
}

/**
 * Verifica se há atualizações OTA via CodePush e permite download e instalação imediata
 */
export async function checkCodePushUpdate() {
  if (!codePush || Platform.OS === 'web') return null;

  try {
    const update = await codePush.checkForUpdate();
    if (!update) return null;

    return {
      description: update.description || 'Melhorias de desempenho e correções na interface.',
      label: update.label,
      isMandatory: update.isMandatory,
      downloadAndApply: (onProgress) =>
        new Promise((resolve, reject) => {
          update
            .download((progress) => {
              if (onProgress && progress.totalBytes > 0) {
                const pct = Math.min(100, Math.round((progress.receivedBytes / progress.totalBytes) * 100));
                onProgress({
                  percent: pct,
                  receivedBytes: progress.receivedBytes,
                  totalBytes: progress.totalBytes
                });
              }
            })
            .then((downloadedPackage) => {
              downloadedPackage
                .install(codePush.InstallMode.IMMEDIATE)
                .then(() => {
                  codePush.restartApp();
                  resolve(true);
                })
                .catch(reject);
            })
            .catch(reject);
        })
    };
  } catch (err) {
    console.warn('[AppUpdater] Erro ao checar CodePush:', err?.message || err);
    return null;
  }
}
