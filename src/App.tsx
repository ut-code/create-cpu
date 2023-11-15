import { Box } from "@mui/material";
import { useState } from "react";
import "@pixi/math-extras";
import GlobalHeader from "./components/GlobalHeader";
import { useStore } from "./store/react";
import type { CCComponentId } from "./store/component";
import EditPage from "./pages/edit";
import HomePage from "./pages/home";

export default function App() {
  const store = useStore();
  const [editedComponentId, setEditedComponentId] =
    useState<CCComponentId | null>(store.components.rootComponentId);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateRows: "max-content minmax(0, 1fr)",
        height: "100%",
      }}
    >
      <GlobalHeader style={{ gridColumn: "1 / -1" }} />
      {editedComponentId ? (
        <EditPage
          editedComponentId={editedComponentId}
          onEditOtherComponent={setEditedComponentId}
          onClose={() => {
            setEditedComponentId(null);
          }}
        />
      ) : (
        <HomePage onComponentSelected={setEditedComponentId} />
      )}
    </Box>
  );
}
