// Sample photos, public: the studio works with them before any storage is connected.
export interface Sample {
  label: string;
  url: string;
}

export const SAMPLES: Sample[] = [
  { label: 'Empty living room', url: 'https://assets.gepettoapp.com/raw-images/b85e2aa5-ac29-44a0-93eb-2de0a40f7905.png' },
  { label: 'House front, grey sky', url: 'https://assets.gepettoapp.com/samples/pavillon/facade.png' },
  { label: 'Cluttered bedroom', url: 'https://assets.gepettoapp.com/samples/haussmann/chambre-encombree.png' },
  { label: 'Bedroom', url: 'https://assets.gepettoapp.com/samples/cote-azur/chambre.png' },
];

/** A small square version, for the thumbnails (the full photo is what Gepetto receives). */
export function thumbnail(url: string): string {
  const prefix = 'https://assets.gepettoapp.com/';
  if (!url.startsWith(prefix)) return url;
  return `${prefix}cdn-cgi/image/width=192,height=192,fit=cover,quality=80,format=auto/${url.slice(prefix.length)}`;
}
