import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { colors, layout } from '../../../theme/tokens';
import { AppIcon } from './AppIcon';
import { features, type Feature } from './loginContent';

function FeatureCard({ feature, width }: { feature: Feature; width: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.cardTop}>
        <View style={styles.iconBadge}>
          <AppIcon name={feature.icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.tag}><Text style={styles.tagText}>{feature.badge}</Text></View>
      </View>
      <View style={styles.descriptionGroup}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{feature.title}</Text>
          <AppIcon name={feature.titleIcon} size={16} color={colors.primary} />
        </View>
        <Text style={styles.description}>{feature.description}</Text>
      </View>
      <View style={styles.metadataRow}>
        <View style={styles.metadataLabel}>
          {feature.metadataIcon ? (
            <AppIcon name={feature.metadataIcon} size={14} color={colors.primary} />
          ) : <View style={styles.liveDot} />}
          <Text style={styles.metadata}>{feature.metadata}</Text>
        </View>
        <Text style={styles.caption}>{feature.caption}</Text>
      </View>
    </View>
  );
}

export function FeatureCarousel({ width }: { width: number }) {
  const carousel = useRef<ScrollViewInstance>(null);
  const [active, setActive] = useState(0);
  const cardWidth = Math.min(width * 0.82, 320);
  const stride = cardWidth + layout.cardGap;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={carousel}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={stride}
        snapToAlignment="start"
        contentContainerStyle={[styles.track, { paddingRight: Math.max(16, width - cardWidth - 16) }]}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => setActive(Math.max(0, Math.min(features.length - 1, Math.round(nativeEvent.contentOffset.x / stride))))}
      >
        {features.map(feature => <FeatureCard key={feature.id} feature={feature} width={cardWidth} />)}
      </ScrollView>
      <View style={styles.indicators}>
        {features.map((feature, index) => (
          <Pressable
            key={feature.id}
            accessibilityRole="button"
            accessibilityLabel={`${index + 1}번째 소개: ${feature.title}`}
            accessibilityState={{ selected: index === active }}
            onPress={() => carousel.current?.scrollTo({ x: index * stride, animated: true })}
            style={styles.indicatorTarget}
          >
            <View style={[styles.dot, index === active && styles.activeDot]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  track: { paddingLeft: layout.gutter, gap: layout.cardGap, paddingBottom: 8 },
  card: { minHeight: 199, borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius, backgroundColor: colors.surface, padding: 16, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBadge: { width: 44, height: 44, borderRadius: 32, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  tag: { backgroundColor: colors.muted, borderRadius: 32, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#374151', fontSize: 11, lineHeight: 21, fontWeight: '500' },
  descriptionGroup: { marginTop: 12 },
  titleRow: { flexDirection: 'row', gap: 4, alignItems: 'center', flexWrap: 'wrap' },
  title: { color: colors.text, fontSize: 17, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  description: { color: colors.body, fontSize: 13, lineHeight: 21, marginTop: 4 },
  metadataRow: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderColor: colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  metadataLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  metadata: { color: colors.primary, fontSize: 11, lineHeight: 21, fontWeight: '500', flexShrink: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  caption: { color: colors.quiet, fontSize: 11, lineHeight: 21, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  indicators: { height: 44, marginTop: -12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  indicatorTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  activeDot: { width: 24, backgroundColor: colors.primary },
});
