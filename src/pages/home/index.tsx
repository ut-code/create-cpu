import { useRef, useState } from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import {
  Save as SaveIcon,
  FileOpen as FileOpenIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { CCComponentStore, type CCComponentId } from "../../store/component";
import { useComponents } from "../../store/react/selectors";
import { useStore } from "../../store/react";
import { type CCStorePropsFromJson } from "../../store";
import { ComponentPropertyDialog } from "../../components/ComponentPropertyDialog";

export type HomePageProps = {
  onComponentSelected: (componentId: CCComponentId) => void;
};

export default function HomePage({ onComponentSelected }: HomePageProps) {
  const { store, resetStore } = useStore();
  const components = useComponents().filter(
    (component) => !component.isIntrinsic
  );
  const downloadStore = () => {
    const storeJSON = store.toJSON();
    const blob = new Blob([storeJSON], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "store.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadStore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const storeJSON = reader.result as string;
      const storeData = JSON.parse(storeJSON);
      resetStore(storeData as CCStorePropsFromJson);
    };
    reader.readAsText(file);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  const [isComponentPropertyDialogOpen, setIsComponentPropertyDialogOpen] =
    useState(false);

  return (
    <div style={{ overflowY: "auto" }}>
      <Container sx={{ px: 2, py: 6 }} maxWidth="sm">
        <Typography variant="h2" typography="h4" gutterBottom>
          File
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={downloadStore}
            startIcon={<SaveIcon />}
          >
            Save
          </Button>
          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => uploadStore(e)}
          />
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => inputRef.current?.click()}
            startIcon={<FileOpenIcon />}
          >
            Load
          </Button>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", mt: 4 }}>
          <div style={{ flexGrow: 1 }}>
            <Typography variant="h2" typography="h4">
              Components
            </Typography>
            <Typography color="textSecondary">
              Select a component to start editing.
            </Typography>
          </div>
          <div>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setIsComponentPropertyDialogOpen(true)}
              startIcon={<AddIcon />}
            >
              Create new...
            </Button>
          </div>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gridAutoRows: "60px",
            mt: 2,
            gap: 2,
          }}
        >
          {components.map((component) => (
            <Button
              key={component.id}
              variant="outlined"
              sx={{
                display: "block",
                typography: "h6",
                alignItems: "center",
                textTransform: "none",
                textAlign: "start",
              }}
              color="inherit"
              onClick={() => onComponentSelected(component.id)}
            >
              {component.name}
            </Button>
          ))}
        </Box>
        {isComponentPropertyDialogOpen && (
          <ComponentPropertyDialog
            defaultName=""
            onAccept={(newName) => {
              const newComponent = CCComponentStore.create({
                name: newName,
              });
              store.components.register(newComponent);
              onComponentSelected(newComponent.id);
            }}
            onCancel={() => {
              setIsComponentPropertyDialogOpen(false);
            }}
          />
        )}
      </Container>
    </div>
  );
}
