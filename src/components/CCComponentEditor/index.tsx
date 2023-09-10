import * as PIXI from "pixi.js";
import {
  Box,
  ClickAwayListener,
  Fab,
  MenuItem,
  MenuList,
  Paper,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { Edit, KeyboardDoubleArrowRight, PlayArrow } from "@mui/icons-material";
import { useStore } from "../../store/react";
import CCComponentEditorRenderer from "./renderer";
import type { CCComponentId } from "../../store/component";
import { parseDataTransferAsComponent } from "../../common/serialization";
import { CCNodeStore } from "../../store/node";
import { ComponentEditorStoreProvider, useComponentEditorStore } from "./store";

export type CCComponentEditorProps = {
  componentId: CCComponentId;
};

function CCComponentEditorContent({ componentId }: CCComponentEditorProps) {
  const rendererRef = useRef<CCComponentEditorRenderer>();
  const containerRef = useRef<HTMLDivElement>(null);
  const store = useStore();
  const componentEditorStore = useComponentEditorStore();
  const componentEditorState = componentEditorStore();
  const component = store.components.get(componentId);
  invariant(component);

  const [contextMenuPosition, setContextMenuPosition] =
    useState<PIXI.Point | null>(null);

  useEffect(() => {
    invariant(containerRef.current);
    const app = new CCComponentEditorRenderer({
      store,
      componentEditorStore,
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
          if (!droppedComponentId) return;
          store.nodes.register(
            CCNodeStore.create({
              componentId: droppedComponentId,
              parentComponentId: componentId,
              position: rendererRef.current.toWorldPosition(
                new PIXI.Point(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
              ),
            })
          );
        }}
      />
      <Paper
        sx={{
          position: "absolute",
          top: "30px",
          left: "30px",
          width: "400px",
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
        }}
      >
        <Box sx={{ color: "text.secondary" }}>Components</Box>
        <KeyboardDoubleArrowRight />
        {component.name}
      </Paper>
      <Fab
        style={{ position: "absolute", bottom: "40px", right: "40px" }}
        color="primary"
        onClick={() =>
          componentEditorState.setEditorMode(
            componentEditorState.editorMode === "edit" ? "play" : "edit"
          )
        }
      >
        {componentEditorState.editorMode === "edit" ? <PlayArrow /> : <Edit />}
      </Fab>
      {contextMenuPosition && (
        <ClickAwayListener
          onClickAway={() => {
            setContextMenuPosition(null);
          }}
        >
          <MenuList
            component={Paper}
            dense
            sx={{
              position: "absolute",
              top: `${contextMenuPosition.y}px`,
              left: `${contextMenuPosition.x}px`,
              width: "200px",
            }}
          >
            <MenuItem
              onClick={() => {
                invariant(rendererRef.current);
                setContextMenuPosition(null);
              }}
            >
              ブロックを配置
            </MenuItem>
            {(componentEditorState.selectedNodeIds.size !== 0 ||
              componentEditorState.selectedConnectionIds.size !== 0) && (
              <MenuItem
                onClick={() => {
                  store.nodes.unregister([
                    ...componentEditorState.selectedNodeIds,
                  ]);
                  store.connections.unregister([
                    ...componentEditorState.selectedConnectionIds,
                  ]);
                  componentEditorState.selectNode([], true);
                  componentEditorState.selectConnection([], false);
                  setContextMenuPosition(null);
                }}
              >
                削除
              </MenuItem>
            )}
          </MenuList>
        </ClickAwayListener>
      )}
    </Box>
  );
}

export default function CCComponentEditor(props: CCComponentEditorProps) {
  return (
    <ComponentEditorStoreProvider>
      <CCComponentEditorContent {...props} />
    </ComponentEditorStoreProvider>
  );
}
