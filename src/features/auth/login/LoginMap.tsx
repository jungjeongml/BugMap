import { useState, type ReactNode } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { mapFlowColors } from '../../../theme/tokens';
import { getLoginMapUrl, loginMapAttribution, selectLoginMap, type LoginMapResult } from './loginMapConfig';

const illustration = require('./assets/login-map-illustration.png');
const mapboxLogo = require('./assets/mapbox-logo.png');

export function LoginMap({ children }: { children: (mapboxVisible: boolean) => ReactNode }) {
  const uri = getLoginMapUrl(process.env.EXPO_PUBLIC_BUGMAP_MAPBOX_TOKEN);

  return <LoginMapImage key={uri ?? 'illustration'} uri={uri}>{children}</LoginMapImage>;
}

function LoginMapImage({ uri, children }: { uri: string | null; children: (mapboxVisible: boolean) => ReactNode }) {
  const [result, setResult] = useState<LoginMapResult | null>(null);
  const mapboxVisible = selectLoginMap(uri, result) === 'mapbox';

  return (
    <View style={styles.screen}>
      <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
        {!mapboxVisible && <Image source={illustration} resizeMode="cover" style={styles.image} />}
        {uri && result?.status !== 'failed' && (
          <Image
            source={{ uri }}
            resizeMode="cover"
            fadeDuration={0}
            style={[styles.image, !mapboxVisible && styles.loading]}
            onLoad={() => setResult({ uri, status: 'loaded' })}
            onError={() => setResult({ uri, status: 'failed' })}
          />
        )}
        {mapboxVisible && (
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="login-map-shade" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={mapFlowColors.loginBackground} stopOpacity={0.94} />
                <Stop offset="24%" stopColor={mapFlowColors.background} stopOpacity={0.8} />
                <Stop offset="46%" stopColor={mapFlowColors.background} stopOpacity={0.3} />
                <Stop offset="56%" stopColor={mapFlowColors.background} stopOpacity={0.35} />
                <Stop offset="75%" stopColor={mapFlowColors.background} stopOpacity={0.8} />
                <Stop offset="100%" stopColor={mapFlowColors.loginBackground} stopOpacity={0.96} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#login-map-shade)" />
          </Svg>
        )}
      </View>
      {children(mapboxVisible)}
    </View>
  );
}

export function LoginMapAttribution({ insets }: { insets: EdgeInsets }) {
  return (
    <View style={[styles.attribution, {
      paddingLeft: insets.left + 8,
      paddingRight: insets.right + 8,
      paddingBottom: insets.bottom,
    }]}>
      <Image source={mapboxLogo} accessible accessibilityRole="image" accessibilityLabel="Mapbox" style={styles.logo} resizeMode="contain" />
      <View style={styles.attributionLinks}>
        {loginMapAttribution.map(({ label, url }) => {
          const webLink = Platform.OS === 'web'
            ? { href: url, hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } }
            : { onPress: () => { void Linking.openURL(url).catch(() => undefined); } };

          return (
            <Text key={label} accessibilityRole="link" style={styles.attributionLink} {...webLink}>{label}</Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mapFlowColors.loginBackground },
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  loading: { opacity: 0 },
  attribution: {
    width: '100%',
    flexShrink: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: 'rgba(11, 19, 15, 0.87)',
  },
  logo: { width: 88, height: 23 },
  attributionLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', flexShrink: 1 },
  attributionLink: {
    minHeight: 44,
    paddingHorizontal: 4,
    paddingVertical: 14,
    color: mapFlowColors.text,
    fontSize: 11,
    lineHeight: 16,
    textDecorationLine: 'underline',
  },
});
