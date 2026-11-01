import clsx from "clsx";
import {
	type SimulationValue,
	wrappingIncrementSimulationValue,
} from "../../../../../../../../store/simulation";
import { stringifySimulationValue } from "../../../../../store/slices/core";
import styles from "./style.module.css";

/** Values up to this bit width are shown bit by bit */
const maxBitWidthToShowBits = 8;
/** Values up to this bit width are shown with wider bits */
const maxBitWidthToShowWideBits = 4;

type Props = {
	value: SimulationValue;
	/** `null` if the value is read-only */
	onChange: ((value: SimulationValue) => void) | null;
};

export function CCComponentEditorRendererNodeInterfaceRendererValue({
	value,
	onChange,
}: Props) {
	if (value.length > maxBitWidthToShowBits) {
		const label = stringifySimulationValue(value);
		return onChange ? (
			<button
				type="button"
				className={styles.text}
				onPointerDown={(e) => e.stopPropagation()}
				onClick={() => onChange(wrappingIncrementSimulationValue(value))}
			>
				{label}
			</button>
		) : (
			<span className={styles.text}>{label}</span>
		);
	}

	const isSingleBit = value.length === 1;
	return (
		<span
			className={clsx(
				styles.bits,
				isSingleBit
					? styles.single
					: value.length <= maxBitWidthToShowWideBits && styles.wide,
			)}
		>
			{value.map((bit, index) => {
				const className = clsx(styles.bit, bit && styles.on);
				const label = isSingleBit ? (bit ? "ON" : "OFF") : bit ? "1" : "0";
				return onChange ? (
					<button
						// biome-ignore lint/suspicious/noArrayIndexKey: bits are identified by their index
						key={index}
						type="button"
						className={className}
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => onChange(value.with(index, !bit))}
					>
						{label}
					</button>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: bits are identified by their index
					<span key={index} className={className}>
						{label}
					</span>
				);
			})}
		</span>
	);
}
