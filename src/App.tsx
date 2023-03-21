import { Box, Divider } from "@mui/material";
import Editor from "./components/Editor";
import "@pixi/math-extras";
import SidePanel from "./components/SidePanel";

export default function App() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "100px max-content 1fr",
        height: "100%",
      }}
    >
      <SidePanel />
      <Divider orientation="vertical" />
      <Editor />
    </Box>
  );
}
