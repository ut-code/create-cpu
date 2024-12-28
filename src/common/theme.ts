import { createTheme } from "@mui/material";

// See https://www.figma.com/file/M3dC0Gk98IGSGlxY901rBh/
export const blackColor = "#000000";
export const whiteColor = "#ffffff";
export const primaryColor = "#00d372";
export const activeColor = "#00aaff";
export const errorColor = "#ff0000";
export const editorBackgroundColor = "#fafafa";
export const editorGridColor = "#dddddd";

export const theme = createTheme({
  palette: {
    primary: { main: primaryColor },
  },
});
