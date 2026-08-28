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
        codePush.notifyAppReady();
      } catch (err) {
        console.warn('[CodePush] notifyAppReady error:', err);
      }
    }
  }, []);

  return <TriboApp />;
}

export default hasCodePush
  ? codePush({
      checkFrequency: codePush.CheckFrequency?.ON_APP_START ?? 0,
      installMode: codePush.InstallMode?.IMMEDIATE ?? 0,
      mandatoryInstallMode: codePush.InstallMode?.IMMEDIATE ?? 0,
    })(App)
  : App;
