import { LogOut } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, mapFlowColors } from '../../theme/tokens';
import { DiscoveryMapScreen } from '../discovery-map/DiscoveryMapScreen';
import { AuthError, shouldRevalidateSession, type AuthProvider, type AuthSession } from './authClient';
import { authRuntime } from './authRuntime';
import { LoginScreen } from './LoginScreen';

type AuthView =
  | { screen: 'restore'; notice?: string }
  | { screen: 'login'; pending: AuthProvider | null; notice?: string }
  | { screen: 'authenticated'; session: AuthSession; pending: boolean; notice?: string };

const loginErrors: Record<AuthError['kind'], string> = {
  callback: '로그인 확인에 실패했어요. 다시 시도해 주세요.',
  expired: '로그인 요청이 만료됐어요. 로그인 버튼을 다시 눌러 주세요.',
  network: '연결을 확인한 뒤 로그인 버튼을 다시 눌러 주세요.',
  provider: '로그인을 완료하지 못했어요. 다시 시도해 주세요.',
  'provider-unavailable': '이 로그인 방법은 현재 이용할 수 없어요. 다른 방법을 선택해 주세요.',
  storage: '기기에 로그인 정보를 저장하지 못했어요. 다시 시도해 주세요.',
  unavailable: '로그인 창을 열지 못했어요. 다시 시도해 주세요.',
};

const unavailableMessages = {
  'mobile-only': '소셜 로그인은 모바일 앱에서 이용할 수 있어요.',
  'expo-go': '소셜 로그인은 BugMap 앱 빌드에서 이용할 수 있어요.',
  'missing-server': '로그인 서버 주소가 설정되지 않았어요.',
} as const;

const client = authRuntime.status === 'ready' ? authRuntime.client : null;

export function AuthFlow() {
  const [view, setView] = useState<AuthView>(() => client
    ? { screen: 'restore' }
    : { screen: 'login', pending: null });
  const operationRunning = useRef(false);
  const verifiedAt = useRef<number | null>(null);

  const restoreSession = useCallback(async () => {
    if (!client || operationRunning.current) return;
    operationRunning.current = true;
    setView({ screen: 'restore' });
    try {
      const hadSession = verifiedAt.current !== null;
      const session = await client.restoreSession();
      verifiedAt.current = session ? Date.now() : null;
      setView(session
        ? { screen: 'authenticated', session, pending: false }
        : { screen: 'login', pending: null, notice: hadSession ? '로그인 세션이 만료됐어요. 다시 로그인해 주세요.' : undefined });
    } catch (error) {
      setView({
        screen: 'restore',
        notice: error instanceof AuthError && error.kind === 'network'
          ? '연결을 확인한 뒤 다시 시도해 주세요.'
          : '로그인 상태를 불러오지 못했어요. 다시 시도해 주세요.',
      });
    } finally {
      operationRunning.current = false;
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!client || view.screen !== 'authenticated') return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && shouldRevalidateSession(verifiedAt.current, Date.now())) {
        void restoreSession();
      }
    });
    return () => subscription.remove();
  }, [restoreSession, view.screen]);

  async function signIn(provider: AuthProvider) {
    if (!client || operationRunning.current) return;
    operationRunning.current = true;
    setView({ screen: 'login', pending: provider });
    try {
      const result = await client.signIn(provider);
      if (result.kind === 'authenticated') verifiedAt.current = Date.now();
      setView(result.kind === 'authenticated'
        ? { screen: 'authenticated', session: result.session, pending: false }
        : { screen: 'login', pending: null, notice: '로그인이 취소됐어요.' });
    } catch (error) {
      setView({
        screen: 'login',
        pending: null,
        notice: loginErrors[error instanceof AuthError ? error.kind : 'provider'],
      });
    } finally {
      operationRunning.current = false;
    }
  }

  async function signOut() {
    if (!client || operationRunning.current || view.screen !== 'authenticated') return;
    operationRunning.current = true;
    const { session } = view;
    setView({ screen: 'authenticated', session, pending: true });
    try {
      await client.signOut();
      verifiedAt.current = null;
      setView({ screen: 'login', pending: null });
    } catch {
      setView({
        screen: 'authenticated',
        session,
        pending: false,
        notice: '로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      operationRunning.current = false;
    }
  }

  if (view.screen === 'login') {
    return (
      <LoginScreen
        available={client !== null}
        pending={view.pending}
        notice={authRuntime.status === 'ready' ? view.notice : unavailableMessages[authRuntime.status]}
        onSignIn={provider => void signIn(provider)}
      />
    );
  }

  if (view.screen === 'restore') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.panel}>
          {view.notice ? (
            <>
              <Text accessibilityRole="alert" style={styles.message}>{view.notice}</Text>
              <Pressable accessibilityRole="button" style={styles.button} onPress={() => void restoreSession()}>
                <Text style={styles.label}>다시 시도</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text accessibilityLiveRegion="polite" style={styles.message}>로그인 상태를 확인 중이에요.</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <DiscoveryMapScreen
      sessionControls={
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: view.pending, busy: view.pending }}
            disabled={view.pending}
            style={styles.signOutButton}
            onPress={() => void signOut()}
          >
            <LogOut color={mapFlowColors.textSecondary} size={16} />
            <Text style={styles.signOutText}>{view.pending ? '로그아웃 중…' : '로그아웃'}</Text>
          </Pressable>
          {view.notice && (
            <Text accessibilityRole="alert" style={styles.signOutNotice}>{view.notice}</Text>
          )}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  panel: { width: '100%', maxWidth: layout.maxWidth, padding: layout.gutter, alignItems: 'center', gap: 12 },
  message: { textAlign: 'center', fontSize: 15, lineHeight: 22, color: colors.body },
  button: { minHeight: layout.buttonHeight, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primaryTint, borderRadius: layout.radius, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: colors.primary },
  signOutButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: mapFlowColors.mapPanelBorder,
    backgroundColor: mapFlowColors.mapPanel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signOutText: { color: mapFlowColors.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  signOutNotice: {
    marginTop: 8,
    color: mapFlowColors.text,
    backgroundColor: mapFlowColors.mapPanel,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    lineHeight: 20,
  },
});
