import { ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./App";
import "./style.css";
import { muiTheme } from "./common/theme";
import EditPage from "./pages/edit";
import HomePage from "./pages/home";
import { StoreProvider } from "./store/react";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<StoreProvider>
			<ThemeProvider theme={muiTheme}>
				<BrowserRouter>
					<Routes>
						<Route element={<App />}>
							<Route index element={<HomePage />} />
							<Route path="components/:componentId" element={<EditPage />} />
						</Route>
					</Routes>
				</BrowserRouter>
			</ThemeProvider>
		</StoreProvider>
	</React.StrictMode>,
);
