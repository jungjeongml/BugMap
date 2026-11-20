import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthFlow } from './src/features/auth/AuthFlow';
import { DiscoveryMapScreen } from './src/features/discovery-map/DiscoveryMapScreen';
import { isDiscoveryMapPreview } from './src/features/discovery-map/discoveryMapConfig';

export default function App() {
  const preview = __DEV__ && typeof window !== 'undefined'
    && isDiscoveryMapPreview(__DEV__, Platform.OS, window.location?.search);

  return (
    <SafeAreaProvider>
      {preview ? <DiscoveryMapScreen /> : <AuthFlow />}
    </SafeAreaProvider>
  );
}
