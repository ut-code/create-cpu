import { useContext, useRef, useState } from "react";
import invariant from "tiny-invariant";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import {
  Save as SaveIcon,
  FileOpen as FileOpenIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { CCComponentStore, type CCComponentId } from "../../store/component";
import useAllComponents from "../../store/react/selectors";
import { storeContext, useStore } from "../../store/react";
import CCStore, { type CCStorePropsFromJson } from "../../store";

export type HomePageProps = {
  onComponentSelected: (componentId: CCComponentId) => void;
};

export default function HomePage({ onComponentSelected }: HomePageProps) {
  const store = useStore();
  const { setStore } = useContext(storeContext);
  const components = useAllComponents().filter(
    (component) => !component.isIntrinsic
  );
  const [newComponentName, setNewComponentName] = useState("");
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
      const downloadedStore = new CCStore(
        undefined,
        storeData as CCStorePropsFromJson
      );
      invariant(setStore);
      setStore(downloadedStore);
    };
    reader.readAsText(file);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  const [isCreateNewComponentDialogOpen, setIsCreateNewComponentDialogOpen] =
    useState(false);
  const closeCreateNewComponentDialog = () => {
    setIsCreateNewComponentDialogOpen(false);
    setNewComponentName("");
  };

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
              onClick={() => setIsCreateNewComponentDialogOpen(true)}
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
        <Dialog
          maxWidth="xs"
          fullWidth
          open={isCreateNewComponentDialogOpen}
          onClose={closeCreateNewComponentDialog}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newComponentName) return;
              const newComponent = CCComponentStore.create({
                name: newComponentName,
              });
              store.components.register(newComponent);
              onComponentSelected(newComponent.id);
            }}
          >
            <DialogTitle>Create new component</DialogTitle>
            <DialogContent>
              <TextField
                value={newComponentName}
                fullWidth
                onChange={(e) => setNewComponentName(e.target.value)}
                placeholder="New component name"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={closeCreateNewComponentDialog} color="inherit">
                Cancel
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                type="submit"
                disabled={!newComponentName}
              >
                Create
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </div>
  );
}
