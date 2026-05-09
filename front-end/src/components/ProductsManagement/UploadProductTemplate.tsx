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
import "./styles/uploadProductTemplateModal.css";

interface UploadProductTemplateModalProps {
  open: boolean;
  onClose: () => void;
}

const productHeaders = [
  "companyProductId",
  "productName",
  "package",
  "productType",
  "brand",
  "brandFamily",
  "productSupplier",
  "supplierProductNumber",
];

const mockProducts = [
  {
    companyProductId: "252",
    productName: "Lite 4/3/24cn",
    package: "12/4.0 oz 4/3 CN",
    productType: "BEER PKG",
    brand: "LITE",
    brandFamily: "LITE",
    productSupplier: "MILLERCOORS",
    supplierProductNumber: "700982",
  },
  {
    companyProductId: "418",
    productName: "Coors Light 24/12oz Cans",
    package: "24 x 12oz Cans",
    productType: "BEER PKG",
    brand: "COORS LT",
    brandFamily: "COORS LIGHT",
    productSupplier: "MILLERCOORS",
    supplierProductNumber: "701114",
  },
  {
    companyProductId: "1003",
    productName: "Sample Product Name",
    package: "",
    productType: "",
    brand: "",
    brandFamily: "",
    productSupplier: "",
    supplierProductNumber: "",
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
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      PaperProps={{
        className: "upload-product-template-paper",
      }}
    >
      <DialogTitle className="upload-product-template-title">
        <div className="upload-product-template-header">
          <div>
            <p className="upload-product-template-eyebrow">
              Product Upload Template
            </p>
            <h2>Example Product File</h2>
          </div>

          <button
            type="button"
            className="upload-product-template-close"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </DialogTitle>

      <DialogContent className="upload-product-template-content">
        <section className="upload-product-template-intro">
          <p>
            Upload your current product list in <strong>CSV or Excel</strong>{" "}
            format. Displaygram uses this file to save products and maintain the
            company brand catalog used for filtering and shared visibility.
          </p>

          <div className="upload-product-template-note">
            <strong>Important:</strong> keep the header row exactly as shown.
            Cells may be blank, but the column names should not be changed.
          </div>
        </section>

        <section className="upload-product-template-rules">
          <div>
            <h3>Required headers</h3>
            <p>
              These columns must exist in the first row of the file, even if
              some values are blank.
            </p>
          </div>

          <div className="upload-product-template-chip-row">
            {productHeaders.map((header) => (
              <code key={header}>{header}</code>
            ))}
          </div>
        </section>

        <section className="upload-product-template-guidance">
          <div className="upload-product-template-card">
            <h3>Most important fields</h3>
            <p>
              <code>companyProductId</code>, <code>productName</code>,{" "}
              <code>brand</code>, <code>productSupplier</code>, and{" "}
              <code>supplierProductNumber</code> help Displaygram identify
              products and preserve brand aliases when names change.
            </p>
          </div>

          <div className="upload-product-template-card">
            <h3>Brand cleanup</h3>
            <p>
              If a distributor later changes <strong>LITE</strong> to{" "}
              <strong>MILLER LITE</strong>, the backend can use supplier product
              numbers and product IDs to connect the renamed brand to the
              existing catalog record.
            </p>
          </div>
        </section>

        <div className="upload-product-template-table-wrap">
          <Table size="small" className="upload-product-template-table">
            <TableHead>
              <TableRow>
                {productHeaders.map((key) => (
                  <TableCell key={key}>{key}</TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {mockProducts.map((product, i) => (
                <TableRow key={i}>
                  {productHeaders.map((key) => (
                    <TableCell key={key}>
                      {product[key as keyof typeof product] || "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadProductTemplateModal;