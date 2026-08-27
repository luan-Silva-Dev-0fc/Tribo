import React, { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import TriboApp from './src/tribo-app';

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

const hasCodePush = Boolean(codePush && typeof codePush === 'function' && codePush.CheckFrequency);

function App() {
  useEffect(() => {
    if (hasCodePush && Platform.OS !== 'web') {
      try {
        codePush.sync(
          {
            installMode: codePush.InstallMode?.ON_NEXT_RESTART ?? 1,
            mandatoryInstallMode: codePush.InstallMode?.IMMEDIATE ?? 0,
          },
          (status) => {
            if (status === codePush.SyncStatus?.DOWNLOADING_PACKAGE) {
              console.log('[CodePush] Baixando atualização silenciosa...');
            }
          }
        );
      } catch (err) {
        console.warn('[CodePush] Erro ao sincronizar:', err);
      }
    }
  }, []);

  return <TriboApp />;
}

export default hasCodePush
  ? codePush({
      checkFrequency: codePush.CheckFrequency?.ON_APP_START ?? 0,
      installMode: codePush.InstallMode?.ON_NEXT_RESTART ?? 1,
      mandatoryInstallMode: codePush.InstallMode?.IMMEDIATE ?? 0,
    })(App)
  : App;
