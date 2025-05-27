// UploadProductTemplateModal.tsx
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
// import "./styles/uploadTemplateModal.css";

interface UploadProductTemplateModalProps {
  open: boolean;
  onClose: () => void;
}

const mockProducts = [
  {
    companyProductId: "P1001",
    productName: "Mountain Spring Water 24pk",
    package: "24 x 16.9oz Bottles",
    productType: "Water",
    brand: "Mountain Spring",
    brandFamily: "Essentials",
    productSupplier: "Blue Ridge Beverages",
    supplierProductNumber: "BR12345",
  },
  {
    companyProductId: "P1002",
    productName: "",
    package: "",
    productType: "",
    brand: "",
    brandFamily: "",
    productSupplier: "",
    supplierProductNumber: "",
  },
  {
    companyProductId: "P1003",
    productName: "Sunburst Soda 12oz",
    package: "12 x 12oz Cans",
    productType: "Soda",
    brand: "Sunburst",
    brandFamily: "Refreshers",
    productSupplier: "SunCo",
    supplierProductNumber: "SC2022",
  },
];

const UploadProductTemplateModal: React.FC<UploadProductTemplateModalProps> = ({
  open,
  onClose,
}) => {
  const handleClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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
          <span>Example Product File Template</span>
          <button className="close-text-button" onClick={onClose}>
            Close
          </button>
        </div>
      </DialogTitle>

      <DialogContent className="upload-template-modal">
        <p>
          Upload your product list in <strong>CSV or Excel</strong> format. The
          first row must include headers exactly as shown. Each row represents
          one product.
        </p>
        <p>
          <strong>Required:</strong> <code>companyProductId</code>, <code>productName</code>, <code>package</code>
          <br />
          <strong>Optional:</strong> <code>productType</code>, <code>brand</code>,
          <code>brandFamily</code>, <code>productSupplier</code>, <code>supplierProductNumber</code>
        </p>
        <p>
          Leave optional fields blank if not applicable. Only filled fields will
          update existing products — blanks will not overwrite.
        </p>

        <Table size="small">
          <TableHead>
            <TableRow>
              {Object.keys(mockProducts[0]).map((key) => (
                <TableCell key={key}>{key}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {mockProducts.map((product, i) => (
              <TableRow key={i}>
                {Object.values(product).map((val, j) => (
                  <TableCell key={j}>{val || "-"}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};

export default UploadProductTemplateModal;
