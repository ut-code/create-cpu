import type * as PIXI from "pixi.js";
import {
  Box,
  ClickAwayListener,
  MenuItem,
  MenuList,
  Paper,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { KeyboardDoubleArrowRight } from "@mui/icons-material";
import { useStore } from "../../contexts/store";
import CCComponentEditorRenderer from "./renderer";
import type { CCComponentId } from "../../store/component";

export type CCComponentEditorProps = {
  componentId: CCComponentId;
};

export default function CCComponentEditor({
  componentId,
}: CCComponentEditorProps) {
  const rendererRef = useRef<CCComponentEditorRenderer>();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useStore();
  const component = store.components.get(componentId);
  invariant(component);

  const [contextMenuPosition, setContextMenuPosition] =
    useState<PIXI.Point | null>(null);

  useEffect(() => {
    invariant(containerRef.current && canvasRef.current);
    const app = new CCComponentEditorRenderer(
      store,
      componentId,
      containerRef.current,
      canvasRef.current,
      setContextMenuPosition
    );
    rendererRef.current = app;
    return () => app.destroy();
  }, [store, componentId]);

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }} ref={containerRef}>
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={() => {
          invariant(rendererRef.current);
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
          </MenuList>
        </ClickAwayListener>
      )}
    </Box>
  );
}
