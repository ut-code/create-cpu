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
import CCNode from "../models/block";
import { sampleHalfAdder } from "../common/sampleComponent";

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
    app.ccCanvas.addBlock(
      new CCNode({
        component: sampleHalfAdder,
        id: "HalfAdder",
        position: new PIXI.Point(0, 0),
      })
    );
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
            new CCNode({
              component: sampleHalfAdder,
              position: applicationRef.current.ccCanvas.toWorldPosition(
                new PIXI.Point(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
              ),
              id: "HalfAdder",
            })
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
                  new CCNode({
                    id: "HalfAdder",
                    position:
                      applicationRef.current.ccCanvas.toWorldPosition(
                        contextMenuPosition
                      ),
                    component: sampleHalfAdder,
                  })
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
