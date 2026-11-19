import { ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import App from "./App";
import { LanguageProvider } from "./i18n";
import "./style.css";
import { muiTheme } from "./common/theme";
import EditPage from "./pages/edit";
import HomePage from "./pages/home";
import RecoveryPage from "./pages/recovery";
import StartPage from "./pages/start";
import TutorialPage from "./pages/tutorial";
import TutorialStagePage from "./pages/tutorial/stage";
import { StoreProvider } from "./store/react";
import { restoreSavedStore } from "./store/savedStore";

const restoredStore = restoreSavedStore();
if (restoredStore.type === "unrestorable") console.error(restoredStore.error);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<LanguageProvider>
			<ThemeProvider theme={muiTheme}>
				<BrowserRouter>
					<StoreProvider
						initial={restoredStore}
						recovery={(saved) => <RecoveryPage {...saved} />}
					>
						<Routes>
							<Route element={<App />}>
								<Route index element={<StartPage />} />
								<Route path="free" element={<HomePage />} />
								<Route
									path="free/components/:componentId"
									element={<EditPage />}
								/>
								<Route path="tutorial" element={<TutorialPage />} />
								<Route
									path="tutorial/:stageId"
									element={<TutorialStagePage />}
								/>
								<Route path="*" element={<Navigate to="/" replace />} />
							</Route>
						</Routes>
					</StoreProvider>
				</BrowserRouter>
			</ThemeProvider>
		</LanguageProvider>
	</React.StrictMode>,
);
