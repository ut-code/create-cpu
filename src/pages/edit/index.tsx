import { Divider } from "@mui/material";
import { Navigate, useNavigate, useParams } from "react-router";
import type { CCComponentId } from "../../store/component";
import { useStore } from "../../store/react";
import CCComponentEditor from "./Editor";
import SidePanel from "./SidePanel";

export default function EditPage() {
	const { store } = useStore();
	const navigate = useNavigate();
	const editedComponentId = useParams<"componentId">()
		.componentId as CCComponentId;

	if (!store.components.get(editedComponentId))
		return <Navigate to="/" replace />;

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
				key={editedComponentId}
				componentId={editedComponentId}
				onEditComponent={(componentId) => {
					navigate(`/components/${componentId}`);
				}}
				onClose={() => {
					navigate("/");
				}}
			/>
		</div>
	);
}
