import { ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useParams,
} from "react-router";
import App from "./App";
import { LanguageProvider } from "./i18n";
// The first of the Latin fonts in style.css, with the weights the interface uses
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
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

// The free mode was at the top before the start page was added
function RedirectToFreeMode() {
	const { componentId } = useParams<"componentId">();
	return <Navigate to={`/free/components/${componentId}`} replace />;
}

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
								<Route
									path="components/:componentId"
									element={<RedirectToFreeMode />}
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
