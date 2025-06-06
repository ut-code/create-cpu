import { createTheme } from "@mui/material";

// See https://www.figma.com/file/M3dC0Gk98IGSGlxY901rBh/
export const theme = {
	palette: {
		black: "#000000",
		white: "#ffffff",
		textPrimary: "#444444",
		primary: "#009966",
		error: "#ff0000",
		border: "#bbbbbb",
		editorBackground: "#fafafa",
		editorGrid: "#dddddd",
	},
};

export const muiTheme = createTheme({
	palette: {
		primary: { main: theme.palette.primary },
	},
});
