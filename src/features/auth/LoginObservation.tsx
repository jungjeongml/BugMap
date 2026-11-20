import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { mapFlowColors } from '../../theme/tokens';
import { AppIcon } from './AppIcon';

const observationDots = [[124, 81], [210, 130], [276, 148]] as const;

export function LoginObservation({ width }: { width: number }) {
  const scale = width / 390;
  const position = (x: number, y: number) => ({ left: x * scale, top: y * scale } as const);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="관찰 기록 예시, 서울숲에서 만난 넓적사슴벌레"
      pointerEvents="none"
      style={{ width, height: 180 * scale }}
    >
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        <Svg width="100%" height="100%" viewBox="0 0 390 180">
          <Path
            transform="translate(72 0)"
            d="M .8 45 C 4 36 16 33 26 30 L 44 7 C 51 -3 64 0 71 2 C 82 4 87 9 91 17 C 100 22 105 27 118 31 C 129 37 127 43 138 53 L 149 66 C 156 76 163 91 170 105 C 178 120 166 134 161 145 C 154 157 151 157 138 160 L 116 166 C 108 169 103 173 94 169 C 82 164 72 159 63 151 L 55 139 C 41 129 33 120 33 106 L 14 84 C 4 74 10 64 4 54 Z"
            fill={mapFlowColors.observationFill}
            stroke={mapFlowColors.observationOutline}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          {observationDots.map(([x, y]) => (
            <Circle key={x} cx={x} cy={y} r={9} fill="#C5EE792E" stroke="#C5EE7959" />
          ))}
          {observationDots.map(([x, y]) => (
            <Circle key={x} cx={x} cy={y} r={3} fill={mapFlowColors.primary} />
          ))}
          <Circle cx={179} cy={90} r={31} fill="#C5EE7921" stroke="#C5EE7959" />
          <Circle cx={179} cy={90} r={20} fill={mapFlowColors.primary} />
          <Path d="M199 90h12" stroke={mapFlowColors.observationOutline} strokeOpacity={0.38} />
        </Svg>
        <View style={[styles.marker, position(167, 78)]}>
          <AppIcon name="beetle" size={24 * scale} color={mapFlowColors.onPrimary} strokeWidth={1.7} />
        </View>
        <View style={[styles.card, position(211.5, 65.5), { width: 130 * scale }]}>
          <Text allowFontScaling={false} style={styles.cardTitle}>넓적사슴벌레</Text>
          <Text allowFontScaling={false} style={styles.cardMeta}>서울숲 관찰 기록</Text>
        </View>
        <Text allowFontScaling={false} style={[styles.mapLabel, styles.park, position(84, 32)]}>서울숲</Text>
        <Text allowFontScaling={false} style={[styles.mapLabel, position(284, 23)]}>성수동</Text>
        <Text allowFontScaling={false} style={[styles.mapLabel, position(64, 165)]}>한강</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: { position: 'absolute' },
  card: {
    position: 'absolute',
    minHeight: 47,
    borderWidth: 1,
    borderColor: '#485B45',
    borderRadius: 11,
    backgroundColor: '#182A1E',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 11,
  },
  cardTitle: { color: mapFlowColors.text, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  cardMeta: { color: '#BDD1B5', fontSize: 10, lineHeight: 13 },
  mapLabel: { position: 'absolute', color: '#C3D3CA', fontSize: 11, lineHeight: 14, fontWeight: '500' },
  park: { color: '#D7E8CD' },
});
