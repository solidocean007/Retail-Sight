import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Collapse,
  Divider,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { AccountDiff } from "./utils/getAccountDiffs";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const columns: GridColDef[] = [
    {
      field: "expand",
      headerName: "",
      width: 50,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => {
            e.stopPropagation(); // prevent row selection trigger
            toggleExpand(params.row.id);
          }}
        >
          <ExpandMoreIcon
            style={{
              transform:
                expandedRowId === params.row.id
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </IconButton>
      ),
    },
    { field: "accountNumber", headerName: "Account #", width: 130 },
    {
      field: "changes",
      headerName: "Fields Changed",
      flex: 1,
      renderCell: (params) => params.value.join(", "),
    },
    {
      field: "routeChange",
      headerName: "Route Numbers",
      flex: 1,
      renderCell: (params) => {
        const route = params.row.routeNumChange;
        return route
          ? `${route.old.join(", ")} → ${route.new.join(", ")}`
          : "—";
      },
    },
  ];

  const rows = diffs.map((diff) => ({
    id: diff.accountNumber,
    accountNumber: diff.accountNumber,
    changes: diff.fieldsChanged,
    routeNumChange: diff.routeNumChange,
    diff,
  }));

  const selectedDiff = diffs.find((d) => d.accountNumber === expandedRowId);

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>Review Account Changes ({rows.length})</DialogTitle>
      <DialogContent>
        <div style={{ height: 400 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            onRowSelectionModelChange={(model: (string | number)[]) => {
              setSelectedRows(model.map(String));
            }}
            onRowClick={(params) => toggleExpand(params.row.id)}
          />
        </div>

        {selectedDiff && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Detailed Changes for Account #{selectedDiff.accountNumber}
            </Typography>
            <Box sx={{ pl: 2 }}>
              {selectedDiff.fieldsChanged.map((field) => (
                <Typography key={field} variant="body2" sx={{ mb: 1 }}>
                  <strong>{field}:</strong>{" "}
                  {JSON.stringify(selectedDiff.old[field])} →{" "}
                  {JSON.stringify(selectedDiff.updated[field])}
                </Typography>
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            const selected = diffs.filter((d) =>
              selectedRows.includes(d.accountNumber)
            );
            onConfirm(selected);
          }}
          disabled={selectedRows.length === 0}
        >
          Confirm Update ({selectedRows.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadReviewModal;
