import React, { useState } from "react";
import { Tooltip } from "@mui/material";
import { deleteDoc, doc } from "firebase/firestore";
import { useSelector } from "react-redux";

import { db } from "../../utils/firebase";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { ProductType } from "../../utils/types";
import { selectUser } from "../../Slices/userSlice";
import { deleteProduct, selectAllProducts } from "../../Slices/productsSlice";

import CustomConfirmation from "../CustomConfirmation";
import ProductForm from "./ProductForm";
import UploadProductTemplateModal from "./UploadProductTemplate";
import { parseProductUploadFile } from "./utils/getProductsForUpdate";
import { fetchCompanyProducts } from "../../thunks/productThunks";
import ProductTable from "./ProductTable";
import { uploadCompanyProductsCallable } from "./utils/uploadCompanyProductsCallable";

import "./styles/productsManager.css";
import ConfirmProductUploadConfirmation from "./ConfirmProductUploadConfirmation";
import { syncCompanyBrandCatalogCallable } from "./utils/syncCompanyBrandCatalogCallable";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [_editIndex, setEditIndex] = useState<number | null>(null); // editIndex is unused
  const [_productToDelete, setProductToDelete] = useState<ProductType | null>(
    null,
  ); // productToDelete isnt used
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductTemplateModal, setShowProductTemplateModal] =
    useState(false);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [pendingUploadProducts, setPendingUploadProducts] = useState<
    ProductType[]
  >([]);
  const [_pendingManualProduct, setPendingManualProduct] =
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

  const handleUploadProductList = async (file: File) => {
    try {
      const parsed = await parseProductUploadFile(file);

      if (!user?.companyId || parsed.length === 0) {
        dispatch(showMessage("No valid products found in file."));
        return;
      }

      setPendingUploadProducts(parsed);
      setShowUploadConfirm(true);
    } catch (err: any) {
      console.error("Product upload parsing error:", err);
      dispatch(showMessage(err.message || "Error parsing uploaded products."));
    }
  };

  const executeDelete = async (productId: string) => {
    try {
      setIsSubmitting(true);

      const companyId = user!.companyId;
      const productDocRef = doc(db, "products", companyId, "items", productId);

      await deleteDoc(productDocRef);
      dispatch(deleteProduct(productId));
      dispatch(
        showMessage(
          "Product deleted. Brand catalog may update on next product sync.",
        ),
      );
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

  const executeUploadProductList = async (products: ProductType[]) => {
    try {
      setIsSubmitting(true);

      const companyId = user?.companyId;
      if (!companyId) {
        dispatch(showMessage("Missing company ID."));
        return;
      }

      const result = await uploadCompanyProductsCallable({
        companyId,
        mode: "update",
        products,
      });

      dispatch(fetchCompanyProducts(companyId));
      dispatch(
        showMessage(
          `Product list synced. Added: ${result.addedCount}, updated: ${result.updatedCount}, aliases created: ${result.aliasCreatedCount}.`,
        ),
      );
    } catch (err: any) {
      console.error("Product list upload error:", err);
      dispatch(showMessage(err.message || "Error uploading product list."));
    } finally {
      setShowUploadConfirm(false);
      setPendingUploadProducts([]);
      setIsSubmitting(false);
    }
  };

  const executeInlineSave = async (product: ProductType) => {
    try {
      setIsSubmitting(true);

      const companyId = user?.companyId;
      if (!companyId) {
        dispatch(showMessage("Missing company ID."));
        return;
      }

      await uploadCompanyProductsCallable({
        companyId,
        mode: "update",
        products: [product],
      });

      dispatch(fetchCompanyProducts(companyId));
      dispatch(showMessage("Changes saved and brand catalog synced."));
    } catch (err: any) {
      console.error("Error saving changes:", err);
      dispatch(showMessage(err.message || "Failed to save changes."));
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
      setEditIndex(null);
    }
  };

  const executeManualSubmit = async (product: ProductType) => {
    try {
      setIsSubmitting(true);

      const companyId = user?.companyId;
      if (!companyId) {
        dispatch(showMessage("Missing company ID."));
        return;
      }

      await uploadCompanyProductsCallable({
        companyId,
        mode: "update",
        products: [product],
      });

      dispatch(fetchCompanyProducts(companyId));
      dispatch(showMessage("Product updated and brand catalog synced."));
    } catch (err: any) {
      console.error("Error saving product:", err);
      dispatch(showMessage(err.message || "Error saving product."));
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
      setPendingManualProduct(null);
    }
  };

  const handleRebuildBrandCatalog = async () => {
    try {
      setIsSubmitting(true);

      const companyId = user?.companyId;

      if (!companyId) {
        dispatch(showMessage("Missing company ID."));
        return;
      }

      const result = await syncCompanyBrandCatalogCallable({
        companyId,
        reset: true,
      });

      dispatch(
        showMessage(
          `Brand catalog rebuilt. Products scanned: ${result.productCount}. Brands created: ${result.brandCreatedCount}.`,
        ),
      );
    } catch (err: any) {
      console.error("Brand catalog rebuild failed:", err);
      dispatch(showMessage(err.message || "Failed to rebuild brand catalog."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMobile = window.innerWidth <= 1200; // Adjust based on your design breakpoints;
  const rowHeight = isMobile ? 400 : 80; // Adjust row height based on mobile view..unused

  const uniqueBrandCount = new Set(
    companyProducts.map((p) => p.brand?.trim()).filter(Boolean),
  ).size;

  const uniqueSupplierCount = new Set(
    companyProducts.map((p) => p.productSupplier?.trim()).filter(Boolean),
  ).size;

  const hasProducts = companyProducts.length > 0;

  return (
    <section className="products-manager">
      <header className="products-manager-header">
        <div>
          <p className="products-eyebrow">Product & Brand Setup</p>
          <h1 className="products-title">Products Manager</h1>
          <p className="products-subtitle">
            Uploading products helps Displaygram build a reliable brand catalog.
            Brands are what connect displays, filters, and shared visibility
            between distributors and suppliers.
          </p>
        </div>

        <div className="products-status-card products-status-card-pulse">
          <span className="products-status-label">
            Brand catalog foundation
          </span>
          <strong>{uniqueBrandCount}</strong>
          <span>
            {uniqueBrandCount === 1 ? "brand detected" : "brands detected"}
          </span>
        </div>
      </header>

      {(isAdmin || isSuperAdmin) && (
        <section
          className="products-info-panel"
          aria-label="How products power Displaygram"
        >
          <div className="products-info-main">
            <div className="products-info-icon" aria-hidden="true">
              🍻
            </div>

            <div>
              <h2>Why products matter</h2>
              <p>
                Displays are not really shared because of individual products.
                They are shared because a post includes brands that connected
                companies are allowed to see.
              </p>
            </div>
          </div>

          <div className="products-flow-grid">
            <Tooltip
              arrow
              title="Your uploaded product list contains product names, packages, supplier numbers, brands, and brand families."
            >
              <div className="products-flow-card">
                <span className="products-flow-step">1</span>
                <h3>Upload products</h3>
                <p>
                  Start with the full product catalog so Displaygram can read
                  the brand data already used by the company.
                </p>
              </div>
            </Tooltip>

            <Tooltip
              arrow
              title="The backend should derive stable brand records from the uploaded product data."
            >
              <div className="products-flow-card products-flow-card-highlight">
                <span className="products-flow-step">2</span>
                <h3>Build brand catalog</h3>
                <p>
                  Displaygram groups products into brands and preserves aliases
                  when brand names are cleaned up later.
                </p>
              </div>
            </Tooltip>

            <Tooltip
              arrow
              title="Connected suppliers should eventually share and filter by stable brand references instead of fragile brand text."
            >
              <div className="products-flow-card">
                <span className="products-flow-step">3</span>
                <h3>Power sharing</h3>
                <p>
                  Connected companies can view and filter displays by approved
                  brands, even if the distributor updates brand names.
                </p>
              </div>
            </Tooltip>
          </div>

          <div className="products-note">
            <strong>Important:</strong> product uploads are the stepping stone.
            The brand catalog is the durable layer Displaygram will use for
            filtering, shared feeds, and supplier visibility.
          </div>
        </section>
      )}

      {(isAdmin || isSuperAdmin) && (
        <section className="products-actions-panel">
          <div className="products-actions-copy">
            <h2>Manage product uploads</h2>
            <p>
              Use the template when adding products. Use update when the company
              changes names, brands, suppliers, packages, or supplier product
              numbers.
            </p>
          </div>

          <div className="products-management-buttons">
            <Tooltip
              arrow
              title="Rebuilds the brand catalog from the current saved product list. Use this if the brand catalog is missing, stale, or was deleted."
            >
              <button
                type="button"
                className="products-button products-button-secondary"
                disabled={isSubmitting || companyProducts.length === 0}
                onClick={handleRebuildBrandCatalog}
              >
                Rebuild Brand Catalog
              </button>
            </Tooltip>
            <Tooltip
              arrow
              title="Shows the required upload columns: product ID, product name, package, product type, brand, brand family, supplier, and supplier product number."
            >
              <button
                type="button"
                className="products-button products-button-secondary"
                onClick={() => setShowProductTemplateModal(true)}
                disabled={isSubmitting}
              >
                View Upload Template
              </button>
            </Tooltip>

            <Tooltip
              arrow
              title="Uploads the current product list. Existing product IDs are updated, new product IDs are added, and the brand catalog is synced."
            >
              <label
                className={`products-button products-button-primary ${
                  isSubmitting ? "products-button-disabled" : ""
                }`}
              >
                {hasProducts
                  ? "Upload New Product List"
                  : "Upload Product List"}
                <input
                  hidden
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";

                    if (file) handleUploadProductList(file);
                  }}
                />
              </label>
            </Tooltip>

            <Tooltip
              arrow
              title="Manually add one product. The backend will also sync the brand catalog."
            >
              <button
                type="button"
                className="products-button products-button-secondary"
                disabled={isSubmitting}
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
                Add Single Product
              </button>
            </Tooltip>
          </div>
        </section>
      )}

      <section
        className="products-summary-grid"
        aria-label="Product catalog summary"
      >
        <div className="products-summary-card">
          <span>Total products</span>
          <strong>{companyProducts.length}</strong>
        </div>

        <div className="products-summary-card">
          <span>Unique brands</span>
          <strong>{uniqueBrandCount}</strong>
        </div>

        <div className="products-summary-card">
          <span>Suppliers</span>
          <strong>{uniqueSupplierCount}</strong>
        </div>
      </section>

      <section className="products-table-panel">
        <div className="products-table-header">
          <div>
            <h2>Current product list</h2>
            <p>
              Product rows remain useful for package-level details, but brand
              values are the key link to shared posts and network filters.
            </p>
          </div>
        </div>

        <ProductTable
          products={companyProducts}
          height={500}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onEditSave={executeInlineSave}
          onDelete={(productId) => {
            const product = companyProducts.find(
              (p) => p.companyProductId === productId,
            );

            if (!product) return;

            setProductToDelete(product);
            setConfirmMessage(
              `Are you sure you want to delete "${product.productName}"?`,
            );
            setConfirmAction(() => () => executeDelete(productId));
            setShowConfirm(true);
          }}
        />
      </section>

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
        onConfirm={confirmAction}
        message={confirmMessage}
        loading={isSubmitting}
      />

      <ConfirmProductUploadConfirmation
        isOpen={showUploadConfirm}
        incomingProducts={pendingUploadProducts}
        existingProducts={companyProducts}
        loading={isSubmitting}
        onClose={() => {
          setShowUploadConfirm(false);
          setPendingUploadProducts([]);
        }}
        onConfirm={() => executeUploadProductList(pendingUploadProducts)}
      />

      <UploadProductTemplateModal
        open={showProductTemplateModal}
        onClose={() => setShowProductTemplateModal(false)}
      />
    </section>
  );
};

export default ProductsManager;
