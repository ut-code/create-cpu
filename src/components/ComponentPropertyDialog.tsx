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
import type CCStore from "../store";
import type { CCComponentId } from "../store/component";
import type { CCComponentPinId } from "../store/componentPin";
import { useStore } from "../store/react";

export type ComponentPropertyDialogProps = {
	componentId: CCComponentId;
	defaultName: string;
	onClose(): void;
	onCancel(): void;
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
	onClose,
}: ComponentPropertyDialogProps) {
	const { store } = useStore();
	const component = nullthrows(store.components.get(componentId));
	const [state, setState] = useState(() =>
		extractStateFromStore(store, componentId),
	);
	const result = stateSchema.safeParse(state);

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
				<DialogTitle>{component.name} Properties</DialogTitle>
				<DialogContent>
					<FormLabel component="div">Name</FormLabel>
					<TextField
						size="small"
						value={state.name}
						fullWidth
						onChange={(e) => setState({ ...state, name: e.target.value })}
						placeholder="Name"
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
							<FormLabel component="div">Input Pins</FormLabel>
							{store.componentPins
								.getManyByComponentId(componentId)
								.filter((pin) => pin.type === "input")
								.map((pin) => (
									<TextField
										key={pin.id}
										size="small"
										value={state.pinNameById.get(pin.id)}
										fullWidth
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
							<FormLabel component="div">Output Pins</FormLabel>
							{store.componentPins
								.getManyByComponentId(componentId)
								.filter((pin) => pin.type === "output")
								.map((pin) => (
									<TextField
										key={pin.id}
										size="small"
										value={state.pinNameById.get(pin.id)}
										fullWidth
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
						Cancel
					</Button>
					<Button
						variant="outlined"
						color="primary"
						type="submit"
						disabled={!result.success}
					>
						Apply
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
}
