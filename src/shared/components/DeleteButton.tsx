import { Delete, DeleteOutline } from "@mui/icons-material";
import { Box, Button } from "@mui/material";

type Props = {
  onClick?: () => void;
}

export default function DeleteButton({ onClick }: Props) {
  return (
    <Box sx={{ position: "relative" }}>
      <Button
        onClick={onClick}
        sx={{
          opacity: 0.8,
          transition: "opacity 0.3s",
          position: "relative",
          cursor: "pointer",
        }}
      >
        <DeleteOutline
          sx={{
            fontSize: 32,
            color: "white",
            position: "absolute",
          }}
        />
        <Delete
          sx={{
            fontSize: 28,
            color: "red",
          }}
        />
      </Button>
    </Box>
  );
}
