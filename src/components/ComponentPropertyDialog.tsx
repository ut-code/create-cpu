import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormLabel,
	Stack,
	TextField,
} from "@mui/material";
import nullthrows from "nullthrows";
import { useState } from "react";
import { z } from "zod";
import { useMessages } from "../i18n";
import type CCStore from "../store";
import type { CCComponentId } from "../store/component";
import type { CCComponentPin, CCComponentPinId } from "../store/componentPin";
import type { CCNodeId } from "../store/node";
import { useStore } from "../store/react";

export type ComponentPropertyDialogProps = {
	componentId: CCComponentId;
	isProtectedNode: (nodeId: CCNodeId) => boolean;
	onClose(): void;
};

const stateSchema = z.object({
	name: z.string().nonempty(),
	pinNameById: z.map(z.custom<CCComponentPinId>(), z.string().nonempty()),
});
function extractStateFromStore(
	store: CCStore,
	componentId: CCComponentId,
): z.input<typeof stateSchema> {
	const component = nullthrows(store.components.get(componentId));
	return {
		name: component.name,
		pinNameById: new Map(
			store.componentPins
				.getManyByComponentId(componentId)
				.map((pin) => [pin.id, pin.name]),
		),
	};
}
function applyStateToStore(
	store: CCStore,
	componentId: CCComponentId,
	state: z.output<typeof stateSchema>,
) {
	store.components.update(componentId, { name: state.name });
	for (const [pinId, pinName] of state.pinNameById) {
		store.componentPins.update(pinId, { name: pinName });
	}
}

export function ComponentPropertyDialog({
	componentId,
	isProtectedNode,
	onClose,
}: ComponentPropertyDialogProps) {
	const { store } = useStore();
	const messages = useMessages();
	const component = nullthrows(store.components.get(componentId));
	const [state, setState] = useState(() =>
		extractStateFromStore(store, componentId),
	);
	const result = stateSchema.safeParse(state);
	const isPinProtected = (pin: CCComponentPin) => {
		const nodePin =
			pin.implementation && store.nodePins.get(pin.implementation);
		return !!nodePin && isProtectedNode(nodePin.nodeId);
	};

	return (
		<Dialog maxWidth="sm" fullWidth open onClose={onClose}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (!result.success) return;
					applyStateToStore(store, componentId, result.data);
					onClose();
				}}
			>
				<DialogTitle>
					{messages.componentProperties.title(component.name)}
				</DialogTitle>
				<DialogContent>
					<FormLabel component="div">
						{messages.componentProperties.name}
					</FormLabel>
					<TextField
						size="small"
						value={state.name}
						fullWidth
						onChange={(e) => setState({ ...state, name: e.target.value })}
						placeholder={messages.componentProperties.name}
						sx={{ mt: 0.5 }}
					/>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 2,
							mt: 2,
						}}
					>
						<Stack sx={{ gap: 0.5 }}>
							<FormLabel component="div">
								{messages.componentProperties.inputPins}
							</FormLabel>
							{store.componentPins
								.getManyByComponentId(componentId)
								.filter((pin) => pin.type === "input")
								.map((pin) => (
									<TextField
										key={pin.id}
										size="small"
										value={state.pinNameById.get(pin.id)}
										fullWidth
										disabled={isPinProtected(pin)}
										onChange={(e) =>
											setState({
												...state,
												pinNameById: new Map(state.pinNameById).set(
													pin.id,
													e.target.value,
												),
											})
										}
									/>
								))}
						</Stack>
						<Stack sx={{ gap: 0.5 }}>
							<FormLabel component="div">
								{messages.componentProperties.outputPins}
							</FormLabel>
							{store.componentPins
								.getManyByComponentId(componentId)
								.filter((pin) => pin.type === "output")
								.map((pin) => (
									<TextField
										key={pin.id}
										size="small"
										value={state.pinNameById.get(pin.id)}
										fullWidth
										disabled={isPinProtected(pin)}
										onChange={(e) =>
											setState({
												...state,
												pinNameById: new Map(state.pinNameById).set(
													pin.id,
													e.target.value,
												),
											})
										}
									/>
								))}
						</Stack>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose} color="inherit">
						{messages.common.cancel}
					</Button>
					<Button
						variant="outlined"
						color="primary"
						type="submit"
						disabled={!result.success}
					>
						{messages.common.apply}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
}
