import { ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { theme } from "./common/theme";
import { StoreProvider } from "./store/react";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<StoreProvider>
			<ThemeProvider theme={theme}>
				<App />
			</ThemeProvider>
		</StoreProvider>
	</React.StrictMode>,
);
