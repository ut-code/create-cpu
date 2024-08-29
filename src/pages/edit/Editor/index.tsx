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
import nullthrows from "nullthrows";
import { useMeasure } from "react-use";
import * as matrix from "transformation-matrix";
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
import { ComponentPropertyDialog } from "../../../components/ComponentPropertyDialog";

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

  const [ref, rect] = useMeasure();
  const centeringTransformation = matrix.translate(
    rect.width / 2,
    rect.height / 2
  );
  const [userTransformation, setUserTransformation] = useState(
    matrix.identity()
  );
  const viewTransformation = matrix.compose(
    centeringTransformation,
    userTransformation
  );
  const inverseViewTransformation = matrix.inverse(viewTransformation);
  const viewBoxTopLeft = matrix.applyToPoint(inverseViewTransformation, {
    x: 0,
    y: 0,
  });
  const viewBoxBottomRight = matrix.applyToPoint(inverseViewTransformation, {
    x: rect.width,
    y: rect.height,
  });

  return (
    <Box ref={ref} sx={{ position: "relative", overflow: "hidden" }}>
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        viewBox={[
          viewBoxTopLeft.x,
          viewBoxTopLeft.y,
          viewBoxBottomRight.x - viewBoxTopLeft.x,
          viewBoxBottomRight.y - viewBoxTopLeft.y,
        ].join(" ")}
      >
        <rect
          x={viewBoxTopLeft.x}
          y={viewBoxTopLeft.y}
          width={viewBoxBottomRight.x - viewBoxTopLeft.x}
          height={viewBoxBottomRight.y - viewBoxTopLeft.y}
          onPointerDown={(pointerDownEvent) => {
            const { currentTarget } = pointerDownEvent;
            const startUserTransformation = userTransformation;
            const startPoint = matrix.applyToPoint(inverseViewTransformation, {
              x: pointerDownEvent.nativeEvent.offsetX,
              y: pointerDownEvent.nativeEvent.offsetY,
            });
            const onPointerMove = (pointerMoveEvent: PointerEvent) => {
              const endPoint = matrix.applyToPoint(inverseViewTransformation, {
                x: pointerMoveEvent.offsetX,
                y: pointerMoveEvent.offsetY,
              });
              setUserTransformation(
                matrix.compose(
                  startUserTransformation,
                  matrix.translate(
                    endPoint.x - startPoint.x,
                    endPoint.y - startPoint.y
                  )
                )
              );
            };
            currentTarget.addEventListener("pointermove", onPointerMove);
            const onPointerUp = () => {
              currentTarget.removeEventListener("pointermove", onPointerMove);
              currentTarget.removeEventListener("pointerup", onPointerUp);
            };
            currentTarget.addEventListener("pointerup", onPointerUp);
          }}
          onWheel={(wheelEvent) => {
            const scale = Math.exp(-wheelEvent.deltaY / 256);
            const center = matrix.applyToPoint(inverseViewTransformation, {
              x: wheelEvent.nativeEvent.offsetX,
              y: wheelEvent.nativeEvent.offsetY,
            });
            setUserTransformation(
              matrix.compose(
                userTransformation,
                matrix.scale(scale, scale, center.x, center.y)
              )
            );
          }}
          fill="#ddffff"
        />
        <rect x="-100" y="-100" width="200" height="200" fill="red" />
      </svg>
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
              // TODO: implement
              intrinsicVariablePinCount: null,
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
        <span>{component.name}</span>
        <IconButton
          size="small"
          onClick={() => {
            setIsComponentPropertyDialogOpen(true);
          }}
        >
          <Edit fontSize="small" />
        </IconButton>
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
                  store.components.register(newComponent);
                  const oldToNewNodeIdMap = new Map<CCNodeId, CCNodeId>();
                  const newNodes = oldNodes.map<CCNode>((oldNode) => {
                    const newNode = CCNodeStore.create({
                      parentComponentId: newComponent.id,
                      position: oldNode.position,
                      componentId: oldNode.componentId,
                      intrinsicVariablePinCount:
                        oldNode.intrinsicVariablePinCount,
                    });
                    oldToNewNodeIdMap.set(oldNode.id, newNode.id);
                    return newNode;
                  });
                  for (const node of newNodes) store.nodes.register(node);
                  const newConnections = oldConnections.flatMap<CCConnection>(
                    (oldConnection) => {
                      const oldFromNodePin = nullthrows(
                        store.nodePins.get(oldConnection.from)
                      );
                      const oldToNodePin = nullthrows(
                        store.nodePins.get(oldConnection.to)
                      );
                      const newFromNodeId = nullthrows(
                        oldToNewNodeIdMap.get(oldFromNodePin.nodeId)
                      );
                      const newToNodeId = nullthrows(
                        oldToNewNodeIdMap.get(oldToNodePin.nodeId)
                      );
                      return CCConnectionStore.create({
                        parentComponentId: newComponent.id,
                        from: store.nodePins.getByImplementationNodeIdAndPinId(
                          newFromNodeId,
                          oldFromNodePin.componentPinId
                        ).id,
                        to: store.nodePins.getByImplementationNodeIdAndPinId(
                          newToNodeId,
                          oldToNodePin.componentPinId
                        ).id,
                        bentPortion: oldConnection.bentPortion,
                      });
                    }
                  );
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
            {(componentEditorState.selectedNodeIds.size > 0 ||
              componentEditorState.selectedConnectionIds.size > 0) && (
              <MenuItem
                onClick={() => {
                  if (componentEditorState.selectedNodeIds.size > 0)
                    store.nodes.unregister([
                      ...componentEditorState.selectedNodeIds,
                    ]);
                  if (componentEditorState.selectedConnectionIds.size > 0)
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
