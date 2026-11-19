import { Close, Edit, KeyboardDoubleArrowRight } from "@mui/icons-material";
import { Box, IconButton, Paper } from "@mui/material";
import nullthrows from "nullthrows";
import { useMessages } from "../../../../i18n";
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
	const messages = useMessages();
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
				maxWidth: "calc(100% - 60px)",
				display: "flex",
				alignItems: "center",
				gap: 1,
				p: 1,
			}}
		>
			<Box
				sx={{ color: "text.secondary", flexShrink: 0, whiteSpace: "nowrap" }}
			>
				{messages.common.components}
			</Box>
			<KeyboardDoubleArrowRight sx={{ flexShrink: 0 }} />
			<Box
				component="span"
				title={component.name}
				sx={{
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
			>
				{component.name}
			</Box>
			<IconButton
				size="small"
				aria-label={messages.editor.editProperties}
				onClick={onComponentPropertyDialogOpen}
			>
				<Edit fontSize="small" />
			</IconButton>
			<div aria-hidden style={{ flexGrow: 1 }} />
			<IconButton
				size="small"
				aria-label={messages.editor.close}
				onClick={onEditorClose}
			>
				<Close fontSize="small" />
			</IconButton>
		</Paper>
	);
}
