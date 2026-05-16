import React, { useEffect, useMemo, useState } from "react";
import "./companyConnectionCard.css";
import { CompanyConnectionType } from "../../utils/types";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import HandshakeConnection from "./HandshakeConnection";
import { db } from "../../utils/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useCompanyBrandCatalog } from "../../hooks/useCompanyBrandCatalog";
import { useAppDispatch } from "../../utils/store";
import CustomConfirmation from "../CustomConfirmation";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { showMessage } from "../../Slices/snackbarSlice";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";

interface Props {
  connection: CompanyConnectionType;
  currentCompanyId: string | undefined;
  isAdminView?: boolean;
}

type PendingBrandView = {
  brandId?: string;
  brandName: string;
  proposedByCompanyId: string;
  proposedByName: string;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const CompanyConnectionCard: React.FC<Props> = ({
  connection,
  currentCompanyId,
  isAdminView,
}) => {
  const user = useSelector(selectUser);
  const dispatch = useAppDispatch();
  const { brands: brandCatalog } = useCompanyBrandCatalog(currentCompanyId);

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [brandSelection, setBrandSelection] = useState<
    { brandId: string; brandName: string; productSupplier?: string }[]
  >([]);
  const [isEditing, setIsEditing] = useState(false);
  const [sharedBrandNames, setSharedBrandNames] = useState<string[]>(
    connection.sharedBrandNames || [],
  );
  const [animationComplete, setAnimationComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBrand, setConfirmBrand] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "approveConnection" | "rejectConnection" | "cancel" | "removeShared" | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  // fade out visual feedback
  const getBrandDisplayName = (brand: any) =>
    String(
      brand.displayName ||
        brand.brandName ||
        brand.name ||
        brand.normalizedBrandName ||
        brand.brandId ||
        "",
    ).trim();

  const supplierOptions = useMemo(() => {
    const set = new Set<string>();

    brandCatalog.forEach((brand: any) => {
      const supplier = String(brand.productSupplier || "").trim();
      if (supplier) set.add(supplier);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [brandCatalog]);

  const currentBrands = useMemo(() => {
    return brandCatalog
      .filter((brand: any) => {
        if (brand.active === false) return false;

        if (!selectedSupplier) return true;

        return (
          String(brand.productSupplier || "")
            .trim()
            .toLowerCase() === selectedSupplier.trim().toLowerCase()
        );
      })
      .map((brand: any) => ({
        brandId: brand.brandId,
        brandName: getBrandDisplayName(brand),
        productSupplier: brand.productSupplier,
      }))
      .filter((brand) => brand.brandId && brand.brandName)
      .sort((a, b) => a.brandName.localeCompare(b.brandName));
  }, [brandCatalog, selectedSupplier]);

  useEffect(() => {
    setSharedBrandNames(connection.sharedBrandNames || []);
  }, [connection.sharedBrandNames]);

  useEffect(() => {
    if (connection.status === "approved") {
      const timer = setTimeout(() => setAnimationComplete(true), 1600);
      return () => clearTimeout(timer);
    } else {
      setAnimationComplete(false);
    }
  }, [connection.status]);

  const isFromUser = currentCompanyId === connection.requestFromCompanyId;

  const currentCompanyType = isFromUser
    ? connection.requestFromCompanyType
    : connection.requestToCompanyType;

  const isCurrentCompanySupplier =
    String(currentCompanyType || "").toLowerCase() === "supplier";
  const canProposeBrands = isAdminView && !isCurrentCompanySupplier;

  const ourCompany = isFromUser
    ? connection.requestFromCompanyName
    : connection.requestToCompanyName;

  const theirCompany = isFromUser
    ? connection.requestToCompanyName
    : connection.requestFromCompanyName;

  const pendingBrandViews = useMemo<PendingBrandView[]>(() => {
    const pendingBrandIds = toStringArray(connection.pendingBrandIds);
    const pendingBrandNames = toStringArray(connection.pendingBrandNames);

    // New shape: pendingBrandIds + pendingBrandNames.
    if (pendingBrandNames.length > 0) {
      return pendingBrandNames.map((brandName, index) => ({
        brandId: pendingBrandIds[index],
        brandName,
        proposedByCompanyId: connection.requestFromCompanyId,
        proposedByName:
          connection.requestFromCompanyName || "Requesting company",
      }));
    }

    // Legacy shape fallback: pendingBrands can be strings or objects.
    const legacy = Array.isArray(connection.pendingBrands)
      ? connection.pendingBrands
      : [];

    return legacy
      .map((item: any) => {
        if (typeof item === "string") {
          return {
            brandName: item,
            proposedByCompanyId: connection.requestFromCompanyId,
            proposedByName:
              connection.requestFromCompanyName || "Requesting company",
          };
        }

        return {
          brandName: item?.brand || "",
          proposedByCompanyId:
            typeof item?.proposedBy === "string"
              ? item.proposedBy
              : item?.proposedBy?.companyId || connection.requestFromCompanyId,
          proposedByName:
            typeof item?.proposedBy === "string"
              ? "Requesting company"
              : item?.proposedBy?.company ||
                item?.proposedBy?.companyName ||
                connection.requestFromCompanyName ||
                "Requesting company",
        };
      })
      .filter((item) => Boolean(item.brandName));
  }, [
    connection.pendingBrandIds,
    connection.pendingBrandNames,
    connection.pendingBrands,
    connection.requestFromCompanyId,
    connection.requestFromCompanyName,
  ]);

  const isIncomingPendingRequest =
    connection.status === "pending" &&
    connection.requestToCompanyId === currentCompanyId;

  const pendingFromUs = useMemo(
    () =>
      pendingBrandViews.filter(
        (b) => b.proposedByCompanyId === currentCompanyId,
      ),
    [pendingBrandViews, currentCompanyId],
  );

  const pendingFromThem = useMemo(
    () =>
      pendingBrandViews.filter(
        (b) => b.proposedByCompanyId !== currentCompanyId,
      ),
    [pendingBrandViews, currentCompanyId],
  );

  const toggleBrand = (brand: {
    brandId: string;
    brandName: string;
    productSupplier?: string;
  }) => {
    setBrandSelection((prev) => {
      const exists = prev.some((item) => item.brandId === brand.brandId);

      if (exists) {
        return prev.filter((item) => item.brandId !== brand.brandId);
      }

      return [...prev, brand];
    });
  };

  const handleSave = async () => {
    if (!connection.id || brandSelection.length === 0) return;

    setSaving(true);

    try {
      const ref = doc(db, "companyConnections", connection.id);

      const existingPendingBrandIds = toStringArray(connection.pendingBrandIds);
      const existingPendingBrandNames = toStringArray(
        connection.pendingBrandNames,
      );
      const existingSharedBrandIds = toStringArray(connection.sharedBrandIds);
      const existingSharedBrandNames = toStringArray(
        connection.sharedBrandNames,
      );

      const brandsToAdd = brandSelection.filter((brand) => {
        return (
          !existingPendingBrandIds.includes(brand.brandId) &&
          !existingSharedBrandIds.includes(brand.brandId) &&
          !existingPendingBrandNames.includes(brand.brandName) &&
          !existingSharedBrandNames.includes(brand.brandName)
        );
      });

      if (brandsToAdd.length === 0) {
        setBrandSelection([]);
        setIsEditing(false);
        return;
      }

      const nextPendingBrandIds = Array.from(
        new Set([
          ...existingPendingBrandIds,
          ...brandsToAdd.map((brand) => brand.brandId),
        ]),
      );

      const nextPendingBrandNames = Array.from(
        new Set([
          ...existingPendingBrandNames,
          ...brandsToAdd.map((brand) => brand.brandName),
        ]),
      );

      await updateDoc(ref, {
        pendingBrandIds: nextPendingBrandIds,
        pendingBrandNames: nextPendingBrandNames,

        // Legacy fallback while old code still exists
        pendingBrands: nextPendingBrandNames,

        updatedAt: serverTimestamp(),
        lastBrandProposalAt: serverTimestamp(),
        lastBrandProposalBy: user?.uid || user?.id || null,
      });

      setBrandSelection([]);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Error proposing new brands:", err);

      dispatch(
        showMessage(err?.message || "Unable to propose brand sharing changes."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedSupplier("");
    setSharedBrandNames(connection.sharedBrandNames || []);
    setBrandSelection([]);
    setIsEditing(false);
  };

  const openConfirm = (
    action:
      | "approveConnection"
      | "rejectConnection"
      | "cancel"
      | "removeShared",
    brand?: string,
  ) => {
    setConfirmBrand(brand ?? null);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!connection.id || !confirmAction) return;

    setConfirmLoading(true);

    try {
      const ref = doc(db, "companyConnections", connection.id);

      // ✅ Approve the whole pending connection request
      if (confirmAction === "approveConnection") {
        const pendingBrandIds = Array.isArray(connection.pendingBrandIds)
          ? connection.pendingBrandIds
          : [];

        const pendingBrandNames = Array.isArray(connection.pendingBrandNames)
          ? connection.pendingBrandNames
          : [];

        const nextSharedBrandIds = Array.from(
          new Set([...(connection.sharedBrandIds || []), ...pendingBrandIds]),
        );

        const nextSharedBrandNames = Array.from(
          new Set([
            ...(connection.sharedBrandNames || []),
            ...pendingBrandNames,
          ]),
        );

        await updateDoc(ref, {
          status: "approved",

          sharedBrandIds: nextSharedBrandIds,
          sharedBrandNames: nextSharedBrandNames,

          pendingBrandIds: [],
          pendingBrandNames: [],
          pendingBrands: [],

          approvedBy: user?.uid || user?.id || null,
          approvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setSharedBrandNames(nextSharedBrandNames);
        setConfirmOpen(false);
        return;
      }

      // ✅ Reject the whole pending connection request
      if (confirmAction === "rejectConnection") {
        await updateDoc(ref, {
          status: "rejected",
          rejectedBy: user?.uid || user?.id || null,
          rejectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setConfirmOpen(false);
        return;
      }

      // ✅ Remove one already-shared brand after approval
      if (confirmAction === "removeShared") {
        if (!confirmBrand) return;

        const updatedSharedBrandNames = (
          connection.sharedBrandNames || []
        ).filter((brand) => brand !== confirmBrand);

        const brandIndex = (connection.sharedBrandNames || []).findIndex(
          (brand) => brand === confirmBrand,
        );

        const updatedSharedBrandIds = Array.isArray(connection.sharedBrandIds)
          ? connection.sharedBrandIds.filter((_, index) => index !== brandIndex)
          : [];

        await updateDoc(ref, {
          sharedBrandIds: updatedSharedBrandIds,
          sharedBrandNames: updatedSharedBrandNames,
          updatedAt: serverTimestamp(),
        });

        setSharedBrandNames(updatedSharedBrandNames);
        setConfirmOpen(false);
        return;
      }

      // ✅ Withdraw one pending proposal from our side
      if (confirmAction === "cancel") {
        if (!confirmBrand) return;

        const pendingBrandNames = Array.isArray(connection.pendingBrandNames)
          ? connection.pendingBrandNames
          : [];

        const pendingBrandIds = Array.isArray(connection.pendingBrandIds)
          ? connection.pendingBrandIds
          : [];

        const removeIndex = pendingBrandNames.findIndex(
          (brand) => brand === confirmBrand,
        );

        const updatedPendingBrandNames = pendingBrandNames.filter(
          (brand) => brand !== confirmBrand,
        );

        const updatedPendingBrandIds =
          removeIndex >= 0
            ? pendingBrandIds.filter((_, index) => index !== removeIndex)
            : pendingBrandIds;

        const updatedLegacyPendingBrands = Array.isArray(
          connection.pendingBrands,
        )
          ? connection.pendingBrands.filter((item: any) => {
              if (typeof item === "string") return item !== confirmBrand;
              return item?.brand !== confirmBrand;
            })
          : [];

        await updateDoc(ref, {
          pendingBrandIds: updatedPendingBrandIds,
          pendingBrandNames: updatedPendingBrandNames,
          pendingBrands: updatedLegacyPendingBrands,
          updatedAt: serverTimestamp(),
        });

        setConfirmOpen(false);
        return;
      }
    } catch (err: any) {
      console.error("Error handling connection confirmation:", err);

      dispatch(
        showMessage(
          err?.message || "Something went wrong updating this connection.",
        ),
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className={`connection-card ${connection.status}`}>
      <header className="connection-header">
        <div className="company-info">
          <h4 className="connection-title">
            <span>{ourCompany}</span>

            {connection.status === "approved" ? (
              <HandshakeConnection animate={true} pulse={true} size={1.5} />
            ) : (
              <span
                className="pending-handshake"
                aria-label="Pending connection"
              >
                <span className="pending-hand pending-hand-left">🫱</span>
                <span className="pending-hand-gap">⋯</span>
                <span className="pending-hand pending-hand-right">🫲</span>
              </span>
            )}

            <span>{theirCompany}</span>
          </h4>
          <p className="connection-status">
            Status:{" "}
            <span className={`status-label ${connection.status}`}>
              {connection.status}
            </span>
          </p>
        </div>

        {canProposeBrands &&
          (!isEditing ? (
            <button
              className="app-btn small secondary"
              onClick={() => setIsEditing(true)}
            >
              <EditIcon fontSize="small" /> Edit
            </button>
          ) : (
            <div className="connection-actions">
              <button
                className="app-btn small success"
                onClick={handleSave}
                disabled={saving}
              >
                <SaveIcon fontSize="small" /> {saving ? "Saving..." : "Save"}
              </button>
              <button
                className="app-btn small danger"
                onClick={handleCancel}
                disabled={saving}
              >
                <CancelIcon fontSize="small" /> Cancel
              </button>
            </div>
          ))}
      </header>
      {isIncomingPendingRequest && isAdminView && (
        <div className="connection-actions">
          <button
            className="btn-approve"
            onClick={() => openConfirm("approveConnection")}
          >
            Accept Request
          </button>

          <button
            className="btn-reject"
            onClick={() => openConfirm("rejectConnection")}
          >
            Reject Request
          </button>
        </div>
      )}
      {/* Shared brands */}
      <section className="brands-section">
        <h5 className="section-title">Active Shared Brands</h5>
        {sharedBrandNames.length ? (
          <div className="brand-list">
            {sharedBrandNames.map((brand: string) => {
              return (
                <span key={brand} className="chip brand-chip shared">
                  {brand}
                  {isEditing && canProposeBrands && (
                    <button
                      className="remove-brand-btn"
                      onClick={() => openConfirm("removeShared", brand)}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="empty-text">No active shared brands yet.</p>
        )}
      </section>

      {/* Pending section */}
      {(pendingFromUs.length > 0 || pendingFromThem.length > 0) && (
        <section className="pending-section">
          {/* Proposed by us */}
          {pendingFromUs.length > 0 && (
            <div className="pending-column">
              <h5>📤 Proposed by {ourCompany}</h5>
              <div className="brand-list">
                {pendingFromUs.map((b) => (
                  <div
                    key={`${b.brandId || b.brandName}-${b.proposedByCompanyId}`}
                    className="pending-brand-row"
                    data-brand={b.brandName}
                  >
                    <span className="brand-chip pending">
                      {b.brandName}
                      <small className="proposer-label">
                        {b.proposedByName}
                      </small>
                    </span>

                    {isAdminView && (
                      <button
                        className="icon-btn cancel-btn"
                        onClick={() => openConfirm("cancel", b.brandName)}
                        title="Withdraw proposal"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposed by them */}
          {pendingFromThem.length > 0 && (
            <div className="pending-column">
              <h5>📥 Proposed by {theirCompany}</h5>
              <div className="brand-list">
                {pendingFromThem.map((b) => (
                  <div
                    key={`${b.brandId || b.brandName}-${b.proposedByCompanyId}`}
                    className="pending-brand-row"
                  >
                    <span className="brand-chip pending">{b.brandName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Supplier Dropdown */}
      {isEditing && canProposeBrands && brandSelection.length > 0 && (
        <div className="draft-pending">
          <h6>Draft Proposals (will be sent on Save)</h6>
          <div className="brand-list">
            {brandSelection.map((brand) => (
              <span key={brand.brandId} className="brand-chip draft">
                {brand.brandName}
              </span>
            ))}
          </div>
        </div>
      )}
      {isEditing && canProposeBrands && (
        <div className="edit-zone">
          <p className="edit-zone-text">
            <strong>Propose new brands to share</strong> with this connected
            company. You can select brands from your supplier catalog or
            manually type in a brand name that isn’t listed.
          </p>
          <p className="edit-zone-text">
            When you click <strong>Save</strong>, all selected or manually added
            brands will appear as <em>pending proposals</em> until the other
            company accepts them.
          </p>

          <div className="supplier-dropdown">
            <p className="supplier-intro">
              <strong>Select a supplier</strong> from your company’s product
              manager list to view their available brands.
            </p>

            <label htmlFor="supplierSelect">Supplier:</label>
            <select
              id="supplierSelect"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">-- Choose a supplier --</option>
              {supplierOptions.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </div>

          {selectedSupplier && (
            <div className="brand-selector">
              <h4 className="section-title">Brands from {selectedSupplier}</h4>
              <p className="edit-zone-text">
                Click a brand below to mark it for sharing. Selected brands turn
                blue and will appear under <em>Draft Proposals</em> until you
                save.
              </p>

              <div className="brand-chip-grid">
                {currentBrands.map((brand) => {
                  const selected = brandSelection.some(
                    (item) => item.brandId === brand.brandId,
                  );

                  return (
                    <button
                      key={brand.brandId}
                      className={`chip brand-chip ${selected ? "selected" : ""}`}
                      onClick={() => toggleBrand(brand)}
                    >
                      {brand.brandName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* <div className="manual-brand-entry">
            <p className="manual-brand-note">
              Can’t find a brand in your supplier list? Add it manually below.
              These will also appear as pending proposals until confirmed.
            </p>
            <div className="manual-brand-input-box">
              <input
                type="text"
                placeholder="Enter a new brand name..."
                value={manualBrand}
                onChange={(e) => setManualBrand(e.target.value)}
                className="manual-brand-input"
              />
              <button
                className="button-primary"
                onClick={handleAddManualBrand}
                disabled={!manualBrand.trim()}
              >
                Add
              </button>
            </div>
          </div> */}
        </div>
      )}
      <CustomConfirmation
        isOpen={confirmOpen}
        title={
          confirmAction === "approveConnection"
            ? "Accept Connection Request"
            : confirmAction === "rejectConnection"
              ? "Reject Connection Request"
              : confirmAction === "removeShared"
                ? "Remove Shared Brand"
                : "Cancel Proposal"
        }
        message={
          confirmAction === "approveConnection"
            ? `Accept this connection request from ${theirCompany}? This will share visibility for all proposed brands.`
            : confirmAction === "rejectConnection"
              ? `Reject this connection request from ${theirCompany}?`
              : confirmAction === "cancel"
                ? `Withdraw your proposal to share ${confirmBrand}?`
                : `Remove ${confirmBrand} from your shared brands? This will stop mutual visibility for this brand.`
        }
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default CompanyConnectionCard;
