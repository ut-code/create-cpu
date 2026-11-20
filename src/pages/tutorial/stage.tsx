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
import nullthrows from "nullthrows";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Navigate,
	Link as RouterLink,
	useNavigate,
	useParams,
} from "react-router";
import { BitNotationContext } from "../../components/bitNotation";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { checkButtonLook } from "../../components/controlLooks";
import {
	PartDescription,
	PartDescriptionView,
} from "../../components/PartDescription";
import { TruthTableView } from "../../components/TruthTableView";
import { useMessages } from "../../i18n";
import { definitionByComponentId } from "../../store/intrinsics/definitions";
import { SimulationNodeError } from "../../store/netlist";
import type { CCNodeId } from "../../store/node";
import { StoreScope, useStore } from "../../store/react";
import { useComponents } from "../../store/react/selectors";
import {
	type CheckResult,
	checkCircuit,
	goalTableOf,
} from "../../tutorial/check";
import { describeFailure } from "../../tutorial/failure";
import { markStageCleared } from "../../tutorial/progress";
import {
	getTutorialStageStore,
	nameTutorialStage,
	resetTutorialStage,
} from "../../tutorial/stageStore";
import {
	findTutorialStage,
	givenPartById,
	isStageComponent,
	isStagePart,
	isStagePinNode,
	isTutorialStageId,
	type StageTitleOf,
	stageAreaOf,
	type TutorialStage,
	tutorialStages,
} from "../../tutorial/stages";
import CCComponentEditor from "../edit/Editor";
import { OutlinedNodeIdsContext } from "../edit/Editor/outlinedNodes";
import type { OffersComponent } from "../edit/placement";
import SidePanel from "../edit/SidePanel";
import { StageText } from "./StageText";

function SectionHeading({ children }: { children: ReactNode }) {
	return (
		<Typography
			variant="h3"
			typography="h6"
			sx={{ fontWeight: "bold" }}
			gutterBottom
		>
			{children}
		</Typography>
	);
}

function CheckFailure({
	result,
	onReset,
}: {
	result: Exclude<CheckResult, { type: "passed" }>;
	onReset: () => void;
}) {
	const { store } = useStore();
	const messages = useMessages();
	// The message may name a part, which is renamed when the language changes
	useComponents();
	return (
		<Alert severity="error">
			{describeFailure(result, store, messages)}
			{/* The reset button at the end of the stage text may be out of view */}
			{result.type === "missingPin" && (
				<Box sx={{ mt: 1, textAlign: "end" }}>
					<Button color="error" size="small" onClick={onReset}>
						{messages.tutorial.resetStage}
					</Button>
				</Box>
			)}
		</Alert>
	);
}

const noNodeIds: ReadonlySet<CCNodeId> = new Set();

function outlinedNodeIdsOf(result: CheckResult | null): ReadonlySet<CCNodeId> {
	return result?.type === "simulationFailed" &&
		result.error instanceof SimulationNodeError
		? result.error.outlinedNodeIds
		: noNodeIds;
}

