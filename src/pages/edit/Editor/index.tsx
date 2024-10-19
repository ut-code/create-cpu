import { Box } from "@mui/material";
import { useState } from "react";
import nullthrows from "nullthrows";
import { useStore } from "../../../store/react";
import { ComponentEditorStoreProvider } from "./store";
import { ComponentPropertyDialog } from "../../../components/ComponentPropertyDialog";
import CCComponentEditorTitleBar from "./components/TitleBar";
import CCComponentEditorViewModeSwitcher from "./components/ViewModeSwitcher";
import CCComponentEditorContextMenu from "./components/ContextMenu";
import type { CCComponentId } from "../../../store/component";
import CCComponentEditorRenderer from "./renderer2";

export type CCComponentEditorProps = {
  componentId: CCComponentId;
  onEditComponent: (componentId: CCComponentId) => void;
  onClose: () => void;
};

function CCComponentEditorContent({
  componentId,
  onEditComponent,
  onClose,
}: CCComponentEditorProps) {
  const { store } = useStore();
  const component = nullthrows(store.components.get(componentId));
  const [isComponentPropertyDialogOpen, setIsComponentPropertyDialogOpen] =
    useState(false);

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      <CCComponentEditorRenderer />
      <CCComponentEditorTitleBar
        onComponentPropertyDialogOpen={() =>
          setIsComponentPropertyDialogOpen(true)
        }
        onEditorClose={onClose}
      />
      <CCComponentEditorViewModeSwitcher />
      <CCComponentEditorContextMenu onEditComponent={onEditComponent} />
      {isComponentPropertyDialogOpen && (
        <ComponentPropertyDialog
          defaultName={component.name}
          onAccept={(newName) => {
            store.components.update(componentId, { name: newName });
            setIsComponentPropertyDialogOpen(false);
          }}
          onCancel={() => {
            setIsComponentPropertyDialogOpen(false);
          }}
        />
      )}
    </Box>
  );
}

export default function CCComponentEditor(props: CCComponentEditorProps) {
  const { componentId } = props;
  return (
    <ComponentEditorStoreProvider componentId={componentId}>
      <CCComponentEditorContent {...props} />
    </ComponentEditorStoreProvider>
  );
}
