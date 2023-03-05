import { useEffect, useRef } from "react";
import { CCApplication, CCBlock } from "./editor";

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) throw new Error("Canvas not found");
    const app = new CCApplication(canvasRef.current);
    app.ccCanvas.addChild(new CCBlock());
  }, []);

  return <canvas ref={canvasRef} />;
}
