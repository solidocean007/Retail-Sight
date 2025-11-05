import { Chip } from "@mui/material";

interface ArchivedMonthChipProps {
  month: string;
  count: number;
  isActive: boolean;
  onToggle: () => void;
}

const ArchivedMonthChip = ({ month, count, isActive, onToggle }: ArchivedMonthChipProps) => {
  return (
    <Chip
      label={`${month} (${count})`}
      clickable
      // TouchRippleProps={{ style: { display: "none" } }} // 👈 hides ripple
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      sx={{
        bgcolor: isActive ? "var(--chip-active-bg, #22c55e)" : "var(--chip-bg)",
        color: isActive ? "var(--chip-active-text, white)" : "var(--chip-text)",
        fontWeight: isActive ? 600 : 400,
        boxShadow: isActive ? 3 : 1,
        transition: "all 0.25s ease",
      }}
      className="archived-month-chip"
    />
  );
};

export default ArchivedMonthChip;
