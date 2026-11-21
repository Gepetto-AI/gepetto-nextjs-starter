// The tools of the studio, shared by the page and the server. Each one is one call to @gepetto/sdk (see lib/render.ts).

export type ToolId = 'enhance' | 'declutter' | 'furnish' | 'sunshine' | 'creative-redesign' | 'walls' | 'floor' | 'upscale';

export const TOOL_IDS: ToolId[] = ['enhance', 'declutter', 'furnish', 'sunshine', 'creative-redesign', 'walls', 'floor', 'upscale'];

export const TOOL_LABELS: Record<ToolId, string> = {
  enhance: 'Enhance',
  declutter: 'Declutter',
  furnish: 'Furnish',
  sunshine: 'Blue sky',
  'creative-redesign': 'Restyle',
  walls: 'Repaint walls',
  floor: 'New floor',
  upscale: 'Upscale',
};

/** Everything the panel lets you choose. One object for all the tools: switching tools keeps your choices. */
export interface Settings {
  straighten: boolean;
  declutterMode: 'room' | 'erase';
  keepKitchen: boolean;
  keepBathroom: boolean;
  keepFireplace: boolean;
  furnishMode: 'room' | 'zone';
  roomId: string;
  /** With a mask: `room:<id>` (the zone furnished as a room) or `piece:<id>` (one piece of furniture). */
  zoneTarget: string;
  styleId: string;
  skyId: string;
  lightProjection: boolean;
  poolLight: boolean;
  addLeafs: boolean;
  redesignRoomId: string;
  preserveFloor: boolean;
  wallType: string;
  customWallColor: string;
  preserveCeiling: boolean;
  floorType: string;
  includeBaseboard: boolean;
  resolution: '2k' | '4k';
}

/** What the page sends to POST /api/render. */
export interface RenderRequest {
  tool: ToolId;
  url: string;
  /** The painted zone, as a data URL (canvas.toDataURL('image/png')). */
  mask?: string;
  params: Record<string, string | boolean>;
  /** One per click: a retry of the same click never renders, nor bills, twice. */
  idempotencyKey: string;
}

/** Does this tool, with these settings, need a painted zone? */
export function needsMask(tool: ToolId, s: Settings): boolean {
  return (tool === 'declutter' && s.declutterMode === 'erase') || (tool === 'furnish' && s.furnishMode === 'zone');
}

/** The parameters sent to the API for a tool (only those that apply). */
export function paramsFor(tool: ToolId, s: Settings): Record<string, string | boolean> {
  const on = (o: Record<string, boolean>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));
  switch (tool) {
    case 'enhance':
      return on({ straighten: s.straighten });
    case 'declutter':
      return s.declutterMode === 'erase' ? {} : on({ keepKitchen: s.keepKitchen, keepBathroom: s.keepBathroom, keepFireplace: s.keepFireplace });
    case 'furnish': {
      if (s.furnishMode === 'room') return { roomId: s.roomId, styleId: s.styleId };
      const [kind, id] = s.zoneTarget.split(':');
      return kind === 'piece' ? { furnitureId: id, styleId: s.styleId } : { roomId: id, styleId: s.styleId };
    }
    case 'sunshine':
      return { skyId: s.skyId, ...on({ lightProjection: s.lightProjection, poolLight: s.poolLight, addLeafs: s.addLeafs }) };
    case 'creative-redesign':
      return { roomId: s.redesignRoomId, styleId: s.styleId, ...on({ preserveFloor: s.preserveFloor }) };
    case 'walls':
      return {
        wallType: s.wallType,
        ...(s.wallType === 'custom' ? { customWallColor: s.customWallColor } : {}),
        ...on({ preserveCeiling: s.preserveCeiling }),
      };
    case 'floor':
      return { floorType: s.floorType, ...on({ includeBaseboard: s.includeBaseboard }) };
    case 'upscale':
      return { resolution: s.resolution };
  }
}

/** The label of the main button: what you get. */
export function actionLabel(tool: ToolId, s: Settings): string {
  switch (tool) {
    case 'enhance': return 'Enhance the photo';
    case 'declutter': return s.declutterMode === 'erase' ? 'Erase the painted objects' : 'Empty the room';
    case 'furnish': return s.furnishMode === 'zone' ? 'Furnish the zone' : 'Furnish the room';
    case 'sunshine': return 'Add a blue sky';
    case 'creative-redesign': return 'Restyle the room';
    case 'walls': return 'Repaint the walls';
    case 'floor': return 'Change the floor';
    case 'upscale': return `Upscale to ${s.resolution.toUpperCase()}`;
  }
}

/** The title shown while the image is being made. */
export function progressLabel(tool: ToolId, s: Settings): string {
  switch (tool) {
    case 'enhance': return 'Enhancing the photo';
    case 'declutter': return s.declutterMode === 'erase' ? 'Erasing the objects' : 'Emptying the room';
    case 'furnish': return s.furnishMode === 'zone' ? 'Furnishing the zone' : 'Furnishing the room';
    case 'sunshine': return 'Adding a blue sky';
    case 'creative-redesign': return 'Restyling the room';
    case 'walls': return 'Repainting the walls';
    case 'floor': return 'Changing the floor';
    case 'upscale': return 'Upscaling';
  }
}

const METHODS: Record<ToolId, string> = {
  enhance: 'enhance',
  declutter: 'declutter',
  furnish: 'furnish',
  sunshine: 'sunshine',
  'creative-redesign': 'creativeRedesign',
  walls: 'surfaces',
  floor: 'surfaces',
  upscale: 'upscale',
};

/** The SDK call that the server makes for this request, as shown in "The SDK call". */
export function sdkCall(tool: ToolId, params: Record<string, string | boolean>, withMask: boolean): string {
  const lines = ['  url: photo.url,'];
  if (withMask) lines.push("  mask: maskDataUrl, // canvas.toDataURL('image/png')");
  if (tool === 'walls') lines.push("  surface: 'walls',");
  if (tool === 'floor') lines.push("  surface: 'floor',");
  for (const [k, v] of Object.entries(params)) lines.push(`  ${k}: ${typeof v === 'string' ? `'${v}'` : v},`);
  return `const job = await gepetto.${METHODS[tool]}({\n${lines.join('\n')}\n});`;
}
