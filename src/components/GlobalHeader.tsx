import { AppBar } from "@mui/material";
import type { CSSProperties } from "react";
import { whiteColor } from "../common/theme";

export type GlobalHeaderProps = {
	style: CSSProperties;
};

export default function GlobalHeader({ style }: GlobalHeaderProps) {
	return (
		<AppBar
			color="default"
			position="static"
			elevation={0}
			style={style}
			sx={{
				p: 2,
				background: whiteColor,
				borderBottom: "1px solid",
				borderColor: "divider",
			}}
		>
			CreateCPU
		</AppBar>
	);
}
