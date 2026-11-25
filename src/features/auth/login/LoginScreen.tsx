import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, layout, mapFlowColors } from '../../../theme/tokens';
import { authProvidersFor, type AuthProvider } from '../session/authClient';
import { LoginMap, LoginMapAttribution } from './LoginMap';
import { LoginObservation } from './LoginObservation';
import { PolicyLinks } from './PolicyLinks';

const providers = {
  kakao: { label: '카카오로 로그인', background: colors.kakao, foreground: colors.kakaoText },
  google: { label: 'Google로 로그인', background: colors.surface, foreground: colors.text },
  apple: { label: 'Apple로 로그인', background: colors.apple, foreground: colors.surface },
} satisfies Record<AuthProvider, { label: string; background: string; foreground: string }>;

const decorativeIconProps = Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false };

type LoginScreenProps = {
  available: boolean;
  pending: AuthProvider | null;
  notice?: string;
  onSignIn: (provider: AuthProvider) => void;
};

export function LoginScreen({ available, pending, notice, onSignIn }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const screenWidth = width - insets.left - insets.right;
  const compactGap = Math.max(24, 70 - Math.max(0, 844 - height) / 2);

  return (
    <LoginMap>
      {mapboxVisible => (
        <>
          <ScrollView
            style={styles.scroll}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(44, insets.top) + 28,
                paddingBottom: mapboxVisible ? 8 : Math.max(24, insets.bottom),
                paddingLeft: insets.left,
                paddingRight: insets.right,
              },
            ]}
          >
            <StatusBar barStyle="light-content" />
            <View style={styles.screen}>
              <View style={styles.header}>
                <Image source={require('./assets/bugmap-wordmark.png')} accessible accessibilityRole="image" accessibilityLabel="BugMap" style={styles.wordmark} />
                <Text accessibilityRole="header" style={styles.title}>
                  오늘 만난 곤충을{'\n'}<Text style={styles.titleAccent}>지도에 남겨요</Text>
                </Text>
                <Text style={styles.tagline}>사진으로 기록하고, 주변의 발견을 살펴봐요.</Text>
              </View>
              <LoginObservation width={Math.min(390, screenWidth)} />

              <View style={[styles.loginSection, { marginTop: compactGap }]}>
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
                          id === 'apple' && styles.appleButton,
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
                              <Svg width={18} height={18} viewBox="61.5225 16.5225 12.9555 12.9555" {...decorativeIconProps}>
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
          {mapboxVisible && <LoginMapAttribution insets={insets} />}
        </>
      )}
    </LoginMap>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  screen: { width: '100%', maxWidth: layout.maxWidth, alignItems: 'center' },
  header: { width: '100%', alignItems: 'center', paddingHorizontal: layout.gutter, marginBottom: 29 },
  wordmark: { width: 128, height: 39.68 },
  title: {
    marginTop: 43,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1.1,
    textAlign: 'center',
    color: mapFlowColors.text,
  },
  titleAccent: { color: mapFlowColors.primary },
  tagline: { marginTop: 18, textAlign: 'center', fontSize: 14, lineHeight: 18, color: '#D2DCDA' },
  loginSection: { width: '100%', paddingHorizontal: layout.gutter },
  providers: { gap: 12 },
  provider: { minHeight: layout.buttonHeight, borderRadius: layout.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, overflow: 'hidden' },
  google: { borderWidth: 1, borderColor: '#D9D9D9' },
  googleIcon: { width: 18, height: 18 },
  appleButton: { borderWidth: 1, borderColor: '#68786E', paddingHorizontal: 0 },
  apple: { width: '100%', height: layout.buttonHeight - 2 },
  providerLabel: { paddingVertical: 10, fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.75 },
  notice: { marginTop: 12, fontSize: 13, lineHeight: 20, color: '#D2DCDA', textAlign: 'center' },
});
