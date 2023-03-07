import { Box } from "@mui/material";
import Editor from "./Editor";

export default function App() {
  return (
    <Box
      sx={{ display: "grid", gridTemplateColumns: "100px 1fr", height: "100%" }}
    >
      <Box
        sx={{
          background: "paper",
          borderRight: "1px solid",
          borderRightColor: "divider",
        }}
      >
        Menu
      </Box>
      <Editor />
    </Box>
  );
}
