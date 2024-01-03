import * as PIXI from "pixi.js";
import {
  Box,
  ClickAwayListener,
  Divider,
  Fab,
  IconButton,
  MenuItem,
  MenuList,
  Paper,
} from "@mui/material";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import {
  Close,
  Edit,
  KeyboardDoubleArrowRight,
  PlayArrow,
} from "@mui/icons-material";
import { useStore } from "../../../store/react";
import CCComponentEditorRenderer from "./renderer";
import { CCComponentStore, type CCComponentId } from "../../../store/component";
import { parseDataTransferAsComponent } from "../../../common/serialization";
import { CCNodeStore, type CCNodeId, type CCNode } from "../../../store/node";
import { ComponentEditorStoreProvider, useComponentEditorStore } from "./store";
import {
  CCConnectionStore,
  type CCConnection,
} from "../../../store/connection";

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
  const overlayAreaRef = useRef<HTMLDivElement>(null);
  const store = useStore();
  const componentEditorStore = useComponentEditorStore();
  const componentEditorState = componentEditorStore();
  const component = store.components.get(componentId);
  invariant(component);

  const [contextMenuPosition, setContextMenuPosition] =
    useState<PIXI.Point | null>(null);

  useEffect(() => {
    invariant(containerRef.current && overlayAreaRef.current);
    const app = new CCComponentEditorRenderer({
      context: {
        store,
        componentEditorStore,
        overlayArea: overlayAreaRef.current,
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
          store.nodes.register(
            CCNodeStore.create({
              componentId: droppedComponentId,
              parentComponentId: componentId,
              position: componentEditorState.toWorldPosition(
                new PIXI.Point(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
              ),
            })
          );
        }}
      />
      <div
        ref={overlayAreaRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
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
        <div aria-hidden style={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          onClick={() => {
            onClose();
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Paper>
      <Fab
        style={{ position: "absolute", bottom: "40px", right: "40px" }}
        color="primary"
        onClick={() => {
          componentEditorState.setEditorMode(
            componentEditorState.editorMode === "edit" ? "play" : "edit"
          );
          componentEditorState.resetTimeStep();
        }}
      >
        {componentEditorState.editorMode === "edit" ? <PlayArrow /> : <Edit />}
      </Fab>
      {componentEditorState.editorMode === "play" && (
        <Fab
          style={{ position: "absolute", bottom: "40px", right: "120px" }}
          color="primary"
          onClick={() => componentEditorState.incrementTimeStep()}
        >
          <SkipNextIcon />
        </Fab>
      )}
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
              Create a node
            </MenuItem>
            {componentEditorState.selectedNodeIds.size > 0 && (
              <MenuItem
                onClick={() => {
                  const oldNodes = [
                    ...componentEditorState.selectedNodeIds,
                  ].map((nodeId) => {
                    const node = store.nodes.get(nodeId);
                    invariant(node);
                    return node;
                  });
                  const oldConnections = [
                    ...componentEditorState.selectedConnectionIds,
                  ].map((connectionId) => {
                    const connection = store.connections.get(connectionId);
                    invariant(connection);
                    return connection;
                  });
                  const newComponent = CCComponentStore.create({
                    name: "New Component",
                  });
                  const oldToNewNodeIdMap = new Map<CCNodeId, CCNodeId>();
                  const newNodes = oldNodes.map<CCNode>((oldNode) => {
                    const newNode = CCNodeStore.create({
                      parentComponentId: newComponent.id,
                      position: oldNode.position,
                      componentId: oldNode.componentId,
                    });
                    oldToNewNodeIdMap.set(oldNode.id, newNode.id);
                    return newNode;
                  });
                  const newConnections = oldConnections.flatMap<CCConnection>(
                    (oldConnection) => {
                      const fromNodeId = oldToNewNodeIdMap.get(
                        oldConnection.from.nodeId
                      );
                      const toNodeId = oldToNewNodeIdMap.get(
                        oldConnection.to.nodeId
                      );
                      if (!fromNodeId || !toNodeId) return [];
                      return CCConnectionStore.create({
                        parentComponentId: newComponent.id,
                        from: {
                          nodeId: fromNodeId,
                          pinId: oldConnection.from.pinId,
                        },
                        to: {
                          nodeId: toNodeId,
                          pinId: oldConnection.to.pinId,
                        },
                        bentPortion: oldConnection.bentPortion,
                      });
                    }
                  );
                  store.components.register(newComponent);
                  for (const node of newNodes) store.nodes.register(node);
                  for (const connection of newConnections)
                    store.connections.register(connection);
                  store.connections.unregister([
                    ...componentEditorState.selectedConnectionIds,
                  ]);
                  store.nodes.unregister([
                    ...componentEditorState.selectedNodeIds,
                  ]);
                  setContextMenuPosition(null);
                  onEditComponent(newComponent.id);
                }}
              >
                Create a new component...
              </MenuItem>
            )}
            {componentEditorState.selectedNodeIds.size !== 0 &&
              componentEditorState.selectedConnectionIds.size !== 0 && (
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
                  Delete
                </MenuItem>
              )}
            {(() => {
              if (componentEditorState.selectedNodeIds.size !== 1)
                return undefined;
              const iteratorResult = componentEditorState.selectedNodeIds
                .values()
                .next();
              invariant(!iteratorResult.done);
              const targetNode = store.nodes.get(iteratorResult.value);
              invariant(targetNode);
              const targetComponent = store.components.get(
                targetNode.componentId
              );
              invariant(targetComponent);
              if (targetComponent.isIntrinsic) return undefined;
              return (
                <>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      invariant(targetNode);
                      setContextMenuPosition(null);
                      onEditComponent(targetNode.componentId);
                    }}
                  >
                    Edit...
                  </MenuItem>
                </>
              );
            })()}
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
