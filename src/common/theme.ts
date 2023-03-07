import { Color } from "@pixi/color";
import { createTheme } from "@mui/material";

export const blackColor = 0x000000;
export const whiteColor = 0xffffff;
export const primaryColor = 0x00d372;
export const editorBackgroundColor = 0xf3f3f3;
export const editorGridColor = 0xdddddd;

export const theme = createTheme({
  palette: {
    primary: { main: new Color(primaryColor).toHex() },
  },
});
