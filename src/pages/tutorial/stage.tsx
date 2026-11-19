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
import { type ReactNode, useEffect, useState } from "react";
import {
	Navigate,
	Link as RouterLink,
	useNavigate,
	useParams,
} from "react-router";
import { BitNotationContext } from "../../components/bitNotation";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
	PartDescription,
	PartDescriptionView,
} from "../../components/PartDescription";
import { TruthTableView } from "../../components/TruthTableView";
import { useMessages } from "../../i18n";
import { definitionByComponentId } from "../../store/intrinsics/definitions";
import { StoreScope } from "../../store/react";
import { theme } from "../../style";
import {
	type CheckResult,
	checkCombinational,
	goalTableOf,
} from "../../tutorial/check";
import { describeFailure } from "../../tutorial/failure";
import { markStageCleared } from "../../tutorial/progress";
import {
	getTutorialStageStore,
	resetTutorialStage,
} from "../../tutorial/stageStore";
import {
	findTutorialStage,
	isStageComponent,
	isStagePart,
	isStagePinNode,
	type StageTitleOf,
	type TutorialStage,
	tutorialStages,
} from "../../tutorial/stages";
import CCComponentEditor from "../edit/Editor";
import type { OffersComponent } from "../edit/placement";
import SidePanel from "../edit/SidePanel";

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

function StageView({ stage }: { stage: TutorialStage }) {
	const messages = useMessages();
	const texts = messages.tutorial;
	const navigate = useNavigate();
	const stageIndex = tutorialStages.indexOf(stage);
	const nextStage = tutorialStages[stageIndex + 1];
	const titleOf: StageTitleOf = (id) => texts.stageTexts[id].title;
	const goalTable = goalTableOf(stage.check, stage.examples);
	const stageTexts = texts.stageTexts[stage.id];

	const [store, setStore] = useState(() =>
		getTutorialStageStore(stage, titleOf),
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
		let checked: CheckResult;
		try {
			checked = checkCombinational(store, stage.componentId, stage.check);
		} catch (error) {
			console.error(error);
			checked = { type: "checkFailed", error };
		}
		setResult(checked);
		if (checked.type === "passed") markStageCleared(stage.id);
	};

	const resetStage = () => {
		setIsConfirmingReset(false);
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
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "300px max-content 200px max-content 1fr",
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
							<Typography>{stageTexts.goal}</Typography>
							{goalTable && (
								<Box sx={{ mt: 1 }}>
									<TruthTableView table={goalTable} />
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
											{step}
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
											nullthrows(definitionByComponentId.get(partId)).component
										}
									/>
								))}
								{stage.givenParts
									.map((id) => nullthrows(findTutorialStage(id)))
									.map((given) => (
										<PartDescriptionView
											key={given.id}
											name={titleOf(given.id)}
											summary={null}
											table={goalTableOf(given.check, given.examples)}
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
					</Stack>
				</Box>
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
							fitsNodesInView: true,
							hasProperties: (componentId) =>
								!isStageComponent(stage, componentId),
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
		</BitNotationContext>
	);
}

export default function TutorialStagePage() {
	const stage = findTutorialStage(useParams<"stageId">().stageId);
	if (!stage) return <Navigate to="/tutorial" replace />;
	return <StageView key={stage.id} stage={stage} />;
}
