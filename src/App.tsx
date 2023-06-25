import { Box, Divider } from "@mui/material";
import CCComponentEditor from "./components/CCComponentEditor";
import "@pixi/math-extras";
import SidePanel from "./components/SidePanel";
import GlobalHeader from "./components/GlobalHeader";
import { useStore } from "./store/react";

export default function App() {
  const store = useStore();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateRows: "max-content 1fr",
        gridTemplateColumns: "200px max-content 1fr",
        height: "100%",
      }}
    >
      <GlobalHeader style={{ gridColumn: "1 / -1" }} />
      <SidePanel />
      <Divider orientation="vertical" />
      <CCComponentEditor componentId={store.components.rootComponentId} />
    </Box>
  );
}
