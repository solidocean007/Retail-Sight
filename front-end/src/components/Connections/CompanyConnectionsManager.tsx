import React, { useState, useEffect } from "react";
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
import { getPlanDetails } from "../../utils/getPlanDetails";
import { setPlan, setLoading } from "../../Slices/planSlice";
import InviteAndConnectModal from "./InviteAndConnectModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import IdentifyCompany from "./IdentifyCompany";

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
    (state: RootState) => state.companyConnections
  );

  // ✅ Access plan data from Redux (cached + persisted)
  const { currentPlan, loading } = useSelector((s: RootState) => s.planSlice);
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

  const [lookupCompanyName, setLookupCompanyName] = useState("");
  const [lookupCompanyType, setLookupCompanyType] = useState("");

  // 🧮 Derive limits and usage
  const planLimit = currentPlan?.connectionLimit ?? 0;
  const extraConnections = usersCompany?.billing?.addons?.extraConnection ?? 0;
  const approvedConnections = connections.filter(
    (c) => c.status === "approved"
  ).length;

  const pendingConnections = connections.filter(
    (c) => c.status === "pending"
  ).length;

  const connectionLimitReached = // 'connectionLimitReached' is declared but its value is never read
    approvedConnections >= planLimit + extraConnections;

  // ✅ Load plan once (or refresh if plan name changed)
  useEffect(() => {
    const loadPlan = async () => {
      if (currentPlan?.name === usersCompany?.billing?.plan) return; // only reload if different
      if (!usersCompany?.billing?.plan) return;

      dispatch(setLoading(true));
      try {
        const plan = await getPlanDetails(usersCompany.billing.plan);
        dispatch(setPlan(plan));
      } catch (err) {
        console.error("Failed to fetch plan details:", err);
      } finally {
        dispatch(setLoading(false));
      }
    };
    loadPlan();
  }, [usersCompany?.billing?.plan]);

  // ✅ Load connections (cached + remote)
  useEffect(() => {
    if (!currentCompanyId) return;
    const loadConnections = async () => {
      try {
        const cached = await getCompanyConnectionsStore(currentCompanyId);
        if (cached?.connections)
          dispatch(setCachedConnections(cached.connections));
        await dispatch(fetchCompanyConnections(currentCompanyId));
      } catch (error) {
        console.error("Error loading cached connections:", error);
      }
    };
    loadConnections();
  }, [currentCompanyId, dispatch]);

  // 🧩 Handle connection creation
  const handleConfirmRequest = async (
    emailInput: string,
    brandSelection: string[]
  ) => {
    if (!user || !usersCompany || !currentCompanyId) return;
    try {
      await dispatch(
        createConnectionRequest({
          currentCompanyId,
          user,
          emailInput,
          brandSelection,
        })
      ).unwrap();

      dispatch(showMessage("Connection request sent successfully."));
      await dispatch(fetchCompanyConnections(currentCompanyId));
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

  const totalLimit = planLimit + (extraConnections || 0);
  const progressPercent = totalLimit
    ? Math.min((approvedConnections / totalLimit) * 100, 100)
    : 0;

  return (
    <div className="connections-dashboard">
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
                    Free plans include 2 connections. Upgrading raises your
                    limit instantly.
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
        {!loading && (
          <div className="tier-status">
            <strong>
              Your Plan:{" "}
              {currentPlan?.name
                ? currentPlan.name.charAt(0).toUpperCase() +
                  currentPlan.name.slice(1)
                : "—"}
            </strong>
            <div className="tier-bar">
              <div
                className="tier-progress"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <small>
              {approvedConnections} of {totalLimit} connections used
            </small>

            {pendingConnections > 0 && (
              <div className="pending-badge">
                {pendingConnections} pending — does not count toward your limit
              </div>
            )}

            <div className="connection-create-card">
              <h4>Create New Connection</h4>
              <p>Invite another company to connect and share brand activity.</p>

              <button
                className="button-primary create-connection-btn"
                onClick={() => setStep(1)}
                disabled={connectionLimitReached}
              >
                + New Connection
              </button>
            </div>
          </div>
        )}

        <h3>Existing Connections</h3>
        <p className="section-hint">
          Review current connections, pending requests, and shared brands.
        </p>

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
              "Invite sent. The connection will auto-stage when they join."
            )
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
