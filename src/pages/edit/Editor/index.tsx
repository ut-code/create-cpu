import * as PIXI from "pixi.js";
import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useStore } from "../../../store/react";
import CCComponentEditorRenderer from "./renderer";
import { parseDataTransferAsComponent } from "../../../common/serialization";
import { CCNodeStore } from "../../../store/node";
import { ComponentEditorStoreProvider, useComponentEditorStore } from "./store";
import { ComponentPropertyDialog } from "../../../components/ComponentPropertyDialog";
import CCComponentEditorTitleBar from "./components/TitleBar";
import CCComponentEditorViewModeSwitcher from "./components/ViewModeSwitcher";
import CCComponentEditorContextMenu from "./components/ContextMenu";
import type { CCComponentId } from "../../../store/component";
import * as intrinsics from "../../../store/intrinsics";

export type CCComponentEditorProps = {
  componentId: CCComponentId;
  onEditComponent: (componentId: CCComponentId) => void;
  onClose: () => void;
};

function CCComponentEditorContent({
  componentId,
  onEditComponent,
  onClose,
}: CCComponentEditorProps) {
  const rendererRef = useRef<CCComponentEditorRenderer>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { store } = useStore();
  const componentEditorStore = useComponentEditorStore();
  const componentEditorState = componentEditorStore();
  const component = store.components.get(componentId);
  invariant(component);

  const [contextMenuPosition, setContextMenuPosition] =
    useState<PIXI.Point | null>(null);
  const [isComponentPropertyDialogOpen, setIsComponentPropertyDialogOpen] =
    useState(false);

  useEffect(() => {
    invariant(containerRef.current);
    const app = new CCComponentEditorRenderer({
      context: {
        store,
        componentEditorStore,
        overlayArea: document.createElement("div"), // dummy
      },
      componentId,
      htmlContainer: containerRef.current,
      onContextMenu: setContextMenuPosition,
    });
    rendererRef.current = app;
    return () => app.destroy();
  }, [store, componentEditorStore, componentId]);

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      <div
        style={{ overflow: "hidden", width: "100%", height: "100%" }}
        ref={containerRef}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          invariant(rendererRef.current);
          const droppedComponentId = parseDataTransferAsComponent(
            e.dataTransfer
          );
          if (!droppedComponentId || componentEditorState.editorMode === "play")
            return;
          const variablePins =
            droppedComponentId === intrinsics.fourBitsIntrinsicComponent.id ||
            droppedComponentId ===
              intrinsics.distributeFourBitsIntrinsicComponent.id
              ? []
              : null;
          const node = CCNodeStore.create({
            componentId: droppedComponentId,
            parentComponentId: componentId,
            position: componentEditorState.toWorldPosition(
              new PIXI.Point(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
            ),
            variablePins,
          });
          store.nodes.register(node);
          if (variablePins) {
            if (
              droppedComponentId === intrinsics.fourBitsIntrinsicComponent.id
            ) {
              store.nodePins.incrementVariablePin(
                node.id,
                intrinsics.fourBitsIntrinsicComponentInputPin.id
              );
            } else {
              store.nodePins.incrementVariablePin(
                node.id,
                intrinsics.distributeFourBitsIntrinsicComponentOutputPin.id
              );
            }
          }
        }}
      />
      <CCComponentEditorTitleBar
        onComponentPropertyDialogOpen={() =>
          setIsComponentPropertyDialogOpen(true)
        }
        onEditorClose={onClose}
      />
      <CCComponentEditorViewModeSwitcher />
      {contextMenuPosition && (
        <CCComponentEditorContextMenu
          contextMenuPosition={contextMenuPosition}
          onClose={() => setContextMenuPosition(null)}
          onEditComponent={onEditComponent}
        />
      )}
      {isComponentPropertyDialogOpen && (
        <ComponentPropertyDialog
          defaultName={component.name}
          onAccept={(newName) => {
            store.components.update(componentId, { name: newName });
            setIsComponentPropertyDialogOpen(false);
          }}
          onCancel={() => {
            setIsComponentPropertyDialogOpen(false);
          }}
        />
      )}
    </Box>
  );
}

export default function CCComponentEditor(props: CCComponentEditorProps) {
  const { componentId } = props;
  return (
    <ComponentEditorStoreProvider componentId={componentId}>
      <CCComponentEditorContent {...props} />
    </ComponentEditorStoreProvider>
  );
}
