import { useEffect } from 'react';
import type { DiscoveryMapStatus } from './discoveryMapLoad';

export type DiscoveryMapSurfaceProps = {
  token: string;
  ornamentInset: number;
  onStatus: (status: DiscoveryMapStatus) => void;
};

export function DiscoveryMapSurface({ onStatus }: DiscoveryMapSurfaceProps) {
  useEffect(() => onStatus('failed'), [onStatus]);
  return null;
}
