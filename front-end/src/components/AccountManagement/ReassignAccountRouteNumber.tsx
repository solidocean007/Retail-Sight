import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Typography,
} from "@mui/material";
import { CompanyAccountType } from "../../utils/types";
import "./reassignAccountRouteNumber.css";

interface Props {
  accounts: CompanyAccountType[];
  onSubmit: (updated: CompanyAccountType[]) => Promise<void>;
}

const ReassignAccountRouteNumber: React.FC<Props> = ({
  accounts,
  onSubmit,
}) => {
  const [routeMode, setRouteMode] = useState<"replace" | "add" | "remove">(
    "replace"
  );
  const [oldRoutes, setOldRoutes] = useState("");
  const [newRoute, setNewRoute] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAccounts, setPreviewAccounts] = useState<CompanyAccountType[]>(
    []
  );

  const normalizeRoutes = (val: string) =>
    val
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const computePreview = () => {
    const from = normalizeRoutes(oldRoutes);

    const affected = accounts.filter((acc) =>
      acc.salesRouteNums?.some((r) => from.includes(String(r)))
    );

    setPreviewAccounts(affected);
    setPreviewOpen(true);
  };

  const applyReassignment = async () => {
    const from = normalizeRoutes(oldRoutes).map(String);
    const to = newRoute.trim();

    const updated = accounts.map((acc) => {
      const current = (acc.salesRouteNums || []).map(String);

      const hasOldRoute = current.some((r) => from.includes(r));
      if (!hasOldRoute) return acc;

      let next = [...current];

      switch (routeMode) {
        case "replace":
          next = current.filter((r) => !from.includes(r));
          if (to && !next.includes(to)) next.push(to);
          break;

        case "add":
          if (to && !next.includes(to)) next.push(to);
          break;

        case "remove":
          next = current.filter((r) => !from.includes(r));
          break;
      }

      next = Array.from(new Set(next));
      return { ...acc, salesRouteNums: next };
    });

    await onSubmit(updated);
    setPreviewOpen(false);
  };

  return (
    <div className="rrn-container">
      <h3 className="rrn-title">Batch Reassign Route Numbers</h3>

      <div className="rrn-row">
        <TextField
          label="From Route(s)"
          placeholder="e.g. 45 or 45,46"
          size="small"
          value={oldRoutes}
          onChange={(e) => setOldRoutes(e.target.value)}
        />

        <TextField
          label="To Route (optional)"
          placeholder="e.g. 62 (blank = remove)"
          size="small"
          value={newRoute}
          onChange={(e) => setNewRoute(e.target.value)}
        />

        <div className="rrn-modes">
          <Button
            variant={routeMode === "replace" ? "contained" : "outlined"}
            onClick={() => setRouteMode("replace")}
          >
            Replace
          </Button>

          <Button
            variant={routeMode === "add" ? "contained" : "outlined"}
            onClick={() => setRouteMode("add")}
          >
            Add
          </Button>

          <Button
            variant={routeMode === "remove" ? "contained" : "outlined"}
            onClick={() => setRouteMode("remove")}
          >
            Remove
          </Button>
        </div>

        <button
          className="button-primary rrn-preview-btn"
          onClick={computePreview}
        >
          Preview Changes
        </button>
      </div>

      <Dialog open={previewOpen} maxWidth="md" fullWidth>
        <DialogTitle>Preview Affected Accounts</DialogTitle>

        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {previewAccounts.length} account
            {previewAccounts.length !== 1 ? "s" : ""} will be updated.
          </Typography>

          <Table component={Paper} size="small">
            <TableHead>
              <TableRow>
                <TableCell>Account #</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Current Routes</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {previewAccounts.map((acc) => (
                <TableRow key={acc.accountNumber}>
                  <TableCell>{acc.accountNumber}</TableCell>
                  <TableCell>{acc.accountName}</TableCell>
                  <TableCell>{acc.salesRouteNums.join(", ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={applyReassignment}
            disabled={previewAccounts.length === 0}
          >
            Confirm Update
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ReassignAccountRouteNumber;
