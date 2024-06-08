import { Box, InputAdornment, TextField } from "@mui/material";
import invariant from "tiny-invariant";
import nullthrows from "nullthrows";
import { Color } from "pixi.js";
import { useState } from "react";
import { Search } from "@mui/icons-material";
import useAllComponents from "../../store/react/selectors";
import { useStore } from "../../store/react";
import { isIncluding, type CCComponentId } from "../../store/component";
import { ccPinTypes } from "../../store/componentPin";
import { blackColor, whiteColor } from "../../common/theme";
import { setDataTransferAsComponent } from "../../common/serialization";

export type SidePanelProps = {
  editedComponentId: CCComponentId;
};

function ComponentRenderer({ componentId }: { componentId: CCComponentId }) {
  const { store } = useStore();
  const component = store.components.get(componentId);
  invariant(component);
  const pins = store.componentPins
    .getPinIdsByComponentId(componentId)
    .filter((pinId) => store.componentPins.isInterfacePin(pinId))
    .map((ccPinId) => nullthrows(store.componentPins.get(ccPinId)));

  return (
    <div aria-label="Component" role="img">
      <div>{component.name}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          marginTop: "4px",
          border: `2px solid ${new Color(blackColor).toHex()}`,
          background: new Color(whiteColor).toHex(),
        }}
      >
        {ccPinTypes.map((type) => (
          <div
            key={type}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "6px 0",
            }}
          >
            {pins
              .filter((pin) => pin.type === type)
              .map((pin) => (
                <div
                  key={pin.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    ...(
                      {
                        input: {
                          flexDirection: "row",
                          marginInlineStart: "-8px",
                        },
                        output: {
                          flexDirection: "row-reverse",
                          marginInlineEnd: "-8px",
                        },
                      } as const
                    )[pin.type],
                  }}
                >
                  <div
                    aria-label="Pin"
                    style={{
                      width: "10px",
                      height: "10px",
                      border: `2px solid ${new Color(blackColor).toHex()}`,
                      borderRadius: "4px",
                      background: new Color(whiteColor).toHex(),
                    }}
                  />
                  <div aria-label="Pin name">{pin.name}</div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SidePanel(sidePanelProps: SidePanelProps) {
  const { editedComponentId } = sidePanelProps;
  const { store } = useStore();
  const components = useAllComponents();
  const [searchText, setSearchText] = useState("");

  return (
    <Box sx={{ overflowY: "auto" }}>
      <TextField
        size="small"
        sx={{ m: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);
        }}
      />
      <Box component="ul" sx={{ m: 0, p: 0, listStyleType: "none" }}>
        {components
          .filter((component) => component.name.includes(searchText))
          .filter((component) => component.id !== editedComponentId)
          .filter(
            (component) => !isIncluding(store, component.id, editedComponentId)
          )
          .map((component) => (
            <Box
              key={component.id}
              component="li"
              draggable
              sx={{ cursor: "grab", p: 2 }}
              onDragStart={(e) => {
                setDataTransferAsComponent(e.dataTransfer, component.id);
              }}
            >
              <ComponentRenderer componentId={component.id} />
            </Box>
          ))}
      </Box>
    </Box>
  );
}
