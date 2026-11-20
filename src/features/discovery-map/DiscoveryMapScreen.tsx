import { LocateFixed, Map, MessageCircle, Plus, Search, UserRound, UsersRound } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPublicMapboxToken } from '../../config/mapbox.mjs';
import { layout, mapFlowColors as colors } from '../../theme/tokens';
import { DiscoveryMapSurface } from './DiscoveryMapSurface';
import type { DiscoveryMapStatus } from './discoveryMapLoad';

const token = getPublicMapboxToken(process.env.EXPO_PUBLIC_BUGMAP_MAPBOX_TOKEN);
const panelBottomPadding = 36;
const panelHeight = 188;
const actionGap = 8;

const tabs = [
  { label: '지도', Icon: Map, selected: true },
  { label: '커뮤니티', Icon: UsersRound, selected: false },
  { label: '채팅', Icon: MessageCircle, selected: false },
  { label: '마이', Icon: UserRound, selected: false },
];

const statusMessages = {
  missing: '지도를 표시하려면 Mapbox 공개 토큰이 필요해요.',
  loading: '지도를 불러오고 있어요.',
  failed: '지도를 불러오지 못했어요.',
};

export function DiscoveryMapScreen({ sessionControls }: { sessionControls?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const [mapStatus, setMapStatus] = useState<DiscoveryMapStatus>('loading');

  const bottomPadding = Math.max(panelBottomPadding, insets.bottom);
  const ornamentInset = (footerHeight || panelHeight + bottomPadding - panelBottomPadding
    + layout.buttonHeight + actionGap) + 12;
  const status = token ? mapStatus : 'missing';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      {token && (
        <DiscoveryMapSurface
          token={token}
          ornamentInset={ornamentInset}
          onStatus={setMapStatus}
        />
      )}

      {status !== 'ready' && (
        <View pointerEvents="none" style={styles.status}>
          <Text
            accessibilityRole={status === 'loading' ? undefined : 'alert'}
            accessibilityLiveRegion="polite"
            style={styles.statusText}
          >
            {statusMessages[status]}
          </Text>
        </View>
      )}

      {sessionControls && (
        <View pointerEvents="box-none" style={[styles.sessionControls, { top: insets.top + 8 }]}>
          {sessionControls}
        </View>
      )}

      <View
        pointerEvents="box-none"
        onLayout={event => setFooterHeight(event.nativeEvent.layout.height)}
        style={styles.footer}
      >
        <View pointerEvents="box-none" style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="내 위치로 이동"
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.locate}
          >
            <LocateFixed color={colors.location} size={24} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.record}
          >
            <Plus color={colors.onPrimary} size={24} />
            <Text style={styles.recordLabel}>발견/채집 기록하기</Text>
          </Pressable>
        </View>

        <View style={[styles.panel, { paddingBottom: bottomPadding }]}>
          <View style={styles.handleArea} accessible={false}>
            <View style={styles.handle} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.search}
          >
            <Search color={colors.textPlaceholder} size={24} />
            <Text style={styles.searchLabel}>곤충 이름 또는 지역 검색</Text>
          </Pressable>
          <View accessibilityRole="tablist" style={styles.tabs}>
            {tabs.map(({ label, Icon, selected }) => {
              const color = selected ? colors.primary : colors.textSecondary;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="tab"
                  accessibilityState={{ disabled: true, selected }}
                  disabled
                  style={[styles.tab, selected && styles.selectedTab]}
                >
                  <Icon color={color} size={24} />
                  <Text style={[styles.tabLabel, { color }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  status: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: layout.gutter },
  statusText: {
    overflow: 'hidden',
    color: colors.text,
    backgroundColor: colors.mapPanel,
    borderRadius: 16,
    paddingHorizontal: layout.gutter,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sessionControls: { position: 'absolute', left: layout.gutter, right: layout.gutter, alignItems: 'flex-end' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: layout.gutter,
    paddingBottom: actionGap,
  },
  locate: {
    width: layout.buttonHeight,
    height: layout.buttonHeight,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.mapPanelBorder,
    backgroundColor: colors.observationMarkerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  record: {
    minHeight: layout.buttonHeight,
    minWidth: 184,
    maxWidth: '80%',
    borderRadius: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  recordLabel: { flexShrink: 1, color: colors.onPrimary, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  panel: {
    borderWidth: 1,
    borderColor: colors.mapPanelBorder,
    borderBottomWidth: 0,
    borderTopLeftRadius: layout.radius,
    borderTopRightRadius: layout.radius,
    backgroundColor: colors.mapPanel,
    paddingHorizontal: layout.gutter - 1,
  },
  handleArea: { alignItems: 'center', height: 43, paddingTop: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.sheetHandle },
  search: {
    minHeight: layout.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.searchBorder,
    borderRadius: 24,
    backgroundColor: colors.searchSurface,
  },
  searchLabel: { flexShrink: 1, color: colors.textPlaceholder, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  tabs: { flexDirection: 'row', marginTop: 8, gap: 4 },
  tab: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 18,
  },
  selectedTab: { backgroundColor: colors.activeTabSurface, borderColor: colors.activeTabBorder },
  tabLabel: { fontSize: 11, lineHeight: 14, fontWeight: '500', textAlign: 'center' },
});
