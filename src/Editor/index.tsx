import * as PIXI from "pixi.js";
import {
  Box,
  ClickAwayListener,
  MenuItem,
  MenuList,
  Paper,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { CCApplication, CCBlock } from "./editor";

export default function Editor() {
  const applicationRef = useRef<CCApplication>();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [contextMenuPosition, setContextMenuPosition] =
    useState<PIXI.Point | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current)
      throw new Error("Element not found");
    const app = new CCApplication(containerRef.current, canvasRef.current);
    applicationRef.current = app;
    app.ccCanvas.addChild(new CCBlock({ x: 0, y: 0 }));
    app.on("canvasContextMenu", setContextMenuPosition);
  }, []);

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }} ref={containerRef}>
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => {
          e.preventDefault();
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
                if (!applicationRef.current) return;
                applicationRef.current.ccCanvas.addChild(
                  new CCBlock(
                    applicationRef.current.ccCanvas.pixiEditorContainer.toLocal(
                      contextMenuPosition
                    )
                  )
                );
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
