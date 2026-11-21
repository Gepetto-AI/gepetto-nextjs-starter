// The eight tools of the studio, and everything the panel lets you choose.
// What each tool sends to Gepetto is in lib/sdk-calls.ts.
import type { Lists, Option } from "./gepetto";

export type ToolId = "enhance" | "declutter" | "furnish" | "sunshine" | "restyle" | "walls" | "floor" | "upscale";

/** The tools, in the order of the panel. */
export const TOOLS: { id: ToolId; name: string }[] = [
  { id: "enhance", name: "Enhance" },
  { id: "declutter", name: "Declutter" },
  { id: "furnish", name: "Furnish" },
  { id: "sunshine", name: "Blue sky" },
  { id: "restyle", name: "Restyle" },
  { id: "walls", name: "Repaint walls" },
  { id: "floor", name: "New floor" },
  { id: "upscale", name: "Upscale" },
];

/** Everything the panel lets you choose. One object for all the tools: switching tools keeps your choices. */
export interface Choices {
  // Enhance
  straighten: boolean;

  // Declutter: the whole room, or only what is painted
  declutterMode: "room" | "erase";
  keepKitchen: boolean;
  keepBathroom: boolean;
  keepFireplace: boolean;

  // Furnish: the whole room, or a painted zone (as a room, or with one piece of furniture)
  furnishMode: "room" | "zone";
  roomId: string;
  zoneAs: "room" | "furniture";
  zoneRoomId: string;
  furnitureId: string;

  // Furnish and Restyle
  styleId: string;

  // Blue sky
  skyId: string;
  lightProjection: boolean;
  poolLight: boolean;
  addLeafs: boolean;

  // Restyle
  restyleRoomId: string;
  preserveFloor: boolean;

  // Repaint walls
  wallType: string;
  customWallColor: string;
  preserveCeiling: boolean;

  // New floor
  floorType: string;
  includeBaseboard: boolean;

  // Upscale
  resolution: "2k" | "4k";
}

/** The choices the studio opens with: the first render is one click away. */
export function defaultChoices(lists: Lists | null): Choices {
  return {
    straighten: false,

    declutterMode: "room",
    keepKitchen: false,
    keepBathroom: false,
    keepFireplace: false,

    furnishMode: "room",
    roomId: pick(lists?.autoRooms, "living_room"),
    zoneAs: "room",
    zoneRoomId: pick(lists?.zoneRooms, "living_room"),
    furnitureId: pick(lists?.furniture, "sofa"),

    styleId: pick(lists?.styles, "scandinave"),

    skyId: pick(lists?.skies, "sunny"),
    lightProjection: false,
    poolLight: false,
    addLeafs: false,

    restyleRoomId: pick(lists?.allRooms, "living_room"),
    preserveFloor: false,

    wallType: pick(lists?.walls, "egg_shell"),
    customWallColor: "",
    preserveCeiling: false,

    floorType: pick(lists?.floors, "parquet"),
    includeBaseboard: false,

    resolution: "4k",
  };
}

/** The preferred id if the API lists it, else the first one of the list. */
function pick(options: Option[] | undefined, preferred: string): string {
  if (!options || options.length === 0) return preferred;
  const found = options.find((option) => option.id === preferred);
  return found ? found.id : options[0].id;
}

/** Does the tool, with these choices, work on a painted zone? */
export function needsMask(tool: ToolId, choices: Choices): boolean {
  if (tool === "declutter") return choices.declutterMode === "erase";
  if (tool === "furnish") return choices.furnishMode === "zone";
  return false;
}

/** The label of the main button: what you get. */
export function buttonLabel(tool: ToolId, choices: Choices): string {
  switch (tool) {
    case "enhance":
      return "Enhance the photo";
    case "declutter":
      return choices.declutterMode === "erase" ? "Erase the painted objects" : "Empty the room";
    case "furnish":
      return choices.furnishMode === "zone" ? "Furnish the zone" : "Furnish the room";
    case "sunshine":
      return "Add a blue sky";
    case "restyle":
      return "Restyle the room";
    case "walls":
      return "Repaint the walls";
    case "floor":
      return "Change the floor";
    case "upscale":
      return `Upscale to ${choices.resolution.toUpperCase()}`;
  }
}

/** The title of the card shown while the image is being made. */
export function workingTitle(tool: ToolId, choices: Choices): string {
  switch (tool) {
    case "enhance":
      return "Enhancing the photo";
    case "declutter":
      return choices.declutterMode === "erase" ? "Erasing the objects" : "Emptying the room";
    case "furnish":
      return choices.furnishMode === "zone" ? "Furnishing the zone" : "Furnishing the room";
    case "sunshine":
      return "Adding a blue sky";
    case "restyle":
      return "Restyling the room";
    case "walls":
      return "Repainting the walls";
    case "floor":
      return "Changing the floor";
    case "upscale":
      return "Upscaling";
  }
}

/** The line under that title: what was chosen, by name. */
export function workingDetail(tool: ToolId, choices: Choices, lists: Lists | null): string {
  const style = nameOf(lists?.styles, choices.styleId);

  switch (tool) {
    case "enhance":
      return choices.straighten ? "Light, colours and verticals" : "Light and colours";
    case "declutter":
      return choices.declutterMode === "erase" ? "The painted objects" : "The whole room";
    case "furnish":
      if (choices.furnishMode === "room") return `${nameOf(lists?.autoRooms, choices.roomId)} · ${style}`;
      if (choices.zoneAs === "furniture") return `${nameOf(lists?.furniture, choices.furnitureId)} · ${style}`;
      return `${nameOf(lists?.zoneRooms, choices.zoneRoomId)} · ${style}`;
    case "sunshine":
      return nameOf(lists?.skies, choices.skyId);
    case "restyle":
      return `${nameOf(lists?.allRooms, choices.restyleRoomId)} · ${style}`;
    case "walls":
      return choices.wallType === "custom" ? choices.customWallColor : nameOf(lists?.walls, choices.wallType);
    case "floor":
      return nameOf(lists?.floors, choices.floorType);
    case "upscale":
      return choices.resolution.toUpperCase();
  }
}

function nameOf(options: Option[] | undefined, id: string): string {
  const found = options?.find((option) => option.id === id);
  return found ? found.name : id;
}
