// Server side only: every tool of the studio, as one call to @gepetto/sdk.
// Each call waits for the image and resolves with the finished job (`job.output` is its URL), or throws a GepettoError.
import { gepetto } from './gepetto';
import type { RenderRequest } from './tools';

/** Vercel stops a function after 300 s (see app/api/render/route.ts): stop waiting a little before. */
const TIMEOUT_MS = 285_000;

export async function render({ tool, url, mask, params: p, idempotencyKey }: RenderRequest) {
  const g = gepetto();
  const options = { idempotencyKey, timeout: TIMEOUT_MS };
  const str = (key: string) => (typeof p[key] === 'string' ? (p[key] as string) : '');
  const bool = (key: string) => p[key] === true;

  switch (tool) {
    case 'enhance':
      return g.enhance({ url, straighten: bool('straighten') }, options);

    case 'declutter':
      // With a mask, only what is painted is removed; without, the whole room is emptied
      return mask
        ? g.declutter({ url, mask }, options)
        : g.declutter({ url, keepKitchen: bool('keepKitchen'), keepBathroom: bool('keepBathroom'), keepFireplace: bool('keepFireplace') }, options);

    case 'furnish':
      if (!mask) return g.furnish({ url, roomId: str('roomId'), styleId: str('styleId') }, options);
      // With a mask: the zone furnished as a room, or with one piece of furniture
      return str('furnitureId')
        ? g.furnish({ url, mask, furnitureId: str('furnitureId'), styleId: str('styleId') || undefined }, options)
        : g.furnish({ url, mask, roomId: str('roomId'), styleId: str('styleId') }, options);

    case 'sunshine':
      return g.sunshine({ url, skyId: str('skyId'), lightProjection: bool('lightProjection'), poolLight: bool('poolLight'), addLeafs: bool('addLeafs') }, options);

    case 'creative-redesign':
      return g.creativeRedesign({ url, roomId: str('roomId'), styleId: str('styleId'), preserveFloor: bool('preserveFloor') }, options);

    case 'walls':
      return g.surfaces({
        url,
        surface: 'walls',
        wallType: str('wallType'),
        customWallColor: str('customWallColor') || undefined,
        preserveCeiling: bool('preserveCeiling'),
      }, options);

    case 'floor':
      return g.surfaces({ url, surface: 'floor', floorType: str('floorType'), includeBaseboard: bool('includeBaseboard') }, options);

    case 'upscale':
      return g.upscale({ url, resolution: str('resolution') === '2k' ? '2k' : '4k' }, options);
  }
}
