import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, layout } from '../../theme/tokens';
import { AppIcon } from './AppIcon';
import { authProvidersFor, type AuthProvider } from './authClient';
import { PolicyLinks } from './PolicyLinks';

const providers = {
  kakao: { label: '카카오로 로그인', background: colors.kakao, foreground: colors.kakaoText },
  google: { label: 'Google로 로그인', background: colors.surface, foreground: colors.text },
  apple: { label: 'Apple로 로그인', background: colors.apple, foreground: colors.surface },
} satisfies Record<AuthProvider, { label: string; background: string; foreground: string }>;

type LoginScreenProps = {
  available: boolean;
  pending: AuthProvider | null;
  notice?: string;
  onSignIn: (provider: AuthProvider) => void;
};

export function LoginScreen({ available, pending, notice, onSignIn }: LoginScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <View style={styles.brandIcon}><AppIcon name="beetle" size={32} /></View>
            <Text accessibilityRole="header" style={styles.brand}>곤충맵</Text>
            <Text style={styles.tagline}>발견한 곤충을 사진과 위치로 기록하고 공유해요.</Text>
          </View>

          <View style={styles.loginSection}>
            <View style={styles.providers}>
              {authProvidersFor(Platform.OS).map(id => {
                const provider = providers[id];
                const busy = pending === id;
                const disabled = !available || pending !== null;

                return (
                  <Pressable
                    key={id}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={provider.label}
                    accessibilityState={{ disabled, busy }}
                    onPress={() => onSignIn(id)}
                    style={({ pressed }) => [
                      styles.provider,
                      { backgroundColor: provider.background },
                      id === 'google' && styles.google,
                      pressed && styles.pressed,
                    ]}
                  >
                    {busy ? (
                      <>
                        <ActivityIndicator color={provider.foreground} />
                        <Text style={[styles.providerLabel, { color: provider.foreground }]}>로그인 중…</Text>
                      </>
                    ) : id === 'apple' ? (
                      <Image source={require('./assets/apple-sign-in.png')} style={styles.apple} resizeMode="contain" accessible={false} />
                    ) : (
                      <>
                        {id === 'kakao' ? (
                          // Kakao's official symbol path from the approved login handoff asset.
                          <Svg width={18} height={18} viewBox="61.5225 16.5225 12.9555 12.9555" accessible={false} aria-hidden>
                            <Path fill={colors.kakaoText} d="M68.001 16.5225C64.4222 16.5225 61.5225 19.0037 61.5225 22.0641C61.5225 24.0312 62.7219 25.7596 64.5292 26.7423L63.9181 29.2113C63.8954 29.285 63.9132 29.364 63.9619 29.4184C63.9975 29.457 64.0461 29.478 64.0931 29.478C64.1337 29.478 64.1742 29.464 64.2082 29.4341L66.834 27.5144C67.2117 27.5723 67.6007 27.6039 67.9994 27.6039C71.5767 27.6039 74.478 25.1226 74.478 22.0623C74.478 19.002 71.5783 16.5225 68.001 16.5225Z" />
                          </Svg>
                        ) : (
                          <Image source={require('./assets/google-sign-in.png')} style={styles.googleIcon} accessible={false} />
                        )}
                        <Text style={[styles.providerLabel, { color: provider.foreground }]}>{provider.label}</Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {notice && (
              <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.notice}>{notice}</Text>
            )}
            <PolicyLinks />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  screen: { width: '100%', maxWidth: layout.maxWidth, paddingHorizontal: layout.gutter },
  header: { alignItems: 'center', paddingVertical: 24 },
  brandIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  brand: { marginTop: 16, fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.65, color: colors.text },
  tagline: { marginTop: 6, textAlign: 'center', fontSize: 15, lineHeight: 22, color: colors.body },
  loginSection: { marginTop: 18 },
  providers: { gap: 10 },
  provider: { minHeight: layout.buttonHeight, borderRadius: layout.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, overflow: 'hidden' },
  google: { borderWidth: 1, borderColor: colors.border },
  googleIcon: { width: 20, height: 20 },
  apple: { width: '100%', height: layout.buttonHeight },
  providerLabel: { paddingVertical: 10, fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.75 },
  notice: { marginTop: 12, fontSize: 13, lineHeight: 20, color: colors.body, textAlign: 'center' },
});
