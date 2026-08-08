import { useMemo } from "react";
import type { CCIntrinsicComponentConstSpec } from "../../../../../../../store/intrinsics/types";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import { CCComponentEditorRendererNodeDefaultRenderer } from "../Default";
import { ccComponentEditorRendererNodeConstLayoutConstants as constants } from "./geometry";

export function CCComponentEditorRendererNodeConstRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const config = props.node.config as CCIntrinsicComponentConstSpec["config"];
	const sampleData = useMemo(
		() => Array.from({ length: config.data.length }, () => Math.random() < 0.5),
		[config.data],
	);

	return (
		<>
			<CCComponentEditorRendererNodeDefaultRenderer {...props} />
			<foreignObject
				x={constants.padding}
				y={constants.padding}
				width={props.geometry.rect.size.x - constants.padding * 2}
				height={props.geometry.rect.size.y - constants.padding * 2}
			>
				<table>
					<tbody>
						{Array(Math.ceil(config.data.length / 8))
							.fill(null)
							.map((_, rowIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: temporary workaround
								<tr key={rowIndex}>
									{Array(8)
										.fill(null)
										.map((_, colIndex) => {
											const index = rowIndex * 8 + colIndex;
											if (index >= config.data.length) return null;
											return (
												<td
													// biome-ignore lint/suspicious/noArrayIndexKey: temporary workaround
													key={colIndex}
													style={{
														width: constants.gridSize,
														height: constants.gridSize,
														backgroundColor: sampleData[index]
															? "black"
															: "white",
														border: "1px solid black",
													}}
												/>
											);
										})}
								</tr>
							))}
					</tbody>
				</table>
			</foreignObject>
		</>
	);
}
