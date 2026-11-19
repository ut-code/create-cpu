import { createTheme } from "@mui/material";
import { theme } from "../style";

export const muiTheme = createTheme({
	palette: {
		primary: { main: theme.colors.primary },
	},
	typography: {
		fontFamily: "var(--font-family)",
	},
});
