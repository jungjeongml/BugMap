export const discoveryMapStyle = 'mapbox://styles/mapbox/standard';

export const discoveryMapBasemap = {
  lightPreset: 'night',
  show3dObjects: false,
  showPointOfInterestLabels: false,
  showTransitLabels: false,
  // Standard's night lighting darkens these inputs before drawing the map.
  colorLand: '#4C6356',
  colorGreenspace: '#537D5D',
  colorWater: '#416A73',
  colorBuildings: '#496154',
  colorRoads: '#62786D',
  colorMotorways: '#7A9183',
  colorTrunks: '#7A9183',
} as const;
