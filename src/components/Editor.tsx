import * as PIXI from "pixi.js";
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
import CCBlock from "../models/block";

export default function Editor() {
  const applicationRef = useRef<CCApplication>();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [contextMenuPosition, setContextMenuPosition] =
    useState<PIXI.Point | null>(null);

  useEffect(() => {
    invariant(containerRef.current && canvasRef.current);
    const app = new CCApplication(
      containerRef.current,
      canvasRef.current,
      setContextMenuPosition
    );
    applicationRef.current = app;
    app.ccCanvas.addBlock(new CCBlock({ x: 0, y: 0 }, "Custom"));
    app.ccCanvas.addBlock(new CCBlock({ x: 200, y: 0 }, "And"));
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
        onDrop={(e) => {
          invariant(applicationRef.current);
          applicationRef.current.ccCanvas.addBlock(
            new CCBlock(
              applicationRef.current.ccCanvas.toWorldPosition(
                new PIXI.Point(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
              ),
              "And"
            )
          );
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
                applicationRef.current.ccCanvas.addBlock(
                  new CCBlock(
                    applicationRef.current.ccCanvas.toWorldPosition(
                      contextMenuPosition
                    ),
                    "Custom"
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
