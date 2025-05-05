import { Button, Popover, Stack, TextField, Typography } from "@mui/material";
import { zip } from "lodash-es";
import nullthrows from "nullthrows";
import { useState } from "react";
import invariant from "tiny-invariant";
import { rect } from "../../../../common/rect";
import { IntrinsicComponentDefinition } from "../../../../store/intrinsics/base";
import { CCNodePinStore } from "../../../../store/nodePin";
import { useStore } from "../../../../store/react";
import getCCComponentEditorRendererNodeGeometry from "../renderer/Node.geometry";
import { useComponentEditorStore } from "../store";

export function CCComponentEditorNodePinPropertyEditor() {
	const { store } = useStore();
	const componentEditorStore = useComponentEditorStore();
	const target = componentEditorStore((s) => s.nodePinPropertyEditorTarget);
	const setTarget = componentEditorStore(
		(s) => s.setNodePinPropertyEditorTarget,
	);
	const [newBitWidthList, setNewBitWidthList] = useState<number[] | null>(null); // null means no change
	if (!target) return null;

	const componentPin = nullthrows(
		store.componentPins.get(target.componentPinId),
	);
	const component = nullthrows(store.components.get(componentPin.componentId));
	const nodePins = store.nodePins
		.getManyByNodeIdAndComponentPinId(target.nodeId, target.componentPinId)
		.toSorted((a, b) => a.order - b.order);
	invariant(
		nodePins.every((p) => p.userSpecifiedBitWidth !== null),
		"NodePinPropertyEditor can only be used for node pins with user specified bit width",
	);
	const componentPinAttributes = nullthrows(
		IntrinsicComponentDefinition.intrinsicComponentPinAttributesByComponentPinId.get(
			target.componentPinId,
		),
		"NodePinPropertyEditor can only be used for intrinsic component pins",
	);

	const getBoundingClientRect = (): DOMRect => {
		const geometry = getCCComponentEditorRendererNodeGeometry(
			store,
			target.nodeId,
		);
		const nodePinCanvasPositions = nodePins.map((nodePin) =>
			componentEditorStore
				.getState()
				.fromStageToCanvas(
					nullthrows(geometry.nodePinPositionById.get(nodePin.id)),
				),
		);
		const bounds = rect.shift(
			rect.bounds(nodePinCanvasPositions),
			componentEditorStore.getState().getRendererPosition(),
		);
		return new DOMRect(
			bounds.position.x,
			bounds.position.y,
			bounds.size.x,
			bounds.size.y,
		);
	};

	const bitWidthList =
		newBitWidthList ??
		nodePins.map((nodePin) => nullthrows(nodePin.userSpecifiedBitWidth));

	const isTouched = Boolean(newBitWidthList);
	const isValid = bitWidthList.every((bitWidth) => bitWidth > 0);

	const onClose = () => {
		setTarget(null);
		setNewBitWidthList(null);
	};

	return (
		<Popover
			open
			anchorEl={{ nodeType: 1, getBoundingClientRect }}
			transformOrigin={{
				vertical: "center",
				horizontal: componentPin.type === "input" ? "right" : "left",
			}}
			slotProps={{ paper: { sx: { p: 2, width: 250 } } }}
			onClose={onClose}
		>
			<Typography variant="h6">
				{componentPin.name} ({component.name})
			</Typography>
			<Typography variant="caption" color="text.secondary">
				Specify the bit width to assign to the pin.
			</Typography>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					let maxOrder = 0;
					for (const [nodePin, bitWidth] of zip(nodePins, bitWidthList)) {
						// Create new NodePin
						if (!nodePin && bitWidth) {
							store.nodePins.register(
								CCNodePinStore.create({
									componentPinId: target.componentPinId,
									nodeId: target.nodeId,
									order: ++maxOrder,
									userSpecifiedBitWidth: bitWidth,
								}),
							);
							continue;
						}
						// Delete old NodePin
						if (nodePin && !bitWidth) {
							store.nodePins.unregister(nodePin.id);
							continue;
						}
						// Update NodePin
						if (nodePin && bitWidth) {
							maxOrder = nodePin.order; // nodePins are sorted by order
							if (nodePin.userSpecifiedBitWidth !== bitWidth)
								store.nodePins.update(nodePin.id, {
									userSpecifiedBitWidth: bitWidth,
								});
							continue;
						}
						throw new Error("Unreachable");
					}
					onClose();
				}}
			>
				<Stack gap={0.5} sx={{ mt: 1 }}>
					{bitWidthList.map((bitWidth, index) => {
						return (
							<TextField
								// biome-ignore lint/suspicious/noArrayIndexKey: bitWidth is only identified by index in this component
								key={index}
								type="number"
								value={bitWidth || ""}
								slotProps={{ htmlInput: { min: 1 } }}
								onChange={(e) => {
									const newValue = Number.parseInt(e.target.value, 10);
									if (newValue >= 0 || e.target.value === "")
										setNewBitWidthList(bitWidthList.with(index, newValue || 0));
								}}
								error={bitWidth <= 0}
								size="small"
							/>
						);
					})}
				</Stack>
				<Stack direction="row" gap={1} sx={{ mt: 1 }}>
					{componentPinAttributes.isSplittable && (
						<>
							<Button
								type="button"
								variant="outlined"
								size="small"
								onClick={() => {
									setNewBitWidthList([...bitWidthList, 1]);
								}}
							>
								Add
							</Button>
							<Button
								type="button"
								variant="outlined"
								size="small"
								disabled={bitWidthList.length <= 1}
								onClick={() => {
									setNewBitWidthList(bitWidthList.slice(0, -1));
								}}
							>
								Remove
							</Button>
						</>
					)}
					<Button
						type="submit"
						variant="contained"
						size="small"
						sx={{ ml: "auto" }}
						disabled={!isTouched || !isValid}
					>
						Apply
					</Button>
				</Stack>
			</form>
		</Popover>
	);
}
