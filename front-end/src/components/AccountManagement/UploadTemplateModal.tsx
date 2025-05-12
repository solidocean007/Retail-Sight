import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import "./styles/uploadTemplateModal.css";

interface UploadTemplateModalProps {
  open: boolean;
  onClose: () => void;
}

const mockAccounts = [
  {
    accountNumber: "12345",
    accountName: "Food Mart #1",
    accountAddress: "123 Main St, Fayetteville, NC 28304",
    salesRouteNums: ["71"],
    typeOfAccount: "Grocery",
    chain: "Food Mart",
    chainType: "independent",
  },
  {
    accountNumber: "67890",
    accountName: undefined,
    accountAddress: undefined,
    salesRouteNums: ["72"],
    typeOfAccount: undefined,
    chain: undefined,
    chainType: undefined,
  },
  {
    accountNumber: "67890",
    accountName: "Super Value",
    accountAddress: "456 Elm St, Hope Mills, NC 28348",
    salesRouteNums: ["73"],
    typeOfAccount: "Retail",
    chain: "SuperCo",
    chainType: "chain",
  },
  {
    accountNumber: "54321",
    accountName: "Mini Stop",
    accountAddress: "789 Oak St, Spring Lake, NC 28390",
    salesRouteNums: ["75"],
    typeOfAccount: "Convenience",
    chain: "",
    chainType: "independent",
  },
];

const UploadTemplateModal: React.FC<UploadTemplateModalProps> = ({
  open,
  onClose,
}) => {
  const handleClose = () => {
    // Blur the focused element to avoid ARIA warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Defer onClose to ensure focus is cleared before unmount
    setTimeout(() => onClose(), 0);
  };
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      disableEnforceFocus
      disableAutoFocus
    >
      <DialogTitle>
        <div className="upload-template-modal-header">
          <span>Example File Template</span>
          <button className="close-text-button" onClick={onClose}>
            Close
          </button>
        </div>
      </DialogTitle>

      <DialogContent className="upload-template-modal">
        <p>
          Upload your file as a <strong>CSV or Excel</strong> format. The first
          row must contain headers exactly as shown below. Each row represents
          data for a single account.
        </p>
        <p>
          <strong>Required:</strong> <code>accountNumber</code>
          <br />
          <strong>Optional:</strong> <code>accountName</code>,{" "}
          <code>accountAddress</code>, <code>salesRouteNums</code>,{" "}
          <code>typeOfAccount</code>, <code>chain</code>, <code>chainType</code>
        </p>
        <p>
          If an account has multiple sales routes, submit multiple rows with the
          same <code>accountNumber</code> and different{" "}
          <code>salesRouteNums</code>. Only fields present will be updated —
          missing fields will not overwrite existing values.
        </p>

        <Table size="small">
          <TableHead>
            <TableRow>
              {Object.keys(mockAccounts[0]).map((key) => (
                <TableCell key={key}>{key}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {mockAccounts.map((acc, i) => (
              <TableRow key={i}>
                {Object.values(acc).map((val, j) => (
                  <TableCell key={j}>
                    {Array.isArray(val) ? val.join(", ") : val}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};

export default UploadTemplateModal;
