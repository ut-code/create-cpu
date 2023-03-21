import { Box, List, ListItemButton } from "@mui/material";

export default function SidePanel() {
  return (
    <Box sx={{ background: "paper" }}>
      <List>
        {[...Array(4).keys()].map((i) => (
          <ListItemButton key={i} draggable disableRipple>
            <svg viewBox="-3 -3 106 106">
              <rect
                x={0}
                y={0}
                width={100}
                height={100}
                fill="#fff"
                stroke="#000"
                strokeWidth={3}
              />
            </svg>
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
