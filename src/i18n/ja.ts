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
			DECOMPOSE: "何ビットもある値を、上の桁から順に分ける",
			AGGREGATE: "上のピンを上の桁として、値を1つにまとめる",
			FLIPFLOP: "1つ前のステップで受け取った値を出す（最初のステップでは 0）",
			CONST: "中に書いた値をいつも出す",
			BROADCAST: "1ビットの値を、同じ値が並んだ何ビットもの値に広げる",
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
	truthTable: {
		timeStep: "ステップ",
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
		digitsLegend: "表では、ON を 1、OFF を 0 と書いています。",
		check: "確かめる",
		checking: "確かめています…",
		passed: "クリア！どの入力の組み合わせでも正しく動きます。",
		passedSteps: (count) =>
			`クリア！${count} ステップ目まで、どのステップでも正しく動きます。`,
		next: "次の課題へ",
		backToStages: "課題の一覧へ",
		missingPin: (pinType, pinName) =>
			`${pinName} という名前の${pinType === "input" ? "入力" : "出力"}ピンが見つかりません。「この課題をやり直す」で最初の状態に戻せます。`,
		wrongBitWidth: (pinName, expected, actual) =>
			`${pinName} は ${expected}ビットのはずですが、${actual}ビットになっています。つないだ先を確かめてください。`,
		wrongOutput: (inputs, pinName, expected, actual) =>
			`${inputs.map(({ name, value }) => `${name} が ${value}`).join("、")} のとき、${pinName} は ${expected} になるはずが、${actual === null ? "値がありませんでした" : `${actual} でした`}。`,
		wrongOutputAtStep: (stepNumber, inputs, pinName, expected, actual) =>
			`${stepNumber} ステップ目${inputs.length > 0 ? `（${inputs.map(({ name, value }) => `${name} が ${value}`).join("、")}）` : ""}に、${pinName} が ${expected} のはずが${actual === null ? "、値がありませんでした" : ` ${actual} でした`}。`,
		checkFailed:
			"確かめる途中で問題が起きました。回路を少し変えてから、もう一度押してください。",
		simulationFailed: (detail) =>
			`回路をシミュレーションできませんでした。${detail}`,
		resetStage: "この課題をやり直す",
		resetStageDialog: {
			title: "この課題をやり直しますか？",
			body: "この課題の回路が最初の状態に戻ります。",
			confirm: "やり直す",
		},
		resetStageFailed: "課題をやり直せませんでした。",
		partTitles: { "senary-digit": "6進の1桁" },
		stageTexts: {
			and: {
				title: "両方のスイッチ",
				goal: "スイッチ A と B が両方 ON のときだけ、ランプ Out が ON になるようにしましょう。下の表のとおりに動けばクリアです。",
				steps: [
					"「部品」の一覧から部品を選び、右のエディタにドラッグして置きます。",
					"部品の端にある小さな四角を「ピン」といいます。左側のピンは ON か OFF を受け取る「入力」、右側のピンは ON か OFF を送り出す「出力」です。出力のピンと入力のピンのあいだをドラッグして、線でつなぎます。",
					"Out と、置いた部品の入力のピンがすべてつながると、右下の再生ボタンが押せるようになります。入力のピンが空いている部品が残っていると押せません。",
					"再生ボタンを押したら、スイッチ A と B をクリックして ON と OFF を切り替え、ランプ Out を見ます。回路を直すときは、同じ場所の鉛筆のボタンで編集に戻ります。",
					"表のとおりに動いたら、「確かめる」を押します。",
				],
			},
			"a-only": {
				title: "A だけのスイッチ",
				goal: "スイッチ A が ON で、B が OFF のときだけ、ランプ Out が ON になるようにしましょう。今度は、部品を1つ置くだけではできません。",
				steps: [],
			},
			xor: {
				title: "片方だけのスイッチ",
				goal: "スイッチ A と B のどちらか片方だけが ON のときに、ランプ Out が ON になるようにしましょう。両方 ON のときは OFF です。「A だけのスイッチ」を部品として使えます。",
				steps: [],
			},
			"half-adder": {
				title: "1桁の足し算",
				goal: "ここからは ON を 1、OFF を 0 と考え、表もそう書きます。すると、A＋B は 0、1、2 のどれかです。2進数では、0 と 1 だけで数を書きます。ふだんの数で 9＋1 が繰り上がって 10 になるように、2進数では 1＋1 が繰り上がって 10 になります。そのため、0、1、2 は2桁で 00、01、10 です。2進数の1桁を「ビット」といいます。左の桁（2の位）を C に、右の桁（1の位）を S に出しましょう。C を「桁上がり」、S を「和」といい、この回路を「半加算器」といいます。",
				steps: [],
			},
			"full-adder": {
				title: "桁上がりつきの足し算",
				goal: "A＋B＋Cin の答えを、2桁の2進数で C と S に出しましょう。Cin は、下の桁から来る桁上がりです。答えは 0 から 3 で、3 は2進数で 11 です。「1桁の足し算」を部品として使えます。1つで A と B を足し、もう1つでその S と Cin を足します。この回路を「全加算器」といいます。",
				steps: [],
			},
			"four-bit-adder": {
				title: "4桁の足し算",
				goal: "A と B は4桁の2進数です。A＋B を4桁で S に、5桁目（16の位）を C に出しましょう。A＋B が 16 以上なら、C は 1 です。表はその例です。",
				steps: [
					"「桁上がりつきの足し算」を4つ置きます。Decompose の右側のピンと Aggregate の左側のピンは、どちらも上から8の位・4の位・2の位・1の位です。",
					"桁ごとに、A につないだ上の Decompose と、B につないだ下の Decompose から、その桁のピンを1つの「桁上がりつきの足し算」の A と B につなぎます。その足し算の S は、Aggregate の同じ桁のピンにつなぎます。",
					"それぞれの桁の足し算の C を、1つ上の桁の足し算の Cin につなぎます。1の位の足し算の Cin には False を、8の位の足し算の C は右の出力 C につなぎます。",
					"再生中は、A と B の桁をクリックして 0 と 1 を切り替えられます。答えの S は、右上の Display に1文字で表示されます。その手前の 7seg が、2進数を数字の形に変えています。10 から 15 は1文字で書くために、A（10）、b（11）、C（12）、d（13）、E（14）、F（15）を使います。この書き方を16進数といいます。",
				],
			},
			counter: {
				title: "カウンタ",
				goal: "再生ボタンを押すと、下に数字と、その左右に矢印のボタンが出ます。この数字を「ステップ」といい、右の矢印を押すと次のステップに進みます。回路はステップごとに動きます。Count が 1 ステップごとに 1 ずつ増え、1111 の次は 0000 に戻るようにしましょう。0000 から 1111 は、16進数の 0 から F です。",
				steps: [
					"FlipFlop を置きます。FlipFlop は、1つ前のステップで受け取った値を出します。最初のステップでは 0 を出します。FlipFlop の出力を、Count と、右上の 7seg につなぎます。",
					"Const を置きます。Const は、中に書いた値をいつも出します。欄の 00000000 を 0001 に書きかえて、「適用」を押します（つなぐ先の B に合わせて、4ビットで書きます）。欄の下の「4 ビット」は、書いた値のビット数です。",
					"「4桁の足し算」を置き、FlipFlop の出力を A に、Const を B に、S を FlipFlop の入力につなぎます。こうすると、FlipFlop が出している数に 1 を足した数が、次のステップで FlipFlop から出てきます。C は使いません。",
					"再生ボタンを押し、右の矢印でステップを進めます。「自動」を押すと、1秒に1ステップずつひとりでに進みます。右上の Display に 0 から F が順に出れば、うまく動いています。",
				],
			},
			"decimal-digit": {
				title: "10進の1桁",
				goal: "ふだんの数のように、0 から 9 までを使い、9 の次で桁が上がる書き方を10進数といいます。Up が ON のステップだけ Count が 1 増え、1001 の次は 0000 に戻るようにしましょう。1001 は、8 と 1 を足した 9 です。Count が 1001 で Up が ON のステップでは、Carry が ON になるようにします。Carry は、上の桁に桁上がりを知らせる合図です。「確かめる」を押すと、Up を 1〜9 ステップ目は ON、10・11 ステップ目は OFF、12 ステップ目からはまた ON にして調べます。",
				steps: [
					"左の Const・Broadcast・And は、Up が ON のときは 0001 を、OFF のときは 0000 を「4桁の足し算」の B に送っています。Broadcast は、1ビットの値を、同じ値が並んだ何ビットもの値に広げます（ON なら 1111、OFF なら 0000）。And に何ビットもの値をつなぐと、ビットごとに、両方が 1 のビットだけ 1 になります。",
					"Carry を作ります。0000 から 1001 のうち、8の位と1の位がどちらも 1 なのは 1001 だけです。一番下の Decompose の右側の、一番上（8の位）と一番下（1の位）のピンを And でまとめ、その出力と Up をもう1つの And でまとめて、Carry につなぎます。",
					"Broadcast を置き、右側のピンをクリックします。出てきた欄はビット幅、つまり出力のビット数です。1 を 4 に書きかえて「適用」を押すと、出力が4ビットになります。線をつなぐ前にしておきます。",
					"Carry が ON のときに 0000 に戻す部分を作ります。S はまだ FlipFlop につながっていません。Carry につないだ And の出力を Not にもつないで反対にし、その Broadcast で4ビットに広げ、S と And でまとめて、FlipFlop の入力につなぎます。",
					"再生中は、Up をクリックして ON と OFF を切り替えながら、右の矢印でステップを進めます。Up が ON のときだけ Display の数が進み、9 の次に 0 に戻れば、うまく動いています。",
				],
			},
			stopwatch: {
				title: "ストップウォッチ",
				goal: "いよいよ、分と秒を 12:34 のように数えるストップウォッチです。Start が ON のステップごとに、1秒ずつ進めます。右上の Display には、左から分の10の位（M10）、分の1の位（M1）、コロン、秒の10の位（S10）、秒の1の位（S1）が出ます。M10 と S10 は 0 から 5 を、M1 と S1 は 0 から 9 を数えます。59:59 の次は 00:00 に戻ります。Display の左にある 7seg・Const・Decompose・Aggregate は、4つの数字とコロンを1つの Display に並べるためのものです。「確かめる」を押すと、Start を 3601 ステップ目までは ON、3602・3603 ステップ目は OFF、3604 ステップ目からはまた ON にして、3605 ステップ目まで調べます。",
				steps: [
					"「6進の1桁」を2つと、「10進の1桁」を2つ置きます。「6進の1桁」は「10進の1桁」と同じつくりで、0 から 5 を数え、5 の次で 0 に戻って上の桁が上がります。10進数が 9 の次で桁が上がるのと同じです。",
					"それぞれの部品の Count を、右の出力のどれか1つと、その桁の 7seg につなぎます。M10 と S10 には「6進の1桁」を、M1 と S1 には「10進の1桁」を使います。7seg は、上から M10・M1・S10・S1 用です。",
					"S1 につないだ部品の Up に Start をつなぎます。次に、S1 の部品の Carry を S10 の部品の Up に、S10 の Carry を M1 の Up に、M1 の Carry を M10 の Up につなぎます。こうすると、1つ下の桁が 0 に戻るときだけ、その上の桁が進みます。",
					"再生ボタンを押します。最初のステップで Start が OFF なら、クリックして ON にします。「自動」を押すと、1秒に1ステップずつ、Display が時計のように進みます。59:59 の次を見るには、「自動」を止めて下の数字をクリックし、3600 と入れて Enter キーを押します。そのステップまで一度に進んで 59:59 になり、右の矢印を押すと 00:00 に戻ります。",
				],
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
