import type { CCComponentId } from "../store/component";

export const componentIdMimeType = "application/x.create-cpu.component";

export function setDataTransferAsComponent(
	dataTransfer: DataTransfer,
	componentId: CCComponentId,
): void {
	dataTransfer.setData(componentIdMimeType, componentId);
}

export function parseDataTransferAsComponent(
	dataTransfer: DataTransfer,
): CCComponentId | null {
	const id = dataTransfer.getData(componentIdMimeType);
	if (!id) return null;
	return id as CCComponentId;
}
