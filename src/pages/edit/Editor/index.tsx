import { Box } from "@mui/material";
import nullthrows from "nullthrows";
import { useState } from "react";
import { theme } from "../../../common/theme";
import { ComponentPropertyDialog } from "../../../components/ComponentPropertyDialog";
import type { CCComponentId } from "../../../store/component";
import { useStore } from "../../../store/react";
import CCComponentEditorContextMenu from "./components/ContextMenu";
import CCComponentEditorFrameControl from "./components/FrameControl";
import CCComponentEditorGrid from "./components/Grid";
import { CCComponentEditorNodePinPropertyEditor } from "./components/NodePinPropertyEditor";
import CCComponentEditorTitleBar from "./components/TitleBar";
import CCComponentEditorViewModeSwitcher from "./components/ViewModeSwitcher";
import CCComponentEditorRenderer from "./renderer";
import { ComponentEditorStoreProvider } from "./store";

export type CCComponentEditorProps = {
	componentId: CCComponentId;
	onEditComponent: (componentId: CCComponentId) => void;
	onClose: () => void;
};

function CCComponentEditorContent({
	componentId,
	onEditComponent,
	onClose,
}: CCComponentEditorProps) {
	const { store } = useStore();
	const component = nullthrows(store.components.get(componentId));
	const [isComponentPropertyDialogOpen, setIsComponentPropertyDialogOpen] =
		useState(false);

	return (
		<Box
			sx={{
				position: "relative",
				overflow: "hidden",
				backgroundColor: theme.palette.editorBackground,
			}}
		>
			<CCComponentEditorGrid />
			<CCComponentEditorRenderer />
			<CCComponentEditorTitleBar
				onComponentPropertyDialogOpen={() =>
					setIsComponentPropertyDialogOpen(true)
				}
				onEditorClose={onClose}
			/>
			<CCComponentEditorViewModeSwitcher />
			<CCComponentEditorFrameControl />
			<CCComponentEditorContextMenu onEditComponent={onEditComponent} />
			<CCComponentEditorNodePinPropertyEditor />
			{isComponentPropertyDialogOpen && (
				<ComponentPropertyDialog
					defaultName={component.name}
					onAccept={(newName) => {
						store.components.update(componentId, { name: newName });
						setIsComponentPropertyDialogOpen(false);
					}}
					onCancel={() => {
						setIsComponentPropertyDialogOpen(false);
					}}
				/>
			)}
		</Box>
	);
}

export default function CCComponentEditor(props: CCComponentEditorProps) {
	const { componentId } = props;
	return (
		<ComponentEditorStoreProvider componentId={componentId}>
			<CCComponentEditorContent {...props} />
		</ComponentEditorStoreProvider>
	);
}
