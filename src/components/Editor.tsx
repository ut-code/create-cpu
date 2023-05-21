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
import CCApplication from "../models/application";
import CCStore from "../models/store";

export default function Editor() {
  const storeRef = useRef<CCStore>();
  const applicationRef = useRef<CCApplication>();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [contextMenuPosition, setContextMenuPosition] =
    useState<PIXI.Point | null>(null);

  useEffect(() => {
    invariant(containerRef.current && canvasRef.current);
    const store = new CCStore();
    const app = new CCApplication(
      store,
      containerRef.current,
      canvasRef.current,
      setContextMenuPosition
    );
    applicationRef.current = app;
    storeRef.current = store;
    return () => app.destroy();
  }, []);

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
          invariant(applicationRef.current);
        }}
      />
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
                invariant(applicationRef.current);
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
