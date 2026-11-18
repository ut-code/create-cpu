import { Box } from "@mui/material";
import { useState } from "react";
import { ComponentPropertyDialog } from "../../../components/ComponentPropertyDialog";
import type { CCComponentId } from "../../../store/component";
import { theme } from "../../../style";
import CCComponentEditorContextMenu from "./components/ContextMenu";
import CCComponentEditorFrameControl from "./components/FrameControl";
import CCComponentEditorGrid from "./components/Grid";
import { CCComponentEditorNodePinPropertyEditor } from "./components/NodePinPropertyEditor";
import CCComponentEditorNotifications from "./components/Notifications";
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
	const [propertyDialogComponentId, setPropertyDialogComponentId] =
		useState<CCComponentId | null>(null);

	return (
		<Box
			sx={{
				position: "relative",
				overflow: "hidden",
				backgroundColor: theme.colors.editorBackground,
			}}
		>
			<CCComponentEditorGrid />
			<CCComponentEditorRenderer />
			<CCComponentEditorTitleBar
				onComponentPropertyDialogOpen={() =>
					setPropertyDialogComponentId(componentId)
				}
				onEditorClose={onClose}
			/>
			<CCComponentEditorViewModeSwitcher />
			<CCComponentEditorFrameControl />
			<CCComponentEditorContextMenu
				onEditComponent={onEditComponent}
				onComponentCreated={setPropertyDialogComponentId}
			/>
			<CCComponentEditorNodePinPropertyEditor />
			<CCComponentEditorNotifications />
			{propertyDialogComponentId && (
				<ComponentPropertyDialog
					componentId={propertyDialogComponentId}
					onClose={() => setPropertyDialogComponentId(null)}
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
