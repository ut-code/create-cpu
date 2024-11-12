import { createTheme } from "@mui/material";

// See https://www.figma.com/file/M3dC0Gk98IGSGlxY901rBh/
export const blackColor = "#000000";
export const whiteColor = "#ffffff";
export const grayColor = {
  main: "#9e9e9e",
  darken2: "#616161",
};
export const primaryColor = "#00d372";
export const activeColor = "#00aaff";
export const errorColor = "#ff0000";
export const editorBackgroundColor = "#f3f3f3";
export const editorGridColor = "#dddddd";

export const theme = createTheme({
  palette: {
    primary: { main: primaryColor },
  },
});
