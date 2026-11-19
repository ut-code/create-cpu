import { Box, Stack } from "@mui/material";
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
import {
	ComponentEditorStoreProvider,
	type EditorStoreOptions,
	useComponentEditorStore,
} from "./store";

export type CCComponentEditorProps = {
	componentId: CCComponentId;
	options?: EditorStoreOptions;
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
	const isProtectedNode = useComponentEditorStore()(
		(state) => state.isProtectedNode,
	);

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
			<Stack
				spacing={1}
				sx={{
					position: "absolute",
					bottom: "40px",
					left: "16px",
					right: "112px",
					pointerEvents: "none",
					isolation: "isolate",
				}}
			>
				<CCComponentEditorNotifications />
				<CCComponentEditorFrameControl />
			</Stack>
			<CCComponentEditorContextMenu
				onEditComponent={onEditComponent}
				onComponentCreated={setPropertyDialogComponentId}
			/>
			<CCComponentEditorNodePinPropertyEditor />
			{propertyDialogComponentId && (
				<ComponentPropertyDialog
					componentId={propertyDialogComponentId}
					isProtectedNode={isProtectedNode}
					onClose={() => setPropertyDialogComponentId(null)}
				/>
			)}
		</Box>
	);
}

export default function CCComponentEditor(props: CCComponentEditorProps) {
	const { componentId, options = {} } = props;
	return (
		<ComponentEditorStoreProvider componentId={componentId} options={options}>
			<CCComponentEditorContent {...props} />
		</ComponentEditorStoreProvider>
	);
}
