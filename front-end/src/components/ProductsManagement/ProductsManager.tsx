// ProductsManager.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { db } from "../../utils/firebase";
import {
  addDoc,
  collection,
  CollectionReference,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { ProductType, ProductTypeWithId } from "../../utils/types";
import getCompanyProductsId from "../../utils/helperFunctions/getCompanyProductsId";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import {
  selectAllProducts,
  setAllProducts,
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
  const companyProducts = useSelector(selectAllProducts) as ProductTypeWithId[];
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [productToDelete, setProductToDelete] =
    useState<ProductTypeWithId | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedProduct, setEditedProduct] = useState<ProductTypeWithId | null>(
    null
  );
  const [originalProduct, setOriginalProduct] =
    useState<ProductTypeWithId | null>(null);

  const [showProductTemplateModal, setShowProductTemplateModal] =
    useState(false);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
  const [pendingAddProducts, setPendingAddProducts] = useState<ProductType[]>(
    []
  );
  const [pendingUpdateProducts, setPendingUpdateProducts] = useState<
    ProductType[]
  >([]);
  const [pendingManualProduct, setPendingManualProduct] =
    useState<ProductType | null>(null);

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

useEffect(() => {
  if (user?.companyId) {
    dispatch(fetchCompanyProducts(user.companyId)); // ✅ updated thunk
  }
}, [dispatch, user?.companyId]);


  const handleAddProducts = async (file: File) => {
    try {
      const parsed = await getProductsForAdd(file);
      if (!user?.companyId || parsed.length === 0) return;

      setPendingAddProducts(parsed);
      setConfirmMessage(
        `You're about to upload ${parsed.length} new product(s). Continue?`
      );
      setConfirmAction(() => () => executeAddProducts(parsed));
      setShowConfirm(true);
    } catch (err) {
      console.error("Parsing error:", err);
      dispatch(showMessage("Error parsing uploaded products."));
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
    } catch (err) {
      console.error("Update parsing error:", err);
      dispatch(showMessage("Error preparing product updates."));
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

  const handleDelete = (productId: string) => {
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
  };

  const executeDelete = async (productId: string) => {
    try {
      setIsSubmitting(true);

      const companyId = user!.companyId;
      const productDocRef = doc(db, "products", companyId, "items", productId);

      await deleteDoc(productDocRef);

      dispatch(fetchCompanyProducts(companyId));
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

  const handleInlineSave = (index: number) => {
    const product = companyProducts[index];
    setConfirmMessage(`Save changes to "${product.productName}"?`);
    setConfirmAction(() => () => executeInlineSave(product));
    setShowConfirm(true);
  };

  const executeInlineSave = async (product: ProductTypeWithId) => {
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

      await setDoc(productDocRef, product); // Overwrites existing product with updated data

      dispatch(fetchCompanyProducts(companyId));
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

      await setDoc(productDocRef, product); // Creates or overwrites the product

      dispatch(fetchCompanyProducts(companyId));
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
              <Button
                className="account-upload-button"
                onClick={() => setShowProductTemplateModal(true)}
              >
                View Upload File Template
              </Button>

              <Tooltip title="Upload CSV or Excel to create products">
                <Button className="account-upload-button" component="label">
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
                </Button>
              </Tooltip>

              <Tooltip title="Upload CSV or Excel to update existing products">
                <Button
                  className="account-upload-button"
                  component="label"
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
                </Button>
              </Tooltip>

              <Button
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
              </Button>
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table className="account-table">
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell>Package</TableCell>
                <TableCell>Product Type</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companyProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="subtitle1" color="textSecondary">
                      No products found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                companyProducts.map((product, index) => (
                  <TableRow key={product.id || index}>
                    {editIndex === index ? (
                      <>
                        <TableCell>
                          <TextField
                            value={editedProduct?.productName || ""}
                            onChange={(e) =>
                              setEditedProduct((prev) =>
                                prev
                                  ? { ...prev, productName: e.target.value }
                                  : null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={editedProduct?.package || ""}
                            onChange={(e) =>
                              setEditedProduct((prev) =>
                                prev
                                  ? { ...prev, package: e.target.value }
                                  : null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={editedProduct?.productType || ""}
                            onChange={(e) =>
                              setEditedProduct((prev) =>
                                prev
                                  ? { ...prev, productType: e.target.value }
                                  : null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={editedProduct?.brand || ""}
                            onChange={(e) =>
                              setEditedProduct((prev) =>
                                prev ? { ...prev, brand: e.target.value } : null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={editedProduct?.brandFamily || ""}
                            onChange={(e) =>
                              setEditedProduct((prev) =>
                                prev
                                  ? { ...prev, brandFamily: e.target.value }
                                  : null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={editedProduct?.productSupplier || ""}
                            onChange={(e) =>
                              setEditedProduct((prev) =>
                                prev
                                  ? { ...prev, productSupplier: e.target.value }
                                  : null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={editedProduct?.supplierProductNumber || ""}
                            onChange={(e) =>
                              setEditedProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      supplierProductNumber: e.target.value,
                                    }
                                  : null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleInlineSave(index)}
                            disabled={
                              JSON.stringify(originalProduct) ===
                              JSON.stringify(editedProduct)
                            }
                          >
                            Save
                          </Button>
                          <Button onClick={() => setEditIndex(null)}>
                            Cancel
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{product.productName}</TableCell>
                        <TableCell>{product.package}</TableCell>
                        <TableCell>{product.productType}</TableCell>
                        <TableCell>{product.brand}</TableCell>
                        <TableCell>{product.brandFamily}</TableCell>
                        <TableCell>{product.productSupplier}</TableCell>
                        <TableCell>{product.supplierProductNumber}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => {
                              setEditIndex(index);
                              setEditedProduct({ ...product });
                              setOriginalProduct({ ...product });
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            color="error"
                            onClick={() => handleDelete(product.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
