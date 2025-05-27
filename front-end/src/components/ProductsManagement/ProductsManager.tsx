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
import { fetchProductsThunk, setAllProducts } from "../../Slices/productsSlice";
import "./styles/productsManager.css";
import CustomConfirmation from "../CustomConfirmation";
import ProductForm from "./ProdutForm";
import UploadProductTemplateModal from "./UploadProductTemplate";

const ProductsManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const [companyProducts, setCompanyProducts] = useState<ProductTypeWithId[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductTemplateModal, setShowProductTemplateModal] = useState(false);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductType>({
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
      dispatch(fetchProductsThunk(user.companyId));
    }
  }, [dispatch, user?.companyId]);

  const handleManualSubmit = async (product: ProductType) => {
    if (!product.productName || !user?.companyId) return;
    try {
      const productsId = await getCompanyProductsId(user.companyId);
      if (!productsId) return;

      const snapshot = await getDoc(doc(db, "products", productsId));
      const currentProducts = (snapshot.data()?.products || []) as ProductType[];
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
      <Typography variant="h4" mb={2}>Products Manager</Typography>

      <Box className="account-management-buttons">
        <Button variant="contained" sx={{ mb: 2 }} onClick={() => setShowProductTemplateModal(true)}>
          View Upload File Template
        </Button>
        <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpenAddProductModal(true)}>
          Quickly Add Single Product
        </Button>
      </Box>

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
                          <Button onClick={() => setEditIndex(null)}>Save</Button>
                          <Button onClick={() => setEditIndex(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => setEditIndex(index)}>Edit</Button>
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
        initialData={newProduct}
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