function StageView({ stage }: { stage: TutorialStage }) {
	const messages = useMessages();
	const texts = messages.tutorial;
	const navigate = useNavigate();
	const stageIndex = tutorialStages.indexOf(stage);
	const nextStage = tutorialStages[stageIndex + 1];
	const titleOf = useCallback<StageTitleOf>(
		(id) =>
			isTutorialStageId(id) ? texts.stageTexts[id].title : texts.partTitles[id],
		[texts],
	);
	const goalTable = goalTableOf(stage.check);
	const stageTexts = texts.stageTexts[stage.id];

	const [store, setStore] = useState(() =>
		getTutorialStageStore(stage, titleOf),
	);
	const [editedComponentId, setEditedComponentId] = useState(stage.componentId);
	const [result, setResult] = useState<CheckResult | null>(null);
	const [isChecking, setIsChecking] = useState(false);
	const [isConfirmingReset, setIsConfirmingReset] = useState(false);
	const [hasResetFailed, setHasResetFailed] = useState(false);
	// The editor keeps state of the store it was made with, so it starts anew on a reset
	const [resetCount, setResetCount] = useState(0);

	useEffect(() => {
		nameTutorialStage(store, stage, titleOf);
	}, [store, stage, titleOf]);

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

	const cancelCheckRef = useRef<(() => void) | null>(null);
	const cancelCheck = () => {
		cancelCheckRef.current?.();
		cancelCheckRef.current = null;
		setIsChecking(false);
	};
	useEffect(() => () => cancelCheckRef.current?.(), []);

	const outlinedNodeIds = useMemo(() => outlinedNodeIdsOf(result), [result]);

	const check = () => {
		setIsChecking(true);
		const run = () => {
			cancelCheckRef.current = null;
			const checked = checkCircuit(store, stage.componentId, stage.check);
			if (checked.type === "checkFailed") console.error(checked.error);
			setResult(checked);
			// The outline is on the stage's own circuit, which a part opened would hide
			if (outlinedNodeIdsOf(checked).size > 0) {
				setEditedComponentId(stage.componentId);
			}
			if (checked.type === "passed") markStageCleared(stage.id);
			setIsChecking(false);
		};
		// A check over many time steps holds the page for a moment, so the button says
		// it is checking before the check starts
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const frame = requestAnimationFrame(() => {
			timeout = setTimeout(run);
		});
		cancelCheckRef.current = () => {
			cancelAnimationFrame(frame);
			clearTimeout(timeout);
		};
	};

	const resetStage = () => {
		setIsConfirmingReset(false);
		cancelCheck();
		try {
			setStore(resetTutorialStage(stage, titleOf));
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
		<BitNotationContext value={stage.tableNotation}>
			<StoreScope store={store}>
				<div
					style={{
						display: "grid",
						// Wider on a wide screen, for long texts and tables of many columns
						gridTemplateColumns:
							"clamp(300px, 25vw, 420px) max-content 200px max-content 1fr",
						minHeight: 0,
					}}
				>
					<Box sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
						<Stack spacing={2} sx={{ p: 2, overflowY: "auto", flexGrow: 1 }}>
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
								<Typography
									variant="h2"
									typography="h5"
									sx={{ fontWeight: "bold" }}
								>
									{stageTexts.title}
								</Typography>
							</div>
							<div>
								<SectionHeading>{texts.goalHeading}</SectionHeading>
								<Typography>
									<StageText text={stageTexts.goal} />
								</Typography>
								{goalTable && (
									<Box sx={{ mt: 1 }}>
										<Box sx={{ overflowX: "auto" }}>
											<TruthTableView table={goalTable} />
										</Box>
										{stage.tableNotation === "digits" && (
											<Typography variant="body2" sx={{ mt: 0.5 }}>
												{texts.digitsLegend}
											</Typography>
										)}
									</Box>
								)}
							</div>
							{stageTexts.steps.length > 0 && (
								<div>
									<SectionHeading>{texts.stepsHeading}</SectionHeading>
									<Box component="ol" sx={{ m: 0, pl: 3 }}>
										{stageTexts.steps.map((step) => (
											<Typography key={step} component="li" sx={{ mb: 0.5 }}>
												<StageText text={step} />
											</Typography>
										))}
									</Box>
								</div>
							)}
							<div>
								<SectionHeading>{messages.parts.ofStage}</SectionHeading>
								<Stack spacing={1.5}>
									{stage.parts.map((partId) => (
										<PartDescription
											key={partId}
											component={
												nullthrows(definitionByComponentId.get(partId))
													.component
											}
										/>
									))}
									{stage.givenParts.map(givenPartById).map((given) => (
										<PartDescriptionView
											key={given.id}
											name={titleOf(given.id)}
											summary={null}
											table={goalTableOf(given.check)}
										/>
									))}
								</Stack>
							</div>
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
						<Divider />
						{/* Outside the scrolling, so that Check and its result stay in view */}
						<Stack spacing={1} sx={{ p: 2 }}>
							<Button
								{...checkButtonLook}
								onClick={check}
								disabled={isChecking}
							>
								{isChecking ? texts.checking : texts.check}
							</Button>
							{result?.type === "passed" && (
								<>
									<Alert severity="success">
										{stage.check.kind === "sequential"
											? texts.passedSteps(stage.check.steps.length)
											: texts.passed}
									</Alert>
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
								<CheckFailure
									result={result}
									onReset={() => setIsConfirmingReset(true)}
								/>
							)}
						</Stack>
					</Box>
					<Divider orientation="vertical" />
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
					<OutlinedNodeIdsContext
						value={
							// The paths of the error start from the stage's own component
							shownComponentId === stage.componentId
								? outlinedNodeIds
								: noNodeIds
						}
					>
						<CCComponentEditor
							key={`${resetCount}:${shownComponentId}`}
							componentId={shownComponentId}
							options={{
								isProtectedNode: (nodeId) =>
									isStagePinNode(store, stage, nodeId),
								isOffered,
								canCreateComponents: stage.allowsNewComponents,
								fitsNodesInView: true,
								areaToFit:
									shownComponentId === stage.componentId
										? stageAreaOf(stage)
										: null,
								hasProperties: (componentId) =>
									!isStageComponent(stage, componentId),
							}}
							onEditComponent={setEditedComponentId}
							onClose={() => {
								if (shownComponentId === stage.componentId)
									navigate("/tutorial");
								else setEditedComponentId(stage.componentId);
							}}
						/>
					</OutlinedNodeIdsContext>
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
			</StoreScope>
		</BitNotationContext>
	);
}

export default function TutorialStagePage() {
	const stage = findTutorialStage(useParams<"stageId">().stageId);
	if (!stage) return <Navigate to="/tutorial" replace />;
	return <StageView key={stage.id} stage={stage} />;
}
