import { Divider } from "@mui/material";
import type { CCComponentId } from "../../store/component";
import CCComponentEditor from "./Editor";
import SidePanel from "./SidePanel";

export type EditPageProps = {
	editedComponentId: CCComponentId;
	onEditOtherComponent: (componentId: CCComponentId) => void;
	onClose: () => void;
};

export default function EditPage({
	editedComponentId,
	onEditOtherComponent,
	onClose,
}: EditPageProps) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "200px max-content 1fr",
			}}
		>
			<SidePanel editedComponentId={editedComponentId} />
			<Divider orientation="vertical" />
			<CCComponentEditor
				componentId={editedComponentId}
				onEditComponent={onEditOtherComponent}
				onClose={onClose}
			/>
		</div>
	);
}
