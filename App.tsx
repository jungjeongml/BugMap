import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthFlow } from './src/features/auth/AuthFlow';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthFlow />
    </SafeAreaProvider>
  );
}
