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
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { ProductType, ProductTypeWithId } from "../../utils/types";
import getCompanyProductsId from "../../utils/helperFunctions/getCompanyProductsId";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import {
  fetchProductsThunk,
  selectAllProducts,
  setAllProducts,
} from "../../Slices/productsSlice";
import "./styles/productsManager.css";
import CustomConfirmation from "../CustomConfirmation";
import ProductForm from "./ProdutForm";
import UploadProductTemplateModal from "./UploadProductTemplate";
import {
  getProductsForAdd,
  getProductsForUpdate,
} from "./utils/getProductsForUpdate";

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
  const [confirmMessage, setConfirmMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductTemplateModal, setShowProductTemplateModal] =
    useState(false);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
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
      if (!user?.companyId || parsed.length === 0) return;

      const productsId = await getCompanyProductsId(user.companyId);
      if (!productsId) return;

      const snapshot = await getDoc(doc(db, "products", productsId));
      const current = (snapshot.data()?.products || []) as ProductType[];

      await updateDoc(doc(db, "products", productsId), {
        products: [...current, ...parsed],
      });

      dispatch(fetchProductsThunk(user.companyId));
      dispatch(showMessage("Products uploaded successfully"));
    } catch (err) {
      console.error("Upload error:", err);
      dispatch(showMessage("Error uploading products"));
    }
  };

  const handleUpdateProducts = async (file: File) => {
    try {
      const parsed = await getProductsForUpdate(file, companyProducts);
      if (!user?.companyId || parsed.length === 0) return;

      const productsId = await getCompanyProductsId(user.companyId);
      if (!productsId) return;

      const snapshot = await getDoc(doc(db, "products", productsId));
      const existing = (snapshot.data()?.products || []) as ProductType[];

      const updatedList = existing.map((existingProduct) => {
        const match = parsed.find(
          (p) => p.companyProductId === existingProduct.companyProductId
        );
        return match ? { ...existingProduct, ...match } : existingProduct;
      });

      await updateDoc(doc(db, "products", productsId), {
        products: updatedList,
      });

      dispatch(fetchProductsThunk(user.companyId));
      dispatch(showMessage("Products updated successfully"));
    } catch (err) {
      console.error("Update error:", err);
      dispatch(showMessage("Error updating products"));
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      dispatch(fetchProductsThunk(user.companyId));
    }
  }, [dispatch, user?.companyId]);

  const handleManualSubmit = async (product: ProductType) => {
    if (!product.productName || !user?.companyId) return;
    try {
      const productsId = await getCompanyProductsId(user.companyId);
      if (!productsId) return;

      const snapshot = await getDoc(doc(db, "products", productsId));
      const currentProducts = (snapshot.data()?.products ||
        []) as ProductType[];
      const updated = [...currentProducts, product];

      await updateDoc(doc(db, "products", productsId), { products: updated });
      dispatch(fetchProductsThunk(user.companyId));
    } catch (err) {
      console.error("Error saving product:", err);
      dispatch(showMessage("Error saving product."));
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" mb={2}>
        Products Manager
      </Typography>

      <div>
        {(isAdmin || isSuperAdmin) && (
          <>
            <Box
              className="product-instructions"
              sx={{ textAlign: "left", mb: 2 }}
            >
              <Typography variant="body1" gutterBottom>
                <strong>Instructions:</strong>
              </Typography>
              <Typography variant="body2">
                <strong>1.</strong> Upload a <code>.csv</code> or{" "}
                <code>.xlsx</code> file to add products in bulk.
              </Typography>
              <Typography variant="body2">
                <strong>2.</strong> Click <strong>"Add more Products"</strong>{" "}
                to append new products without overwriting.
              </Typography>
              <Typography variant="body2">
                <strong>3.</strong> Use <strong>"Update Products"</strong> to
                update existing products by product ID or name.
              </Typography>
              <Typography variant="body2">
                <strong>4.</strong> Use{" "}
                <strong>"Quickly Add Single Product"</strong> to manually add
                one product.
              </Typography>
            </Box>

            <div className="product-management-buttons">
              <Button
                variant="contained"
                sx={{ marginBottom: 2 }}
                onClick={() => setShowProductTemplateModal(true)}
              >
                View Upload File Template
              </Button>

              <Tooltip title="Upload CSV or Excel to create products">
                <Button
                  variant="contained"
                  component="label"
                  sx={{ marginBottom: 2 }}
                >
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
                  variant="contained"
                  component="label"
                  sx={{ marginBottom: 2 }}
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
                variant="contained"
                onClick={() => {
                  console.log("click");
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
                sx={{ marginBottom: 2 }}
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
          <Table>
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
                    <TableCell>
                      {editIndex === index ? (
                        <TextField
                          value={product.productName}
                          onChange={(e) => {
                            const updated = [...companyProducts];
                            updated[index].productName = e.target.value;
                            dispatch(setAllProducts(updated));
                          }}
                        />
                      ) : (
                        product.productName
                      )}
                    </TableCell>
                    <TableCell>
                      {editIndex === index ? (
                        <TextField
                          value={product.package}
                          onChange={(e) => {
                            const updated = [...companyProducts];
                            updated[index].package = e.target.value;
                            dispatch(setAllProducts(updated));
                          }}
                        />
                      ) : (
                        product.package
                      )}
                    </TableCell>
                    <TableCell>
                      {editIndex === index ? (
                        <TextField
                          value={product.productType}
                          onChange={(e) => {
                            const updated = [...companyProducts];
                            updated[index].productType = e.target.value;
                            dispatch(setAllProducts(updated));
                          }}
                        />
                      ) : (
                        product.productType
                      )}
                    </TableCell>
                    <TableCell>
                      {editIndex === index ? (
                        <>
                          <Button onClick={() => setEditIndex(null)}>
                            Save
                          </Button>
                          <Button onClick={() => setEditIndex(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => setEditIndex(index)}>
                            Edit
                          </Button>
                          <Button color="error" onClick={() => {}}>
                            Delete
                          </Button>
                        </>
                      )}
                    </TableCell>
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
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {}}
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
