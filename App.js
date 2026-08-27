import React, { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import TriboApp from './src/tribo-app';
import codePush from 'react-native-code-push';

LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  'Listening to push token changes is not yet fully supported',
  'Animated: `useNativeDriver` is not supported'
]);

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_START,
  installMode: codePush.InstallMode.ON_NEXT_RESTART,
  mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,
};

function App() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      codePush.sync(
        {
          installMode: codePush.InstallMode.ON_NEXT_RESTART,
          mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,
        },
        (status) => {
          if (status === codePush.SyncStatus.DOWNLOADING_PACKAGE) {
            console.log('[CodePush] Baixando atualização silenciosa...');
          }
        }
      );
    }
  }, []);

  return <TriboApp />;
}

export default Platform.OS === 'web' ? App : codePush(codePushOptions)(App);
