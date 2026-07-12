/** Eén-tik deep-link naar Google/Apple Maps (29_MobieleApp.md § 2.2, FR-041). */
export function buildMapsUrl(address: string, isIOS: boolean): string {
  const query = encodeURIComponent(address);
  return isIOS
    ? `https://maps.apple.com/?q=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
