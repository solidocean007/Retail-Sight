import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CompanyAccountType } from "../../utils/types";
import "./uploadReviewModal.css";

export type UnifiedDiff = {
  type: "new" | "update";
  accountNumber: string;
  updated: CompanyAccountType;
  old?: CompanyAccountType;
  fieldsChanged: (keyof CompanyAccountType)[]; // ✅ strict typing
  routeNumChange?: { old: string[]; new: string[] };
};

interface UploadReviewModalProps {
  diffs: UnifiedDiff[];
  onClose: () => void;
  onConfirm: (selected: UnifiedDiff[]) => void;
}

const UploadReviewModal: React.FC<UploadReviewModalProps> = ({
  diffs,
  onClose,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // inside UploadReviewModal

  const newDiffs = diffs.filter((d) => d.type === "new");
  const updateDiffs = diffs.filter((d) => d.type === "update");

  const totalNew = newDiffs.length;
  const totalUpdates = updateDiffs.length;

  const renderDiffRow = (diff: UnifiedDiff) => {
    const {
      accountNumber,
      updated,
      fieldsChanged = [],
      routeNumChange,
      type,
      old,
    } = diff;
    const isExpanded = expandedRowIds.has(accountNumber);
    const isSelected = selectedIds.includes(accountNumber);

    return (
      <React.Fragment key={accountNumber}>
        <TableRow>
          <TableCell>
            {type === "update" && fieldsChanged.length > 0 && (
              <IconButton onClick={() => toggleRow(accountNumber)}>
                <ExpandMoreIcon
                  style={{
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </IconButton>
            )}
          </TableCell>
          <TableCell>{accountNumber}</TableCell>
          <TableCell>{updated.accountName || "(Unnamed)"}</TableCell>
          <TableCell>
            <Chip
              label={type === "new" ? "New" : "Update"}
              color={type === "new" ? "success" : "warning"}
              size="small"
            />
          </TableCell>
          <TableCell>
            {type === "update" && fieldsChanged.length > 0
              ? fieldsChanged.join(", ")
              : type === "new"
              ? "All fields new"
              : "—"}
          </TableCell>
          <TableCell>
            {type === "update" && routeNumChange
              ? `${routeNumChange.old.join(", ")} → ${routeNumChange.new.join(
                  ", "
                )}`
              : (updated.salesRouteNums || []).join(", ")}
          </TableCell>
          <TableCell>
            <Checkbox
              checked={isSelected}
              onChange={() => toggleSelect(accountNumber)}
            />
          </TableCell>
        </TableRow>

        {isExpanded && type === "update" && fieldsChanged.length > 0 && (
          <TableRow>
            <TableCell colSpan={7} sx={{ bgcolor: "var(--gray-50)" }}>
              <Box sx={{ pl: 4, py: 1 }}>
                {fieldsChanged.map((key) => (
                  <Typography key={key}>
                    <strong>{key}:</strong> {JSON.stringify(old?.[key])} →{" "}
                    {JSON.stringify(updated[key])}
                  </Typography>
                ))}
              </Box>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  useEffect(() => {
    setExpandedRowIds(new Set(diffs.map((d) => d.accountNumber)));
    setSelectedIds(diffs.map((d) => d.accountNumber)); // preselect all
  }, [diffs]);

  const toggleRow = (id: string) => {
    setExpandedRowIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  console.log("diffs: ", diffs);
  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>Review Account Changes ({diffs.length})</DialogTitle>
      <Button
        size="small"
        onClick={() => {
          if (selectedIds.length === diffs.length) {
            setSelectedIds([]);
          } else {
            setSelectedIds(diffs.map((d) => d.accountNumber));
          }
        }}
      >
        {selectedIds.length === diffs.length ? "Deselect All" : "Select All"}
      </Button>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Found {totalNew} new account{totalNew !== 1 ? "s" : ""}
            {" + "}
            {totalUpdates} update{totalUpdates !== 1 ? "s" : ""}
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Account #</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Fields Changed</TableCell>
                <TableCell>Routes</TableCell>
                <TableCell>Select</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {newDiffs.length > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    sx={{ bgcolor: "var(--gray-100)", fontWeight: "bold" }}
                  >
                    🆕 New Accounts ({newDiffs.length})
                  </TableCell>
                </TableRow>
              )}
              {newDiffs.map(renderDiffRow)}

              {updateDiffs.length > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    sx={{ bgcolor: "var(--gray-100)", fontWeight: "bold" }}
                  >
                    ✏️ Updated Accounts ({updateDiffs.length})
                  </TableCell>
                </TableRow>
              )}
              {updateDiffs.map(renderDiffRow)}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            const selected = diffs.filter((d) =>
              selectedIds.includes(d.accountNumber)
            );
            onConfirm(selected);
          }}
          disabled={selectedIds.length === 0}
        >
          Confirm ({selectedIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadReviewModal;
