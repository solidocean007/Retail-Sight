import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { AccountDiff } from "./utils/getAccountDiffs";

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

  const columns: GridColDef[] = [
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
  }));

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>Review Account Changes ({rows.length})</DialogTitle>
      <DialogContent style={{ height: 400 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(selectionModel) => {
            if (Array.isArray(selectionModel)) {
              setSelectedRows(selectionModel.map(String));
            }
          }}
        />
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
