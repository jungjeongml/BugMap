export const seoulForestCamera = Object.freeze({ longitude: 127.039, latitude: 37.5425, zoom: 14 });

/** @param {string | undefined} token */
export function getPublicMapboxToken(token) {
  const publicToken = token?.trim();
  return publicToken && /^pk\.[\w-]+\.[\w-]+$/.test(publicToken) ? publicToken : null;
}
