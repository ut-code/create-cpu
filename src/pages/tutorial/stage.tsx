import { ArrowBack } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Divider,
	Link,
	Stack,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
	Navigate,
	Link as RouterLink,
	useNavigate,
	useParams,
} from "react-router";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { type Messages, useMessages } from "../../i18n";
import type CCStore from "../../store";
import { SimulationNodeError } from "../../store/netlist";
import { StoreScope } from "../../store/react";
import type { SimulationValue } from "../../store/simulation";
import { theme } from "../../style";
import { type CheckResult, checkCombinational } from "../../tutorial/check";
import { markStageCleared } from "../../tutorial/progress";
import {
	getTutorialStageStore,
	resetTutorialStage,
} from "../../tutorial/stageStore";
import {
	findTutorialStage,
	isStagePart,
	isStagePinNode,
	type TutorialStage,
	tutorialStages,
} from "../../tutorial/stages";
import CCComponentEditor from "../edit/Editor";
import type { OffersComponent } from "../edit/placement";
import SidePanel from "../edit/SidePanel";

function formatValue(value: SimulationValue, texts: Messages["tutorial"]) {
	if (value.length === 1) return value[0] ? texts.on : texts.off;
	return value.map((bit) => (bit ? "1" : "0")).join("");
}

function describeFailure(
	result: Exclude<CheckResult, { type: "passed" }>,
	store: CCStore,
	messages: Messages,
): string {
	const texts = messages.tutorial;
	switch (result.type) {
		case "missingPin":
			return texts.missingPin(result.pinType, result.pinName);
		case "wrongOutput":
			return texts.wrongOutput(
				result.inputs.map(({ name, value }) => ({
					name,
					value: formatValue(value, texts),
				})),
				result.pinName,
				formatValue(result.expected, texts),
				result.actual ? formatValue(result.actual, texts) : null,
			);
		case "simulationFailed":
			return texts.simulationFailed(
				result.error instanceof SimulationNodeError
					? result.error.describe(store, messages.simulation)
					: result.error instanceof Error
						? result.error.message
						: String(result.error),
			);
	}
}

function StageView({ stage }: { stage: TutorialStage }) {
	const messages = useMessages();
	const texts = messages.tutorial;
	const navigate = useNavigate();
	const stageIndex = tutorialStages.indexOf(stage);
	const nextStage = tutorialStages[stageIndex + 1];
	const componentName = texts.stageTexts[stage.id].title;

	const [store, setStore] = useState(() =>
		getTutorialStageStore(stage, componentName),
	);
	const [editedComponentId, setEditedComponentId] = useState(stage.componentId);
	const [result, setResult] = useState<CheckResult | null>(null);
	const [isConfirmingReset, setIsConfirmingReset] = useState(false);
	const [hasResetFailed, setHasResetFailed] = useState(false);
	// The editor keeps state of the store it was made with, so it starts anew on a reset
	const [resetCount, setResetCount] = useState(0);

	// A result about a circuit that has since changed would mislead
	useEffect(() => {
		const clearResult = () => setResult(null);
		const unsubscribe = store.subscribeToCircuitChanges(clearResult);
		store.componentPins.on("didUpdate", clearResult);
		return () => {
			unsubscribe();
			store.componentPins.off("didUpdate", clearResult);
		};
	}, [store]);

	const check = () => {
		const checked = checkCombinational(store, stage.componentId, stage.check);
		setResult(checked);
		if (checked.type === "passed") markStageCleared(stage.id);
	};

	const resetStage = () => {
		setIsConfirmingReset(false);
		try {
			setStore(resetTutorialStage(stage, componentName));
			setResetCount((count) => count + 1);
			setEditedComponentId(stage.componentId);
			setResult(null);
			setHasResetFailed(false);
		} catch (error) {
			console.error(error);
			setHasResetFailed(true);
		}
	};

	const isOffered: OffersComponent = (component, componentId) =>
		isStagePart(stage, component, componentId);

	const shownComponentId = store.components.get(editedComponentId)
		? editedComponentId
		: stage.componentId;

	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "300px max-content 200px max-content 1fr",
				minHeight: 0,
			}}
		>
			<Stack spacing={2} sx={{ p: 2, overflowY: "auto" }}>
				<Link
					component={RouterLink}
					to="/tutorial"
					underline="hover"
					sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
				>
					<ArrowBack fontSize="small" />
					{texts.stages}
				</Link>
				<div>
					<Typography color="textSecondary" variant="body2">
						{texts.stageNumber(stageIndex + 1)}
					</Typography>
					<Typography variant="h2" typography="h5">
						{texts.stageTexts[stage.id].title}
					</Typography>
				</div>
				<Typography>{texts.stageTexts[stage.id].goal}</Typography>
				<Button
					variant="contained"
					onClick={check}
					sx={{ background: theme.colors.tutorial }}
				>
					{texts.check}
				</Button>
				{result?.type === "passed" && (
					<>
						<Alert severity="success">{texts.passed}</Alert>
						<Button
							variant="outlined"
							component={RouterLink}
							to={nextStage ? `/tutorial/${nextStage.id}` : "/tutorial"}
						>
							{nextStage ? texts.next : texts.backToStages}
						</Button>
					</>
				)}
				{result && result.type !== "passed" && (
					<Alert severity="error">
						{describeFailure(result, store, messages)}
					</Alert>
				)}
				<Box sx={{ flexGrow: 1 }} />
				{hasResetFailed && (
					<Alert severity="error">{texts.resetStageFailed}</Alert>
				)}
				<Button
					variant="text"
					color="error"
					onClick={() => setIsConfirmingReset(true)}
				>
					{texts.resetStage}
				</Button>
			</Stack>
			<Divider orientation="vertical" />
			<StoreScope store={store}>
				<Box sx={{ overflowY: "auto" }}>
					<Typography
						sx={{ px: 2, pt: 1 }}
						color="textSecondary"
						variant="body2"
					>
						{texts.parts}
					</Typography>
					<SidePanel
						editedComponentId={shownComponentId}
						isOffered={isOffered}
					/>
				</Box>
				<Divider orientation="vertical" />
				<CCComponentEditor
					key={`${resetCount}:${shownComponentId}`}
					componentId={shownComponentId}
					options={{
						isProtectedNode: (nodeId) => isStagePinNode(store, stage, nodeId),
						isOffered,
						canCreateComponents: stage.allowsNewComponents,
						hasProperties: (componentId) => componentId !== stage.componentId,
					}}
					onEditComponent={setEditedComponentId}
					onClose={() => {
						if (shownComponentId === stage.componentId) navigate("/tutorial");
						else setEditedComponentId(stage.componentId);
					}}
				/>
			</StoreScope>
			{isConfirmingReset && (
				<ConfirmDialog
					title={texts.resetStageDialog.title}
					confirmLabel={texts.resetStageDialog.confirm}
					onConfirm={resetStage}
					onCancel={() => setIsConfirmingReset(false)}
				>
					{texts.resetStageDialog.body}
				</ConfirmDialog>
			)}
		</div>
	);
}

export default function TutorialStagePage() {
	const stage = findTutorialStage(useParams<"stageId">().stageId);
	if (!stage) return <Navigate to="/tutorial" replace />;
	return <StageView key={stage.id} stage={stage} />;
}
