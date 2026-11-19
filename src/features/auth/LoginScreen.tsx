import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout } from '../../theme/tokens';
import { AppIcon, type IconName } from './AppIcon';
import { FeatureCarousel } from './FeatureCarousel';
import { PolicyLinks } from './PolicyLinks';

const providers = [
  { id: 'kakao', label: '카카오로 3초 만에 시작하기', background: colors.kakao, foreground: colors.kakaoText, iconColor: colors.kakaoText, size: 20 },
  { id: 'naver', label: '네이버로 시작하기', background: colors.naver, foreground: colors.surface, iconColor: colors.surface, size: 16 },
  { id: 'apple', label: 'Apple로 계속하기', background: colors.apple, foreground: colors.surface, iconColor: colors.surface, size: 16 },
] as const;

const assurances = [
  { icon: 'security', label: '개인위치 암호화' },
  { icon: 'shield', label: '생태보호 가이드 준수' },
  { icon: 'bolt', label: '간편 가입' },
] as const;

export function LoginScreen() {
  const [width, setWidth] = useState(390);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.screen} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          <View style={styles.header}>
            <View style={styles.brandIcon}><AppIcon name="beetle" size={25} color={colors.primary} /></View>
            <Text accessibilityRole="header" style={styles.brand}>곤충맵</Text>
            <Text style={styles.tagline}>내 손안의 곤충 생태 지도 & 채집 메이트</Text>
            <Text style={styles.introduction}>도심 속 숲길부터 비밀 서식지까지, 생생한 자연{ '\n' }탐사를 함께 시작해보세요.</Text>
          </View>

          <FeatureCarousel width={width} />

          <View style={styles.loginSection}>
            <View style={styles.providers}>
              {providers.map(provider => (
                <Pressable
                  key={provider.id}
                  disabled
                  accessibilityRole="button"
                  accessibilityLabel={provider.label}
                  accessibilityHint="로그인 연동은 추후 제공됩니다"
                  accessibilityState={{ disabled: true }}
                  style={[styles.provider, { backgroundColor: provider.background }]}
                >
                  <AppIcon name={provider.id} size={provider.size} color={provider.iconColor} />
                  <Text style={[styles.providerLabel, { color: provider.foreground }]}>{provider.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.secondaryActions}>
              <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }}>
                <Text style={styles.email}>다른 이메일로 로그인</Text>
              </Pressable>
              <View style={styles.separatorDot} />
              <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }} style={styles.guest}>
                <Text style={styles.guestText}>비회원으로 둘러보기</Text>
                <AppIcon name="arrow" size={12} color="#1F2937" />
              </Pressable>
            </View>

            <View style={styles.assurances}>
              {assurances.map((assurance, index) => (
                <View key={assurance.icon} style={styles.assuranceGroup}>
                  {index > 0 && <View style={styles.assuranceDivider} />}
                  <View style={styles.assurance}>
                    <AppIcon name={assurance.icon} size={12} color={colors.primary} />
                    <Text style={styles.assuranceText}>{assurance.label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <PolicyLinks />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: 24 },
  screen: { width: '100%', maxWidth: layout.maxWidth, overflow: 'hidden' },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 32, paddingBottom: 12 },
  brandIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryOutline, alignItems: 'center', justifyContent: 'center' },
  brand: { marginTop: 16, fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.65, color: colors.text },
  tagline: { marginTop: 4, textAlign: 'center', fontSize: 17, lineHeight: 24, fontWeight: '600', color: colors.primary },
  introduction: { marginTop: 4, textAlign: 'center', maxWidth: 300, fontSize: 13, lineHeight: 21, color: colors.secondary },
  loginSection: { paddingHorizontal: layout.gutter, marginTop: 6, paddingBottom: 16 },
  providers: { gap: 10 },
  provider: { minHeight: layout.buttonHeight, borderRadius: layout.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  providerLabel: { fontSize: 15, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  secondaryActions: { marginTop: 18, minHeight: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  email: { fontSize: 14, lineHeight: 21, color: colors.secondary },
  separatorDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  guestText: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: '#1F2937' },
  assurances: { marginTop: 22, minHeight: 43, backgroundColor: colors.subtle, borderWidth: 1, borderColor: colors.border, borderRadius: 32, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', rowGap: 8 },
  assuranceGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assurance: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  assuranceText: { fontSize: 11, lineHeight: 21, fontWeight: '500', color: colors.body },
  assuranceDivider: { width: 1, height: 12, backgroundColor: colors.border },
});
