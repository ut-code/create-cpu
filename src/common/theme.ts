import { Color } from "@pixi/color";
import { createTheme } from "@mui/material";

// See https://www.figma.com/file/M3dC0Gk98IGSGlxY901rBh/
export const blackColor = 0x000000;
export const whiteColor = 0xffffff;
export const grayColor = {
  main: 0x9e9e9e,
  darken2: 0x616161,
};
export const primaryColor = 0x00d372;
export const activeColor = 0x00aaff;
export const errorColor = 0xff0000;
export const editorBackgroundColor = 0xf3f3f3;
export const editorGridColor = 0xdddddd;

export const theme = createTheme({
  palette: {
    primary: { main: new Color(primaryColor).toHex() },
  },
});
