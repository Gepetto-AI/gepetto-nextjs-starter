// Start here: what each tool of the studio asks Gepetto, as one call to @gepetto/sdk.
// The page builds the call from the choices of the panel, shows it ("The SDK call"), and sends it to the
// server, which makes it (lib/render.ts).
import type {
  CreativeRedesignParams,
  DeclutterParams,
  EnhanceParams,
  FurnishParams,
  SunshineParams,
  SurfacesParams,
  UpscaleParams,
} from "@gepetto/sdk";
import type { Choices, ToolId } from "./tools";

/** One call to @gepetto/sdk: the method, and its parameters. */
export type SdkCall =
  | { method: "enhance"; params: EnhanceParams }
  | { method: "declutter"; params: DeclutterParams }
  | { method: "furnish"; params: FurnishParams }
  | { method: "sunshine"; params: SunshineParams }
  | { method: "creativeRedesign"; params: CreativeRedesignParams }
  | { method: "surfaces"; params: SurfacesParams }
  | { method: "upscale"; params: UpscaleParams };

/**
 * The SDK call for a tool.
 * `url` is the photo (a public URL). `mask` is the painted zone, a PNG data URL from canvas.toDataURL(),
 * or "" when nothing is painted.
 */
export function sdkCallFor(tool: ToolId, choices: Choices, url: string, mask: string): SdkCall {
  switch (tool) {
    case "enhance":
      return {
        method: "enhance",
        params: { url, straighten: choices.straighten },
      };

    case "declutter":
      // Only what is painted is removed
      if (choices.declutterMode === "erase") {
        return {
          method: "declutter",
          params: { url, mask },
        };
      }
      // The whole room is emptied
      return {
        method: "declutter",
        params: {
          url,
          keepKitchen: choices.keepKitchen,
          keepBathroom: choices.keepBathroom,
          keepFireplace: choices.keepFireplace,
        },
      };

    case "furnish":
      // The whole room is furnished
      if (choices.furnishMode === "room") {
        return {
          method: "furnish",
          params: { url, roomId: choices.roomId, styleId: choices.styleId },
        };
      }
      // One piece of furniture in the painted zone
      if (choices.zoneAs === "furniture") {
        return {
          method: "furnish",
          params: { url, mask, furnitureId: choices.furnitureId, styleId: choices.styleId },
        };
      }
      // The painted zone, furnished as a room
      return {
        method: "furnish",
        params: { url, mask, roomId: choices.zoneRoomId, styleId: choices.styleId },
      };

    case "sunshine":
      return {
        method: "sunshine",
        params: {
          url,
          skyId: choices.skyId,
          lightProjection: choices.lightProjection,
          poolLight: choices.poolLight,
          addLeafs: choices.addLeafs,
        },
      };

    case "restyle":
      return {
        method: "creativeRedesign",
        params: {
          url,
          roomId: choices.restyleRoomId,
          styleId: choices.styleId,
          preserveFloor: choices.preserveFloor,
        },
      };

    case "walls":
      return {
        method: "surfaces",
        params: {
          url,
          surface: "walls",
          wallType: choices.wallType,
          // Only with wallType "custom": the colour, in English
          customWallColor: choices.wallType === "custom" ? choices.customWallColor : undefined,
          preserveCeiling: choices.preserveCeiling,
        },
      };

    case "floor":
      return {
        method: "surfaces",
        params: {
          url,
          surface: "floor",
          floorType: choices.floorType,
          includeBaseboard: choices.includeBaseboard,
        },
      };

    case "upscale":
      return {
        method: "upscale",
        params: { url, resolution: choices.resolution },
      };
  }
}
