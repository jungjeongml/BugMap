import { isRunningInExpoGo } from 'expo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { seoulForestCamera } from '../../config/mapbox.mjs';
import { createMapLoadTracker } from './discoveryMapLoad';
import { discoveryMapBasemap, discoveryMapStyle } from './discoveryMapStyle';
import type { DiscoveryMapSurfaceProps } from './DiscoveryMapSurface';

type NativeMapbox = typeof import('@rnmapbox/maps');

const initialCamera = {
  centerCoordinate: [seoulForestCamera.longitude, seoulForestCamera.latitude],
  zoomLevel: seoulForestCamera.zoom,
};

export function DiscoveryMapSurface({ token, ornamentInset, onStatus }: DiscoveryMapSurfaceProps) {
  const [mapbox, setMapbox] = useState<NativeMapbox | null>(null);
  const hasLoadedViewport = useRef(false);
  const load = useMemo(() => createMapLoadTracker(onStatus), [onStatus]);

  useEffect(() => {
    if (isRunningInExpoGo()) {
      onStatus('failed');
      return;
    }

    let disposed = false;
    onStatus('loading');

    async function initialize() {
      try {
        // Bundle the SDK with the app while deferring evaluation until after the Expo Go guard.
        const sdk: NativeMapbox = require('@rnmapbox/maps');
        await sdk.setAccessToken(token);
        if (!disposed) setMapbox(sdk);
      } catch {
        if (!disposed) onStatus('failed');
      }
    }

    void initialize();
    return () => { disposed = true; };
  }, [token, onStatus]);

  if (!mapbox) return null;

  const { Camera, MapView, StyleImport } = mapbox;
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      styleURL={discoveryMapStyle}
      projection="mercator"
      compassEnabled={false}
      scaleBarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      logoPosition={{ bottom: ornamentInset, left: 16 }}
      attributionPosition={{ bottom: ornamentInset, right: 16 }}
      onDidFinishLoadingStyle={() => load.recover('style')}
      onDidFinishLoadingMap={() => {
        hasLoadedViewport.current = true;
        load.recover('tiles');
        load.rendered();
      }}
      onMapLoadingError={error => {
        switch (error?.type) {
          case 'tile':
            // MapLoaded fires once per style. A missing tile while panning can coexist with a usable map.
            if (!hasLoadedViewport.current) load.fail('tiles');
            break;
          case 'sprite':
          case 'glyphs':
            break;
          case 'source':
            load.fail('source');
            break;
          default:
            load.fail('style');
        }
      }}
    >
      <Camera defaultSettings={initialCamera} />
      <StyleImport id="basemap" existing config={discoveryMapBasemap} />
    </MapView>
  );
}
