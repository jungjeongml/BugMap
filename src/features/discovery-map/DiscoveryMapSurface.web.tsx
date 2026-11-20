import { type CSSProperties, useEffect, useRef } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './discoveryMapSurface.css';
import { seoulForestCamera } from '../../config/mapbox.mjs';
import { createMapLoadTracker } from './discoveryMapLoad';
import { discoveryMapBasemap, discoveryMapStyle } from './discoveryMapStyle';
import type { DiscoveryMapSurfaceProps } from './DiscoveryMapSurface';

type MapResourceError = {
  error: { message: string; url?: string };
  source?: { type: string };
  sourceId?: string;
  tile?: unknown;
};

export function DiscoveryMapSurface({ token, ornamentInset, onStatus }: DiscoveryMapSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let map: MapboxMap | undefined;
    let observer: ResizeObserver | undefined;
    onStatus('loading');

    async function initialize(element: HTMLDivElement) {
      try {
        const { default: mapbox } = await import('mapbox-gl');
        if (disposed) return;

        const instance = new mapbox.Map({
          container: element,
          accessToken: token,
          style: discoveryMapStyle,
          config: { basemap: discoveryMapBasemap },
          center: [seoulForestCamera.longitude, seoulForestCamera.latitude],
          zoom: seoulForestCamera.zoom,
          projection: 'mercator',
          language: 'ko',
          pitchWithRotate: false,
          dragRotate: false,
          logoPosition: 'bottom-left',
          locale: { 'AttributionControl.ToggleAttribution': '지도 출처', 'Map.Title': '발견 지도' },
        });
        map = instance;
        instance.touchZoomRotate.disableRotation();

        const load = createMapLoadTracker(onStatus);
        let loadedStyle = false;
        let loadedTile = false;
        let failedTile = false;

        instance.on('style.import.load', () => load.recover('style'));
        instance.on('style.load', () => { loadedStyle = true; });
        instance.on('sourcedata', event => {
          if (event.source?.type !== 'vector') return;
          if (event.sourceId && event.sourceDataType === 'metadata') {
            load.recover(`source:${event.sourceId}`);
          }
          if (event.tile) {
            if (event.sourceDataType === 'error') {
              failedTile = true;
            } else {
              loadedTile = true;
            }
          }
        });
        instance.on('error', (event: MapResourceError) => {
          const { error, source, sourceId, tile } = event;
          if (/glyph|font|sprite/i.test(error.message) || /\/fonts\/|\/sprite[.@]/i.test(error.url ?? '')) return;

          if (sourceId && source?.type === 'vector') {
            if (tile) {
              failedTile = true;
            } else {
              load.fail(`source:${sourceId}`);
            }
          } else if (!source && (!loadedStyle || error.url?.includes('/styles/'))) {
            load.fail('style');
          }
        });
        instance.on('idle', () => {
          if (loadedTile) {
            load.recover('tiles');
          } else if (failedTile) {
            load.fail('tiles');
          }
          loadedTile = false;
          failedTile = false;
          load.rendered();
        });
        instance.on('webglcontextlost', () => load.fail('context'));
        instance.on('webglcontextrestored', () => {
          load.resetViewport();
          load.recover('context');
        });

        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => {
            if (!disposed) instance.resize();
          });
          observer.observe(element);
        }
      } catch {
        if (!disposed) onStatus('failed');
      }
    }

    void initialize(container);
    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [token, onStatus]);

  return (
    <div
      ref={containerRef}
      className="bugmap-discovery-map"
      style={{ '--bugmap-ornament-inset': `${ornamentInset}px` } as CSSProperties}
    />
  );
}
