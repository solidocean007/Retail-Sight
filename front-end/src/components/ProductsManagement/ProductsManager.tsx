// ProductsManager.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Tooltip,
} from "@mui/material";
import { db } from "../../utils/firebase";
import {
  collection,
  deleteDoc,
  doc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { ProductType } from "../../utils/types";
import getCompanyProductsId from "../../utils/helperFunctions/getCompanyProductsId";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import {
  addProduct,
  deleteProduct,
  selectAllProducts,
  updateProduct,
} from "../../Slices/productsSlice";
import "../AccountManagement/styles/accountsManager.css";
import CustomConfirmation from "../CustomConfirmation";
import ProductForm from "./ProductForm";
import UploadProductTemplateModal from "./UploadProductTemplate";
import {
  getProductsForAdd,
  getProductsForUpdate,
} from "./utils/getProductsForUpdate";
import { fetchCompanyProducts } from "../../thunks/productThunks";
import ProductTable from "./ProductTable";

interface ProductManagerProps {
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const ProductsManager: React.FC<ProductManagerProps> = ({
  isAdmin,
  isSuperAdmin,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyProducts = useSelector(selectAllProducts) as ProductType[];
  console.log("Company Products:", companyProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [_editIndex, setEditIndex] = useState<number | null>(null); // editIndex is unused
  const [showConfirm, setShowConfirm] = useState(false);
  const [_productToDelete, setProductToDelete] = useState<ProductType | null>(
    null
  ); // productToDelete isnt used
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductTemplateModal, setShowProductTemplateModal] =
    useState(false);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
  const [_pendingAddProducts, setPendingAddProducts] = useState<ProductType[]>(
    []
  ); // pendingAddProducts is unused
  const [pendingUpdateProducts, setPendingUpdateProducts] = useState<
    ProductType[]
  >([]); // pendingUpdateProducts is unused
  const [pendingManualProduct, setPendingManualProduct] =
    useState<ProductType | null>(null); // pendingManualProduct is unused

  const [newCompanyProduct, setNewCompanyProduct] = useState<ProductType>({
    companyProductId: "",
    productName: "",
    package: "",
    productType: "",
    brand: "",
    brandFamily: "",
    productSupplier: "",
    supplierProductNumber: "",
  });



  const handleAddProducts = async (file: File) => {
    try {
      const parsed = await getProductsForAdd(file);
      if (!user?.companyId || parsed.length === 0) {
        dispatch(showMessage("No valid products found in file."));
        return;
      }

      setPendingAddProducts(parsed);
      setConfirmMessage(
        `You're about to upload ${parsed.length} new product(s). Continue?`
      );
      setConfirmAction(() => () => executeAddProducts(parsed));
      setShowConfirm(true);
    } catch (err: any) {
      console.error("Parsing error:", err);
      dispatch(showMessage(err.message || "Error parsing uploaded products."));
    }
  };

  const executeAddProducts = async (products: ProductType[]) => {
    try {
      setIsSubmitting(true);

      const companyId = user!.companyId;
      const itemsCollectionRef = collection(db, "products", companyId, "items");
      const batch = writeBatch(db);

      for (const product of products) {
        const newDocRef = doc(itemsCollectionRef); // Auto-generated ID
        batch.set(newDocRef, product);
      }

      await batch.commit();

      dispatch(fetchCompanyProducts(companyId));
      dispatch(showMessage("Products uploaded successfully"));
    } catch (err) {
      console.error("Upload error:", err);
      dispatch(showMessage("Error uploading products"));
    } finally {
      setShowConfirm(false);
      setIsSubmitting(false);
      setPendingAddProducts([]);
    }
  };

  const handleUpdateProducts = async (file: File) => {
    try {
      const parsed = await getProductsForUpdate(file, companyProducts);
      if (!user?.companyId || parsed.length === 0) return;

      // Check for truly new items not in current Firestore list
      const currentIds = new Set(
        companyProducts.map((p) => p.companyProductId)
      );
      const newItems = parsed.filter(
        (p) => !currentIds.has(p.companyProductId)
      );
      const updates = parsed.filter((p) => currentIds.has(p.companyProductId));

      const updateCount = updates.length;
      const newCount = newItems.length;

      setPendingUpdateProducts(parsed);
      setConfirmMessage(
        `You're updating ${updateCount} existing product(s) and adding ${newCount} new product(s). Continue?`
      );
      setConfirmAction(() => () => executeUpdateProducts(parsed));
      setShowConfirm(true);
    } catch (err: any) {
      console.error("Update parsing error:", err);
      dispatch(showMessage(err.message || "Error preparing product updates."));
    }
  };

  const executeUpdateProducts = async (parsed: ProductType[]) => {
    try {
      setIsSubmitting(true);

      const companyId = user!.companyId;
      const itemsCollectionRef = collection(db, "products", companyId, "items");
      const batch = writeBatch(db);

      for (const product of parsed) {
        const docRef = doc(itemsCollectionRef, product.companyProductId);
        batch.set(docRef, product, { merge: true });
      }

      await batch.commit();

      dispatch(fetchCompanyProducts(companyId));
      dispatch(showMessage("Products updated successfully"));
    } catch (err) {
      console.error("Error updating products:", err);
      dispatch(showMessage("Error during product update"));
    } finally {
      setShowConfirm(false);
      setIsSubmitting(false);
      setPendingUpdateProducts([]);
    }
  };

  const executeDelete = async (productId: string) => {
    try {
      setIsSubmitting(true);

      const companyId = user!.companyId;
      const productDocRef = doc(db, "products", companyId, "items", productId);

      await deleteDoc(productDocRef);
      dispatch(deleteProduct(productId));
      dispatch(showMessage("Product deleted successfully"));
    } catch (err) {
      console.error("Delete error:", err);
      dispatch(showMessage("Error deleting product."));
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
      setProductToDelete(null);
    }
  };

  const handleManualSubmit = (product: ProductType) => {
    if (!product.productName || !user?.companyId) return;

    setPendingManualProduct(product);
    setConfirmMessage(`Add "${product.productName}" to your product list?`);
    setConfirmAction(() => () => executeManualSubmit(product));
    setShowConfirm(true);
  };

  const executeInlineSave = async (product: ProductType) => {
    try {
      setIsSubmitting(true);
      const companyId = user!.companyId;

      const productDocRef = doc(
        db,
        "products",
        companyId,
        "items",
        product.companyProductId
      );

      await setDoc(productDocRef, product);
      dispatch(updateProduct(product)); // ✅ Optimistic update

      dispatch(showMessage("Changes saved."));
    } catch (err) {
      console.error("Error saving changes:", err);
      dispatch(showMessage("Failed to save changes."));
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
      setEditIndex(null);
    }
  };

  const executeManualSubmit = async (product: ProductType) => {
    try {
      setIsSubmitting(true);
      const companyId = user!.companyId;

      const productDocRef = doc(
        db,
        "products",
        companyId,
        "items",
        product.companyProductId
      );

      await setDoc(productDocRef, product);
      dispatch(addProduct(product)); // ✅ Optimistic update

      dispatch(showMessage("Product added successfully"));
    } catch (err) {
      console.error("Error saving product:", err);
      dispatch(showMessage("Error saving product."));
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
      setPendingManualProduct(null);
    }
  };

  const isMobile = window.innerWidth <= 1200; // Adjust based on your design breakpoints;
  const rowHeight = isMobile ? 400 : 80; // Adjust row height based on mobile view
  return (
    <Box className="account-manager-container">
      <Typography variant="h4" className="account-header-title" mb={2}>
        Products Manager
      </Typography>
      <div>
        {(isAdmin || isSuperAdmin) && (
          <>
            <Box className="account-instructions">
              <Typography variant="body1" gutterBottom>
                <strong>Instructions:</strong>
              </Typography>
              <Typography variant="body2">
                <strong>1.</strong> Upload a <code>.csv</code> or{" "}
                <code>.xlsx</code> file to add products in bulk.
              </Typography>
              <Typography variant="body2">
                <strong>2.</strong> Click <strong>"Add more Products"</strong>{" "}
                to append new products.
              </Typography>
              <Typography variant="body2">
                <strong>3.</strong> Use <strong>"Update Products"</strong> to
                update by product ID.
              </Typography>
              <Typography variant="body2">
                <strong>4.</strong> Use{" "}
                <strong>"Quickly Add Single Product"</strong> to manually add
                one.
              </Typography>
            </Box>

            <div className="account-management-buttons">
              <button
                className="account-upload-button btn-outline"
                onClick={() => setShowProductTemplateModal(true)}
              >
                View Upload File Template
              </button>

              <Tooltip title="Upload CSV or Excel to create products">
                <button className="account-upload-button">
                  {companyProducts.length
                    ? "Add more Products"
                    : "Upload Initial Products"}
                  <input
                    hidden
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAddProducts(file);
                    }}
                  />
                </button>
              </Tooltip>

              <Tooltip title="Upload CSV or Excel to update existing products">
                <button
                  className="account-upload-button"
                  disabled={companyProducts.length === 0}
                >
                  Update Products
                  <input
                    hidden
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpdateProducts(file);
                    }}
                  />
                </button>
              </Tooltip>

              <button
                className="account-submit-button"
                onClick={() => {
                  setNewCompanyProduct({
                    companyProductId: "",
                    productName: "",
                    package: "",
                    productType: "",
                    brand: "",
                    brandFamily: "",
                    productSupplier: "",
                    supplierProductNumber: "",
                  });
                  setOpenAddProductModal(true);
                }}
              >
                Quickly Add Single Product
              </button>
            </div>
          </>
        )}
      </div>
      <ProductTable
        products={companyProducts}
        height={500}
        rowHeight = {rowHeight}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onEditSave={(product) => {
          setConfirmMessage(`Save changes to "${product.productName}"?`);
          setConfirmAction(() => () => executeInlineSave(product));
          setShowConfirm(true);
        }}
        onDelete={(productId) => {
          const product = companyProducts.find(
            (p) => p.companyProductId === productId
          );
          if (!product) return;
          setProductToDelete(product);
          setConfirmMessage(
            `Are you sure you want to delete "${product.productName}"?`
          );
          setConfirmAction(() => () => executeDelete(productId));
          setShowConfirm(true);
        }}
      />
      <ProductForm
        isOpen={openAddProductModal}
        initialData={newCompanyProduct}
        onSubmit={(data) => {
          setOpenAddProductModal(false);
          handleManualSubmit(data);
        }}
        onCancel={() => setOpenAddProductModal(false)}
      />
      <CustomConfirmation
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setProductToDelete(null);
        }}
        onConfirm={confirmAction} // ✅ More flexible
        message={confirmMessage}
        loading={isSubmitting}
      />
      <UploadProductTemplateModal
        open={showProductTemplateModal}
        onClose={() => setShowProductTemplateModal(false)}
      />
    </Box>
  );
};

export default ProductsManager;
