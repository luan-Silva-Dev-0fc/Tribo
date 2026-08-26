import TriboApp from './src/tribo-app';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  'Listening to push token changes is not yet fully supported',
  'Animated: `useNativeDriver` is not supported'
]);

export default function App() {
  return <TriboApp />;
}
