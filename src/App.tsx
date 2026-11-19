import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { Outlet } from "react-router";
import GlobalHeader from "./components/GlobalHeader";

export function AppLayout({ children }: { children: ReactNode }) {
	return (
		<Box
			sx={{
				display: "grid",
				gridTemplateRows: "max-content minmax(0, 1fr)",
				height: "100%",
			}}
		>
			<GlobalHeader style={{ gridColumn: "1 / -1" }} />
			{children}
		</Box>
	);
}

export default function App() {
	return (
		<AppLayout>
			<Outlet />
		</AppLayout>
	);
}
