import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import { useState, useEffect } from "react";
import { ProductType } from "../../utils/types";

type Props = {
  open: boolean;
  product: ProductType | null;
  onClose: () => void;
  onSave: (p: ProductType) => Promise<void> | void;
};

export default function ProductEditorModal({
  open,
  product,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<ProductType | null>(product);
  useEffect(() => setDraft(product), [product]);

  if (!draft) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit product</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
        <TextField
          autoFocus
          label="Product Name"
          value={draft.productName}
          onChange={(e) => setDraft({ ...draft, productName: e.target.value })}
        />
        <TextField
          label="Package"
          value={draft.package || ""}
          onChange={(e) => setDraft({ ...draft, package: e.target.value })}
        />
        <TextField
          label="Brand"
          value={draft.brand || ""}
          onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
        />
        <TextField
          label="Brand Family"
          value={draft.brandFamily || ""}
          onChange={(e) => setDraft({ ...draft, brandFamily: e.target.value })}
        />
        <TextField
          label="Supplier"
          value={draft.productSupplier || ""}
          onChange={(e) =>
            setDraft({ ...draft, productSupplier: e.target.value })
          }
        />
        <TextField
          label="Supplier Product #"
          value={draft.supplierProductNumber || ""}
          onChange={(e) =>
            setDraft({ ...draft, supplierProductNumber: e.target.value })
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => draft && onSave(draft)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
