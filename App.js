import React, { Component, useEffect } from 'react';
import { LogBox, Platform, View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TriboApp from './src/tribo-app';
import { notifyUpdateApplied } from './src/services/notifications';

LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  'Listening to push token changes is not yet fully supported',
  'Animated: `useNativeDriver` is not supported'
]);

let codePush = null;
try {
  const cpModule = require('react-native-code-push');
  codePush = cpModule?.default || cpModule;
} catch (_) {
  codePush = null;
}

const hasCodePush = Boolean(codePush && typeof codePush === 'function');

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[App Crash Caught by ErrorBoundary]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Ops! Algo deu errado.</Text>
          <Text style={styles.errorSubtitle}>Reinicie o aplicativo para continuar.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function App() {
  useEffect(() => {
    if (hasCodePush && Platform.OS !== 'web') {
      try {
        // Notifica que o bundle atual inicializou com sucesso (evita rollback acidental)
        codePush.notifyAppReady();

        // Se o app acabou de inicializar com um novo bundle CodePush aplicado, dispara a notificação
        codePush.getUpdateMetadata(codePush.UpdateState?.RUNNING ?? 0)
          .then(async (metadata) => {
            if (metadata?.isFirstRun) {
              const key = `@tribo_update_notified_${metadata.label || metadata.appVersion || 'applied'}`;
              const alreadyNotified = await AsyncStorage.getItem(key).catch(() => null);
              if (!alreadyNotified) {
                await AsyncStorage.setItem(key, "true").catch(() => {});
                await notifyUpdateApplied();
              }
            }
          })
          .catch(() => {});

        // Faz a verificação e download em segundo plano sem travar a interface
        // Aplica a atualização de forma silenciosa na próxima vez que o app for reiniciado/resumido
        codePush.sync(
          {
            installMode: codePush.InstallMode?.ON_NEXT_RESTART ?? 1,
            mandatoryInstallMode: codePush.InstallMode?.ON_NEXT_RESUME ?? 2,
          },
          (status) => {
            switch (status) {
              case codePush.SyncStatus?.CHECKING_FOR_UPDATE:
                console.log('[CodePush] Verificando atualizações no Revopush...');
                break;
              case codePush.SyncStatus?.DOWNLOADING_PACKAGE:
                console.log('[CodePush] ⬇ Baixando pacote de atualização em segundo plano...');
                break;
              case codePush.SyncStatus?.INSTALLING_UPDATE:
                console.log('[CodePush]  Instalando atualização...');
                break;
              case codePush.SyncStatus?.UP_TO_DATE:
                console.log('[CodePush] Aplicativo já está na versão mais recente.');
                break;
              case codePush.SyncStatus?.UPDATE_INSTALLED:
                console.log('[CodePush]  Atualização instalada com sucesso! Disparando notificação...');
                notifyUpdateApplied();
                break;
              case codePush.SyncStatus?.UNKNOWN_ERROR:
                console.log('[CodePush] Erro desconhecido durante o sync.');
                break;
            }
          },
          ({ receivedBytes, totalBytes }) => {
            if (totalBytes > 0) {
              const progress = Math.round((receivedBytes / totalBytes) * 100);
              console.log(`[CodePush]  Progresso do download: ${progress}%`);
            }
          }
        ).catch((err) => {
          console.warn('[CodePush] Falha ao verificar atualizações (seguro ignorar):', err?.message || err);
        });
      } catch (err) {
        console.warn('[CodePush] Erro na inicialização:', err);
      }
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#121214' }}>
      <ErrorBoundary>
        <TriboApp />
      </ErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0b10',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#a0a5b5',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default App;
