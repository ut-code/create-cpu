import { Box } from "@mui/material";
import { Outlet } from "react-router";
import GlobalHeader from "./components/GlobalHeader";

export default function App() {
	return (
		<Box
			sx={{
				display: "grid",
				gridTemplateRows: "max-content minmax(0, 1fr)",
				height: "100%",
			}}
		>
			<GlobalHeader style={{ gridColumn: "1 / -1" }} />
			<Outlet />
		</Box>
	);
}
