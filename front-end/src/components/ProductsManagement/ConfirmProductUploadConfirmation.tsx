import React, { useMemo } from "react";
import { ProductType } from "../../utils/types";
import "./styles/confirmProductUploadConfirmation.css";

type ProductFieldKey =
  | "productName"
  | "package"
  | "productType"
  | "brand"
  | "brandFamily"
  | "productSupplier"
  | "supplierProductNumber";

type ProductChange = {
  field: ProductFieldKey;
  label: string;
  before: string;
  after: string;
};

type UpdatedProductPreview = {
  product: ProductType;
  changes: ProductChange[];
};

interface ConfirmProductUploadConfirmationProps {
  isOpen: boolean;
  incomingProducts: ProductType[];
  existingProducts: ProductType[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const PRODUCT_FIELDS: { key: ProductFieldKey; label: string }[] = [
  { key: "productName", label: "Product Name" },
  { key: "package", label: "Package" },
  { key: "productType", label: "Product Type" },
  { key: "brand", label: "Brand" },
  { key: "brandFamily", label: "Brand Family" },
  { key: "productSupplier", label: "Supplier" },
  { key: "supplierProductNumber", label: "Supplier Product #" },
];

const clean = (value: unknown) => String(value ?? "").trim();

const normalize = (value: unknown) => clean(value).toLowerCase();

const getProductId = (product: ProductType) => clean(product.companyProductId);

const getProductChanges = (
  existing: ProductType,
  incoming: ProductType,
): ProductChange[] => {
  return PRODUCT_FIELDS.flatMap(({ key, label }) => {
    const before = clean(existing[key]);
    const after = clean(incoming[key]);

    if (before === after) return [];

    return [
      {
        field: key,
        label,
        before,
        after,
      },
    ];
  });
};

const formatSampleProduct = (product: ProductType) => {
  const id = clean(product.companyProductId);
  const name = clean(product.productName);
  const brand = clean(product.brand);

  return `${id} — ${name}${brand ? ` (${brand})` : ""}`;
};

const ConfirmProductUploadConfirmation: React.FC<
  ConfirmProductUploadConfirmationProps
> = ({
  isOpen,
  incomingProducts,
  existingProducts,
  loading = false,
  onClose,
  onConfirm,
}) => {
  const preview = useMemo(() => {
    const existingMap = new Map(
      existingProducts.map((product) => [getProductId(product), product]),
    );

    const newProducts: ProductType[] = [];
    const unchangedProducts: ProductType[] = [];
    const updatedProducts: UpdatedProductPreview[] = [];

    incomingProducts.forEach((incoming) => {
      const id = getProductId(incoming);
      if (!id) return;

      const existing = existingMap.get(id);

      if (!existing) {
        newProducts.push(incoming);
        return;
      }

      const changes = getProductChanges(existing, incoming);

      if (changes.length === 0) {
        unchangedProducts.push(incoming);
        return;
      }

      updatedProducts.push({ product: incoming, changes });
    });

    const brandChangeCount = updatedProducts.filter(({ changes }) =>
      changes.some((change) => change.field === "brand"),
    ).length;

    const supplierNumberChangeCount = updatedProducts.filter(({ changes }) =>
      changes.some((change) => change.field === "supplierProductNumber"),
    ).length;

    const incomingBrandCount = new Set(
      incomingProducts.map((product) => normalize(product.brand)).filter(Boolean),
    ).size;

    return {
      total: incomingProducts.length,
      newProducts,
      updatedProducts,
      unchangedProducts,
      brandChangeCount,
      supplierNumberChangeCount,
      incomingBrandCount,
    };
  }, [incomingProducts, existingProducts]);

  if (!isOpen) return null;

  const sampleNewProducts = preview.newProducts.slice(0, 6);
  const sampleUpdatedProducts = preview.updatedProducts.slice(0, 6);

  const hasWork =
    preview.newProducts.length > 0 || preview.updatedProducts.length > 0;

  return (
    <div className="product-upload-confirm-backdrop" role="presentation">
      <section
        className="product-upload-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-upload-confirm-title"
      >
        <header className="product-upload-confirm-header">
          <div>
            <p className="product-upload-confirm-eyebrow">
              Review Product Upload
            </p>
            <h2 id="product-upload-confirm-title">
              Sync products and brand catalog?
            </h2>
          </div>

          <button
            type="button"
            className="product-upload-confirm-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close upload confirmation"
          >
            ×
          </button>
        </header>

        <div className="product-upload-confirm-body">
          <p className="product-upload-confirm-intro">
            Displaygram will add new products, update changed products, and use
            the uploaded brand fields to maintain the company brand catalog.
          </p>

          <div className="product-upload-confirm-stats">
            <div className="product-upload-confirm-stat">
              <span>Total rows</span>
              <strong>{preview.total}</strong>
            </div>

            <div className="product-upload-confirm-stat product-upload-confirm-stat-new">
              <span>New</span>
              <strong>{preview.newProducts.length}</strong>
            </div>

            <div className="product-upload-confirm-stat product-upload-confirm-stat-updated">
              <span>Updated</span>
              <strong>{preview.updatedProducts.length}</strong>
            </div>

            <div className="product-upload-confirm-stat">
              <span>Unchanged</span>
              <strong>{preview.unchangedProducts.length}</strong>
            </div>
          </div>

          <div className="product-upload-confirm-brand-note">
            <strong>{preview.incomingBrandCount}</strong> unique brand value(s)
            were found in this file.
            {preview.brandChangeCount > 0 && (
              <>
                {" "}
                <strong>{preview.brandChangeCount}</strong> product(s) include a
                brand-name change. These changes may create brand aliases in the
                backend.
              </>
            )}
          </div>

          {preview.supplierNumberChangeCount > 0 && (
            <div className="product-upload-confirm-warning">
              {preview.supplierNumberChangeCount} product(s) changed supplier
              product number. Review these carefully because supplier product
              numbers help Displaygram match renamed products to existing brand
              records.
            </div>
          )}

          {!hasWork && (
            <div className="product-upload-confirm-empty">
              No product changes were detected. You can close this review
              without syncing.
            </div>
          )}

          {sampleNewProducts.length > 0 && (
            <section className="product-upload-confirm-section">
              <h3>Sample new products</h3>
              <div className="product-upload-confirm-list">
                {sampleNewProducts.map((product) => (
                  <div
                    key={`new-${getProductId(product)}`}
                    className="product-upload-confirm-list-row"
                  >
                    {formatSampleProduct(product)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {sampleUpdatedProducts.length > 0 && (
            <section className="product-upload-confirm-section">
              <h3>Sample updated products</h3>
              <div className="product-upload-confirm-updates">
                {sampleUpdatedProducts.map(({ product, changes }) => (
                  <article
                    key={`updated-${getProductId(product)}`}
                    className="product-upload-confirm-update-card"
                  >
                    <h4>{formatSampleProduct(product)}</h4>

                    <div className="product-upload-confirm-change-list">
                      {changes.slice(0, 4).map((change) => (
                        <div
                          key={`${getProductId(product)}-${change.field}`}
                          className="product-upload-confirm-change"
                        >
                          <span>{change.label}</span>
                          <p>
                            <del>{change.before || "Blank"}</del>
                            <span aria-hidden="true"> → </span>
                            <strong>{change.after || "Blank"}</strong>
                          </p>
                        </div>
                      ))}

                      {changes.length > 4 && (
                        <div className="product-upload-confirm-more">
                          +{changes.length - 4} more field change(s)
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="product-upload-confirm-actions">
          <button
            type="button"
            className="products-button products-button-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="products-button products-button-primary"
            onClick={onConfirm}
            disabled={loading || !hasWork}
          >
            {loading ? "Syncing..." : "Confirm Sync"}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default ConfirmProductUploadConfirmation;