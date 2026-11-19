import { ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./App";
import { LanguageProvider } from "./i18n";
import "./style.css";
import { muiTheme } from "./common/theme";
import EditPage from "./pages/edit";
import HomePage from "./pages/home";
import RecoveryPage from "./pages/recovery";
import { StoreProvider } from "./store/react";
import { restoreSavedStore } from "./store/savedStore";

const restoredStore = restoreSavedStore();
if (restoredStore.type === "unrestorable") console.error(restoredStore.error);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<LanguageProvider>
			<ThemeProvider theme={muiTheme}>
				<StoreProvider
					initial={restoredStore}
					recovery={(saved) => <RecoveryPage {...saved} />}
				>
					<BrowserRouter>
						<Routes>
							<Route element={<App />}>
								<Route index element={<HomePage />} />
								<Route path="components/:componentId" element={<EditPage />} />
							</Route>
						</Routes>
					</BrowserRouter>
				</StoreProvider>
			</ThemeProvider>
		</LanguageProvider>
	</React.StrictMode>,
);
