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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AccountDiff } from "./utils/getAccountDiffs";
import "./uploadReviewModal.css";

interface UploadReviewModalProps {
  diffs: AccountDiff[];
  onClose: () => void;
  onConfirm: (selected: AccountDiff[]) => void;
}

const UploadReviewModal: React.FC<UploadReviewModalProps> = ({
  diffs,
  onClose,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Expand all rows by default
  useEffect(() => {
    const allIds = new Set(diffs.map((d) => d.accountNumber));
    setExpandedRowIds(allIds);
  }, [diffs]);

  useEffect(() => {
    const allIds = diffs.map((d) => d.accountNumber);
    setSelectedIds(allIds);
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

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>Review Account Changes ({diffs.length})</DialogTitle>
      <Button
        size="small"
        onClick={() => {
          if (selectedIds.length === diffs.length) {
            setSelectedIds([]); // Deselect all
          } else {
            setSelectedIds(diffs.map((d) => d.accountNumber)); // Select all
          }
        }}
      >
        {selectedIds.length === diffs.length ? "Deselect All" : "Select All"}
      </Button>
      <DialogContent>
        <TableContainer>
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}
          ></Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Account #</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Fields Changed</TableCell>
                <TableCell>Route Change</TableCell>
                <TableCell>Select</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diffs.map((diff) => {
                const {
                  accountNumber,
                  updated,
                  fieldsChanged,
                  routeNumChange,
                } = diff;
                const isExpanded = expandedRowIds.has(accountNumber);
                const isSelected = selectedIds.includes(accountNumber);

                return (
                  <React.Fragment key={accountNumber}>
                    <TableRow>
                      <TableCell>
                        <IconButton onClick={() => toggleRow(accountNumber)}>
                          <ExpandMoreIcon
                            style={{
                              transform: isExpanded
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          />
                        </IconButton>
                      </TableCell>
                      <TableCell>{accountNumber}</TableCell>
                      <TableCell>
                        {updated.accountName || "(Unnamed)"}
                      </TableCell>
                      <TableCell>{fieldsChanged.join(", ")}</TableCell>
                      <TableCell>
                        {routeNumChange
                          ? `${routeNumChange.old.join(
                              ", "
                            )} → ${routeNumChange.new.join(", ")}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(accountNumber)}
                        />
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          sx={{ bgcolor: "var(--gray-50)" }}
                        >
                          <Box sx={{ pl: 4, py: 1 }}>
                            {fieldsChanged.map((field) => (
                              <Typography
                                key={field}
                                variant="body2"
                                sx={{ mb: 0.5 }}
                              >
                                <strong>{field}:</strong>{" "}
                                {JSON.stringify(diff.old[field])} →{" "}
                                {JSON.stringify(diff.updated[field])}
                              </Typography>
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
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
          Confirm Update ({selectedIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadReviewModal;
