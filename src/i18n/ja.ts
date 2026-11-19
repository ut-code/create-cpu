import type { Messages } from "./en";

const bitWidths = (widths: readonly number[]) => `${widths.join("/")} ビット`;
const fixOrFeedBack =
	"線をつなぎ直すか、値をフィードバックさせたい場合はループに FlipFlop を入れてください。";

export const ja: Messages = {
	languageName: "日本語",
	common: {
		components: "コンポーネント",
		newComponentName: "新しいコンポーネント",
		cancel: "キャンセル",
		apply: "適用",
		delete: "削除",
	},
	parts: {
		summaries: {
			AND: "両方が ON のときだけ ON",
			OR: "少なくとも一方が ON なら ON",
			NOT: "ON と OFF を逆にする",
			XOR: "片方だけが ON のとき ON",
			TRUE: "いつも ON",
			FALSE: "いつも OFF",
		},
		about: (name) => `${name} について`,
		ofStage: "使える部品",
	},
	header: {
		language: "言語",
		modes: {
			free: "自由に作る",
			tutorial: "チュートリアル",
		},
	},
	start: {
		title: "何をしますか？",
		tutorial: "2つのスイッチから始めて、課題に沿って論理回路を組み立てます。",
		free: "好きな回路を自由に作ります。",
	},
	home: {
		file: "ファイル",
		export: "エクスポート",
		import: "インポート",
		reset: "リセット",
		selectToEdit: "編集するコンポーネントを選んでください。",
		create: "作成",
		nodeCount: (count) => `${count} 個のノード`,
		componentMenu: "コンポーネントのメニュー",
		resetDialog: {
			title: "すべてのコンポーネントをリセットしますか？",
			body: "すべてのコンポーネントがサンプルに置き換わります。元に戻せないので、残したい場合は先にエクスポートしてください。",
		},
		importDialog: {
			title: (fileName) => `${fileName} をインポートしますか？`,
			body: "今あるすべてのコンポーネントが、ファイルの中のものに置き換わります。元に戻せないので、残したい場合は先にエクスポートしてください。",
		},
		deleteDialog: {
			title: (componentName) => `${componentName} を削除しますか？`,
			unused: "元に戻せません。",
			used: (count, places, otherCount) =>
				`${places.join("、")}${otherCount > 0 ? ` ほか ${otherCount} 個のコンポーネントで` : " で"} ${count} か所使われています。削除すると、それらのノードと、つながっている線も消えます。元に戻せません。`,
		},
		errors: {
			read: (fileName) => `${fileName} を読み込めませんでした。`,
			notImportable: (fileName) =>
				`${fileName} をインポートできません。このアプリからエクスポートしたファイルではないか、壊れています。`,
			storageFull:
				"ブラウザの保存領域がいっぱいのため、何も置き換えませんでした。",
			importFailed: (fileName) => `${fileName} をインポートできませんでした。`,
			resetFailed: "リセットできませんでした。",
			deleteFailed: (componentName) =>
				`${componentName} を削除できませんでした。`,
		},
	},
	recovery: {
		title: "保存したコンポーネントを読み込めませんでした",
		body: "このブラウザに保存されたコンポーネントが壊れているか、このバージョンでは読めない形式で保存されています。やり直すまでは上書きしないので、残したい場合は先にダウンロードしてください。",
		download: "保存データをダウンロード",
		startOver: "サンプルからやり直す",
		startOverDialog: {
			title: "サンプルからやり直しますか？",
			body: "保存したコンポーネントはサンプルに置き換わり、元に戻せません。残したい場合は先にダウンロードしてください。",
			confirm: "やり直す",
		},
		errors: {
			storageFull:
				"ブラウザの保存領域がいっぱいのため、サンプルを保存できませんでした。",
			startOverFailed: "やり直せませんでした。",
		},
	},
	tutorial: {
		lead: "上から順に進めるのがおすすめですが、どの課題からでも始められます。",
		stageNumber: (number) => `課題 ${number}`,
		cleared: "クリア",
		startOver: "最初からやり直す",
		startOverDialog: {
			title: "チュートリアルを最初からやり直しますか？",
			body: "すべての課題が最初の状態に戻り、クリアした記録も消えます。",
			confirm: "やり直す",
		},
		startOverFailed: "チュートリアルをやり直せませんでした。",
		stages: "課題の一覧",
		parts: "部品",
		goalHeading: "目標",
		stepsHeading: "手順",
		check: "確かめる",
		passed: "クリア！どの入力の組み合わせでも正しく動きます。",
		next: "次の課題へ",
		backToStages: "課題の一覧へ",
		missingPin: (pinType, pinName) =>
			`${pinName} という名前の${pinType === "input" ? "入力" : "出力"}ピンが見つかりません。「この課題をやり直す」で最初の状態に戻せます。`,
		wrongOutput: (inputs, pinName, expected, actual) =>
			`${inputs.map(({ name, value }) => `${name} が ${value}`).join("、")} のとき、${pinName} は ${expected} になるはずが、${actual === null ? "値がありませんでした" : `${actual} でした`}。`,
		simulationFailed: (detail) =>
			`回路をシミュレーションできませんでした。${detail}`,
		resetStage: "この課題をやり直す",
		resetStageDialog: {
			title: "この課題をやり直しますか？",
			body: "この課題の回路が最初の状態に戻ります。",
			confirm: "やり直す",
		},
		resetStageFailed: "課題をやり直せませんでした。",
		stageTexts: {
			and: {
				title: "両方のスイッチ",
				goal: "スイッチ A と B が両方 ON のときだけ、ランプ Out がつくようにしましょう。下の表のとおりに動けばクリアです。",
				steps: [
					"「部品」の一覧から部品を選び、右のエディタにドラッグして置きます。",
					"部品の端にある小さな四角を「ピン」といいます。左側のピンは ON か OFF を受け取る「入力」、右側のピンは ON か OFF を送り出す「出力」です。出力のピンと入力のピンのあいだをドラッグして、線でつなぎます。",
					"Out と、置いた部品の左側のピンがすべてつながると、右下の再生ボタンが押せるようになります。左側のピンが空いている部品が残っていると押せません。",
					"再生ボタンを押したら、スイッチ A と B をクリックして ON と OFF を切り替え、ランプ Out を見ます。回路を直すときは、同じ場所の鉛筆のボタンで編集に戻ります。",
					"表のとおりに動いたら、「確かめる」を押します。",
				],
			},
			"a-only": {
				title: "A だけのスイッチ",
				goal: "スイッチ A が ON で、B が OFF のときだけ、ランプ Out がつくようにしましょう。今度は、部品を1つ置くだけではできません。",
				steps: [],
			},
			xor: {
				title: "片方だけのスイッチ",
				goal: "スイッチ A と B のどちらか片方だけが ON のときに、ランプ Out がつくようにしましょう。両方 ON のときはつきません。「A だけのスイッチ」を部品として使えます。",
				steps: [],
			},
		},
	},
	componentProperties: {
		title: (componentName) => `${componentName} のプロパティ`,
		name: "名前",
		inputPins: "入力ピン",
		outputPins: "出力ピン",
	},
	sidePanel: {
		component: "コンポーネント",
		search: "コンポーネントを検索",
	},
	editor: {
		contextMenu: {
			createComponent: "新しいコンポーネントにまとめる...",
			edit: "編集...",
			cannotDelete: (names) => `${names.join("、")} は課題で使うので消せません`,
			keptOnDelete: (names) => `${names.join("、")} は課題で使うので残ります`,
		},
		frameControl: {
			auto: "自動",
			autoPlay: "自動再生",
			previousStep: "前のステップ",
			timeStep: "タイムステップ",
			nextStep: "次のステップ",
			clockFrequency: "クロック周波数（Hz）",
			speedRange: (min, max) => `${min}〜${max} を入力`,
		},
		nodePinBitWidth: {
			description: "ピンに割り当てるビット幅を指定してください。",
			add: "追加",
			remove: "削除",
		},
		renamePin: "ピンの名前を変更",
		editProperties: "プロパティを編集",
		close: "閉じる",
		editValue: "値を編集",
		displaySettings: "Display の設定",
		resolution: "解像度",
		sevenSegmentSettings: "7seg の設定",
		pixelOrder: "ピクセルの並び順",
		rowMajor: "行優先",
		columnMajor: "列優先",
		valueEditor: {
			bits: (count) => `${count} ビット`,
			empty: "値を入力してください",
			invalid: (mode) =>
				`${mode === "binary" ? "2進数" : "16進数"}の値として正しくありません`,
			tooWide: (required, width) =>
				`${required} ビット必要ですが、ビット幅は ${width} です`,
		},
		connectionRejection: {
			sameDirection: "入力ピン同士、出力ピン同士はつなげません",
			sameNode: "同じノードのピン同士はつなげません",
			differentParentComponent:
				"別のコンポーネントに置かれたピン同士はつなげません",
			inputAlreadyConnected: "この入力ピンにはすでに線がつながっています",
			bitWidthConflict: (a, b) =>
				`ビット幅が合いません（${bitWidths(a)} と ${bitWidths(b)}）`,
			bitWidthConflictAlready: (a, b) =>
				`ビット幅がすでに食い違っている線にはつなげません（${bitWidths(a)} と ${bitWidths(b)}）`,
		},
		inputValueReset: (inputs) =>
			`ビット幅に収まらなくなった入力値を 0 にリセットしました：${inputs
				.map(({ name, bitWidth }) => `${name}（${bitWidths([bitWidth])}）`)
				.join("、")}`,
	},
	simulation: {
		nodeName: (outerToInner) => outerToInner.join(" 内の "),
		sentences: (sentences) => sentences.join(""),
		loop: `赤い枠のノードがループになっていて、値が決まりません。ループの${fixOrFeedBack}`,
		loopInside: (place, component) =>
			`${place} の中にループがあり、値が決まりません。${component} を開いて${fixOrFeedBack}`,
		unconnectedPin: (pin, node) =>
			`${node} の入力ピン ${pin} がつながっていません。`,
		unconnectedNode: (node) => `${node} がつながっていません。`,
		openToConnect: (component) => `${component} を開いてつないでください。`,
		bitWidthConflict: (component) =>
			`${component} の中で、つながったピンのビット幅が合っていません。赤い点線を直してください。`,
		bitWidthConflictInside: (component) =>
			`${component} の中で、つながったピンのビット幅が合っていません。${component} を開いて、赤い点線を直してください。`,
	},
};
