"use client";

// The options of the selected tool. Each one changes a field of `choices` (lib/tools.ts).
import type { Lists, Option } from "@/lib/gepetto";
import type { Choices, ToolId } from "@/lib/tools";
import { Segmented, SelectField, SwitchRow, TwoColumns } from "./ui";

export function ToolOptions({ tool, choices, onChange, lists }: {
  tool: ToolId;
  choices: Choices;
  onChange: (choices: Choices) => void;
  /** The ids from the API, null until they are loaded. */
  lists: Lists | null;
}) {
  // Changes some fields, keeps the others
  const set = (changes: Partial<Choices>) => onChange({ ...choices, ...changes });

  const styleField = (
    <SelectField id="style" label="Style" value={choices.styleId} onChange={(styleId) => set({ styleId })}>
      <Options items={lists?.styles} />
    </SelectField>
  );

  switch (tool) {
    case "enhance":
      return (
        <SwitchRow
          label="Straighten verticals"
          checked={choices.straighten}
          onChange={(straighten) => set({ straighten })}
        />
      );

    case "declutter":
      return (
        <>
          <Segmented
            label="What to remove"
            value={choices.declutterMode}
            onChange={(declutterMode) => set({ declutterMode })}
            options={[
              { value: "room", label: "Whole room" },
              { value: "erase", label: "Erase objects" },
            ]}
          />
          {choices.declutterMode === "room" && (
            <>
              <SwitchRow
                label="Keep the kitchen"
                checked={choices.keepKitchen}
                onChange={(keepKitchen) => set({ keepKitchen })}
              />
              <SwitchRow
                label="Keep the bathroom"
                checked={choices.keepBathroom}
                onChange={(keepBathroom) => set({ keepBathroom })}
              />
              <SwitchRow
                label="Keep the fireplace"
                checked={choices.keepFireplace}
                onChange={(keepFireplace) => set({ keepFireplace })}
              />
            </>
          )}
        </>
      );

    case "furnish":
      return (
        <>
          <Segmented
            label="What to furnish"
            value={choices.furnishMode}
            onChange={(furnishMode) => set({ furnishMode })}
            options={[
              { value: "room", label: "Whole room" },
              { value: "zone", label: "A zone" },
            ]}
          />
          <TwoColumns>
            {choices.furnishMode === "room" ? (
              <SelectField id="room" label="Room" value={choices.roomId} onChange={(roomId) => set({ roomId })}>
                <Options items={lists?.autoRooms} />
              </SelectField>
            ) : (
              <ZoneField choices={choices} set={set} lists={lists} />
            )}
            {styleField}
          </TwoColumns>
        </>
      );

    case "sunshine":
      return (
        <>
          <SelectField id="sky" label="Sky" value={choices.skyId} onChange={(skyId) => set({ skyId })}>
            <Options items={lists?.skies} />
          </SelectField>
          <SwitchRow
            label="Sunlight and shadows"
            checked={choices.lightProjection}
            onChange={(lightProjection) => set({ lightProjection })}
          />
          <SwitchRow
            label="Leaves on bare trees"
            checked={choices.addLeafs}
            onChange={(addLeafs) => set({ addLeafs })}
          />
          <SwitchRow
            label="Pool lights (sunset skies)"
            checked={choices.poolLight}
            onChange={(poolLight) => set({ poolLight })}
          />
        </>
      );

    case "restyle":
      return (
        <>
          <TwoColumns>
            <SelectField
              id="restyle-room"
              label="Room"
              value={choices.restyleRoomId}
              onChange={(restyleRoomId) => set({ restyleRoomId })}
            >
              <Options items={lists?.allRooms} />
            </SelectField>
            {styleField}
          </TwoColumns>
          <SwitchRow
            label="Keep the floor"
            checked={choices.preserveFloor}
            onChange={(preserveFloor) => set({ preserveFloor })}
          />
        </>
      );

    case "walls":
      return (
        <>
          <SelectField id="wall" label="Colour" value={choices.wallType} onChange={(wallType) => set({ wallType })}>
            <Options items={lists?.walls} />
          </SelectField>
          {choices.wallType === "custom" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-color" className="text-xs font-medium text-ink-2">
                Your colour, in English
              </label>
              <input
                id="custom-color"
                maxLength={30}
                value={choices.customWallColor}
                onChange={(event) => set({ customWallColor: event.target.value })}
                placeholder="sage green"
                className="h-10 rounded-[10px] border border-line px-3 text-sm outline-none focus:border-ink"
              />
            </div>
          )}
          <SwitchRow
            label="Keep the ceiling"
            checked={choices.preserveCeiling}
            onChange={(preserveCeiling) => set({ preserveCeiling })}
          />
        </>
      );

    case "floor":
      return (
        <>
          <SelectField id="floor" label="Floor" value={choices.floorType} onChange={(floorType) => set({ floorType })}>
            <Options items={lists?.floors} />
          </SelectField>
          <SwitchRow
            label="Change the baseboards too"
            checked={choices.includeBaseboard}
            onChange={(includeBaseboard) => set({ includeBaseboard })}
          />
        </>
      );

    case "upscale":
      return (
        <Segmented
          label="Resolution"
          value={choices.resolution}
          onChange={(resolution) => set({ resolution })}
          options={[
            { value: "2k", label: "2K · 4 MP" },
            { value: "4k", label: "4K · 16 MP" },
          ]}
        />
      );
  }
}

/** A painted zone is furnished as a room, or with one piece of furniture: one list for both. */
function ZoneField({ choices, set, lists }: {
  choices: Choices;
  set: (changes: Partial<Choices>) => void;
  lists: Lists | null;
}) {
  // The value of the list says which group the choice is in: "room:bedroom" or "furniture:sofa"
  const value = choices.zoneAs === "room" ? `room:${choices.zoneRoomId}` : `furniture:${choices.furnitureId}`;

  function choose(value: string) {
    const [group, id] = value.split(":");
    if (group === "room") set({ zoneAs: "room", zoneRoomId: id });
    else set({ zoneAs: "furniture", furnitureId: id });
  }

  return (
    <SelectField id="furnish-as" label="Furnish as" value={value} onChange={choose}>
      <optgroup label="A room">
        {(lists?.zoneRooms ?? []).map((room) => (
          <option key={room.id} value={`room:${room.id}`}>
            {room.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="One piece of furniture">
        {(lists?.furniture ?? []).map((piece) => (
          <option key={piece.id} value={`furniture:${piece.id}`}>
            {piece.name}
          </option>
        ))}
      </optgroup>
    </SelectField>
  );
}

/** The <option>s of a list from the API. */
function Options({ items }: { items: Option[] | undefined }) {
  return (
    <>
      {(items ?? []).map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </>
  );
}
