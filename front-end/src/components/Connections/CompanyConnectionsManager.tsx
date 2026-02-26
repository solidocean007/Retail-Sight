import React, { useState, useEffect, useMemo } from "react";
import "./companyConnectionsManager.css";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { selectCurrentCompany } from "../../Slices/currentCompanySlice";
import { showMessage } from "../../Slices/snackbarSlice";
import CompanyConnectionList from "./CompanyConnectionList";
import { getCompanyConnectionsStore } from "../../utils/database/companyConnectionsDBUtils";
import {
  createConnectionRequest,
  fetchCompanyConnections,
  setCachedConnections,
} from "../../Slices/companyConnectionSlice";
import { CompanyConnectionType, UserType } from "../../utils/types";
import ConnectionBuilder from "./ConnectionBuilder";
import ConnectionEditModal from "./ConnectionEditModal";
import { Modal } from "@mui/material";
import InviteAndConnectModal from "./InviteAndConnectModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import IdentifyCompany from "./IdentifyCompany";
import PlanUsageBanner from "../Pages/PlanUsageBanner";

interface Props {
  currentCompanyId: string | undefined;
  user: UserType | null;
}

const CompanyConnectionsManager: React.FC<Props> = ({
  currentCompanyId,
  user,
}) => {
  const dispatch = useAppDispatch();
  const functions = getFunctions();
  const usersCompany = useSelector(selectCurrentCompany);
  const { connections } = useSelector(
    (state: RootState) => state.companyConnections,
  );

  // ✅ Access plan data from Redux (cached + persisted)

  const { currentPlan } = useSelector((state: RootState) => state.plans);

  const [inviteMode, setInviteMode] = useState(false);
  const [selectedConnection, setSelectedConnection] =
    useState<CompanyConnectionType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  // 🆕 Step-based flow management
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [identifiedEmail, setIdentifiedEmail] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [lookup, setLookup] = useState<any | null>(null);

  const approvedConnections = useMemo(
    () => connections.filter((c) => c.status === "approved").length,
    [connections],
  );

  const pendingConnections = useMemo(
    () => connections.filter((c) => c.status === "pending").length,
    [connections],
  );

  const isPlanReady = Boolean(currentPlan);

  const connectionLimit = currentPlan?.connectionLimit ?? 0;
  const connectionLimitReached =
    isPlanReady &&
    connectionLimit > 0 &&
    approvedConnections >= connectionLimit;

  // ✅ Load connections (cached + remote)
  useEffect(() => {
    if (!currentCompanyId) return;
    const loadConnections = async () => {
      try {
        const cached = await getCompanyConnectionsStore(currentCompanyId);
        if (cached?.connections)
          dispatch(setCachedConnections(cached.connections));
        if (!connections.length) {
          await dispatch(fetchCompanyConnections(currentCompanyId));
        }
      } catch (error) {
        console.error("Error loading cached connections:", error);
      }
    };
    loadConnections();
  }, [currentCompanyId, dispatch]);

  // 🧩 Handle connection creation
  const handleConfirmRequest = async (
    emailInput: string,
    brandSelection: string[],
  ) => {
    if (!user || !usersCompany || !currentCompanyId) return;
    try {
      await dispatch(
        createConnectionRequest({
          currentCompanyId,
          user,
          emailInput,
          brandSelection,
        }),
      ).unwrap();

      dispatch(showMessage("Connection request sent successfully."));
      if (!connections.length) {
        await dispatch(fetchCompanyConnections(currentCompanyId));
      }
      setStep(0);
    } catch (err: any) {
      if (err.code === "already-exists") {
        dispatch(showMessage("A connection request already exists."));
      } else if (err.code === "not-found") {
        dispatch(showMessage("No admin found with that email address."));
      } else {
        dispatch(showMessage(`Error: ${err.message || err}`));
      }
    }
  };

  // === STEP 1 → STEP 2: Handling flow transitions ===
  const handleIdentifyContinue = (email: string, lookupData: any) => {
    setIdentifiedEmail(email);
    setLookup(lookupData); // <-- store entire lookup object
    setStep(2);
  };

  // === When email is NOT a Displaygram user ===
  const handleInviteFlow = (email: string) => {
    setIdentifiedEmail(email);
    setLookup({ mode: "invitable", email }); // <-- fill lookup for consistency
    setInviteMode(true);
    setStep(2);
  };

  // === Store brand selections from Step 2 ===
  const [brandSelectionFromStep2, setBrandSelectionFromStep2] = useState<
    string[]
  >([]);

  const handleEdit = (connection: CompanyConnectionType) => {
    setSelectedConnection(connection);
    setIsEditOpen(true);
  };

  const handleModalClose = () => {
    setIsEditOpen(false);
    setSelectedConnection(null);
  };

  const isNearLimit =
    isPlanReady &&
    connectionLimit > 0 &&
    approvedConnections >= connectionLimit - 1;

  return (
    <div className="connections-dashboard">
      <PlanUsageBanner />
      {/* === MERGED CONNECTIONS OVERVIEW PANEL === */}
      <div className="connections-overview">
        <div className="overview-header" onClick={() => setShowInfo(!showInfo)}>
          <h2>Company Connections</h2>
          <p className="overview-summary">
            Understand how connections, shared brands, and partner visibility
            work.
          </p>

          <button className="toggle-overview-btn">
            {showInfo ? "▲ Hide Details" : "▼ Learn More"}
          </button>
        </div>

        {showInfo && (
          <div className="overview-details">
            <ul className="overview-points">
              <li>
                <span className="overview-icon">📨</span>
                <div>
                  <strong>Start with an email.</strong>
                  <p>
                    Enter a partner admin’s email. If they aren’t on Displaygram
                    yet, you can invite them instantly.
                  </p>
                </div>
              </li>

              <li>
                <span className="overview-icon">🤝</span>
                <div>
                  <strong>Two-way approval.</strong>
                  <p>
                    Both companies must approve shared brands. This ensures
                    visibility stays relevant and intentional.
                  </p>
                </div>
              </li>

              <li>
                <span className="overview-icon">🏷️</span>
                <div>
                  <strong>Shared Brands determine visibility.</strong>
                  <p>
                    You’ll only see posts and collections containing brands that
                    BOTH companies approve.
                  </p>
                </div>
              </li>

              <li>
                <span className="overview-icon">🌎</span>
                <div>
                  <strong>Cross-company visibility.</strong>
                  <p>
                    Approved partners automatically see your matching display
                    posts and shareable collections.
                  </p>
                </div>
              </li>

              <li>
                <span className="overview-icon">📊</span>
                <div>
                  <strong>Your plan has limits.</strong>
                  <p>
                    Your current plan allows {connectionLimit} connections.
                    Upgrading increases this instantly.
                  </p>
                </div>
              </li>
            </ul>

            <p className="overview-footer">
              Tip: You can manage shared brands and pending proposals from each
              connection card below.
            </p>
          </div>
        )}
      </div>

      <div className="connections-list-card">
        <div className="tier-status">
          <strong>
            {isPlanReady
              ? `${approvedConnections} / ${connectionLimit} connections used`
              : "Loading plan limits..."}
          </strong>

          <div className="tier-bar">
            <div
              className="tier-progress"
              style={{
                width:
                  connectionLimit > 0
                    ? `${Math.min(
                        (approvedConnections / connectionLimit) * 100,
                        100,
                      )}%`
                    : "0%",
              }}
            />
          </div>

          {pendingConnections > 0 && (
            <div className="pending-badge">
              {pendingConnections} pending — does not count toward limit
            </div>
          )}

          <button
            className="button-primary create-connection-btn"
            onClick={() => setStep(1)}
            disabled={!isPlanReady || connectionLimitReached}
          >
            + New Connection
          </button>

          {connectionLimitReached && (
            <div className="limit-message">
              You’ve reached your connection limit.
            </div>
          )}
        </div>

        <h3>Existing Connections</h3>
        <p className="section-hint">
          Review current connections, pending requests, and shared brands.
        </p>
        {isNearLimit && !connectionLimitReached && (
          <div className="limit-message">
            You are close to your connection limit.
          </div>
        )}

        <CompanyConnectionList
          connections={connections}
          currentCompanyId={currentCompanyId}
          isAdminView={user?.role === "admin" || user?.role === "super-admin"}
          onEdit={handleEdit}
        />
      </div>
      {/* === STEP 1: Identify Company === */}
      {step === 1 && (
        <Modal
          open={true}
          onClose={() => setStep(0)}
          slotProps={{ backdrop: { className: "connection-builder-backdrop" } }}
        >
          <div className="connection-builder-modal">
            {/* <IdentifyCompany
              onContinue={(email, lookup) => {
                setIdentifiedEmail(email);
                setStep(2);
              }}
              onInvite={(email) => {
                setIdentifiedEmail(email);
                setShowInviteModal(true);
              }}
            /> */}
            <IdentifyCompany
              fromCompanyId={currentCompanyId!}
              currentUser={user}
              currentCompany={usersCompany}
              currentConnections={connections}
              onContinue={handleIdentifyContinue}
              onInvite={handleInviteFlow}
            />
          </div>
        </Modal>
      )}

      {/* === STEP 2: Brand Selection (Existing ConnectionBuilder, modified) === */}
      {step === 2 && (
        <Modal
          open={true}
          onClose={() => setStep(0)}
          slotProps={{ backdrop: { className: "connection-builder-backdrop" } }}
        >
          <div className="connection-builder-modal">
            <ConnectionBuilder
              email={identifiedEmail}
              lookup={lookup}
              onClose={() => setStep(0)}
              onConfirm={(email, brandSelection) => {
                setBrandSelectionFromStep2(brandSelection);

                if (inviteMode) {
                  setShowInviteModal(true);
                  return Promise.resolve(); // don't send request yet
                }

                return handleConfirmRequest(email, brandSelection); // existing user path
              }}
            />
          </div>
        </Modal>
      )}
      {/* === INVITE MODAL === */}
      <InviteAndConnectModal
        email={identifiedEmail}
        isOpen={showInviteModal}
        onCancel={() => setShowInviteModal(false)}
        onConfirm={async () => {
          const fn = httpsCallable(functions, "createInviteAndDraftConnection");

          await fn({
            targetEmail: identifiedEmail,
            fromCompanyId: currentCompanyId,
            sharedBrands: brandSelectionFromStep2.map((b) => ({
              brand: b,
              proposedBy: user,
            })),
          });

          // ✅ Correct location
          setInviteMode(false);

          dispatch(
            showMessage(
              "Invite sent. The connection will auto-stage when they join.",
            ),
          );

          setShowInviteModal(false);
          setStep(0);
        }}
      />

      {/* 🧩 Edit Modal */}
      {selectedConnection && (
        <Modal
          open={isEditOpen}
          onClose={handleModalClose}
          slotProps={{ backdrop: { className: "connection-builder-backdrop" } }}
        >
          <div className="connection-builder-modal">
            <ConnectionEditModal
              isOpen={isEditOpen}
              onClose={handleModalClose}
              connection={selectedConnection}
              currentCompanyId={currentCompanyId}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CompanyConnectionsManager;
