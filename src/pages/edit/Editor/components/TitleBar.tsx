import { Close, Edit, KeyboardDoubleArrowRight } from "@mui/icons-material";
import { Box, IconButton, Paper } from "@mui/material";
import nullthrows from "nullthrows";
import { useStore } from "../../../../store/react";
import { useComponentEditorStore } from "../store";

export type CCComponentEditorTitleBarProps = {
	onEditorClose: () => void;
	onComponentPropertyDialogOpen: () => void;
};

export default function CCComponentEditorTitleBar({
	onEditorClose,
	onComponentPropertyDialogOpen,
}: CCComponentEditorTitleBarProps) {
	const componentEditorStore = useComponentEditorStore();
	const componentEditorState = componentEditorStore();
	const { store } = useStore();
	const component = nullthrows(
		store.components.get(componentEditorState.componentId),
	);

	return (
		<Paper
			sx={{
				position: "absolute",
				top: "30px",
				left: "30px",
				width: "400px",
				display: "flex",
				alignItems: "center",
				gap: 1,
				p: 1,
			}}
		>
			<Box sx={{ color: "text.secondary" }}>Components</Box>
			<KeyboardDoubleArrowRight />
			<span>{component.name}</span>
			<IconButton size="small" onClick={onComponentPropertyDialogOpen}>
				<Edit fontSize="small" />
			</IconButton>
			<div aria-hidden style={{ flexGrow: 1 }} />
			<IconButton size="small" onClick={onEditorClose}>
				<Close fontSize="small" />
			</IconButton>
		</Paper>
	);
}
