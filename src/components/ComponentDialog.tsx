import React from "react";
import { MenuItem, MenuList, Paper } from "@mui/material";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function ComponentDialog() {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <MenuList
        component={Paper}
        dense
        sx={{
          position: "absolute",
          width: "180px",
        }}
      >
        <MenuItem onClick={handleClickOpen}>コンポーネントを作成</MenuItem>
      </MenuList>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>コンポーネントを作成</DialogTitle>
        <DialogContent>
          <DialogContentText>新しいコンポーネントの名前</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label=""
            fullWidth
            variant="standard"
          />
          <DialogContentText>
            コンポーネントの説明（オプション）
          </DialogContentText>
          <TextField
            multiline
            maxRows={5}
            margin="dense"
            id="description"
            label=""
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>キャンセル</Button>
          <Button onClick={handleClose}>OK</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
