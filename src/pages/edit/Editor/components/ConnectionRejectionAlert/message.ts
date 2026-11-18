import type { CCConnectionRejection } from "../../../../../store/nodePin";

export function describeConnectionRejection(
	rejection: CCConnectionRejection,
): string {
	switch (rejection.type) {
		case "sameDirection":
			return "入力ピン同士、出力ピン同士はつなげません";
		case "sameNode":
			return "同じノードのピン同士はつなげません";
		case "differentParentComponent":
			return "別のコンポーネントのピンとはつなげません";
		case "inputAlreadyConnected":
			return "この入力ピンにはすでに線がつながっています";
		case "bitWidthConflict": {
			const [a, b] = rejection.bitWidths.map(
				(bitWidths) => `${bitWidths.join("/")} bit`,
			);
			const isInConflictAlready = rejection.bitWidths.some(
				(bitWidths) => bitWidths.length > 1,
			);
			return isInConflictAlready
				? `ビット幅がすでに食い違っている線にはつなげません（${a} と ${b}）`
				: `ビット幅が合いません（${a} と ${b}）`;
		}
	}
}
