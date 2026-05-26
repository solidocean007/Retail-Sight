import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { db } from "../../utils/firebase";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";

type CompanyRow = {
  id: string;
  companyName: string;
  companyType?: string;
  accountsId?: string;
};

type AccountSyncConfig = {
  id?: string;
  domain: string;
  enabled: boolean;
  provider: "encompass";
  source: string;
  companyId: string;
  companyName: string;
  inboundEmailAlias: string;
  reportId: string;
  requestDashboardId: string;
  tableName: string;
  selectMaxRecords: number;
  parameters: string;
  selectDisplayInParent: string;
  autoApplyDelayHours: number;
  createdAt?: any;
  updatedAt?: any;
};

const DEFAULT_SELECT_DISPLAY_IN_PARENT =
  "Customer ID,Stops_Customers^Customers.Company,Stops_Customers^Customers.Address,Stops_Customers^Customers.City,Stops_Customers^Customers.State,Stops_Routes^Routes.RouteNum,Stops_Customers^Customers_CustomerTypes^CustomerTypes.CustomerType,Stops_Customers^Customers.CustomerTypeID,Stops_Customers^Customers_Chains^Chains.Chain,Stops_Customers^Customers_Chains^Chains.IsIndependent";

const DEFAULT_PARAMETERS =
  "F:Active~V:Active~O:E|F:ActivityIDEffective~V:3^21^23^22~O:E";

const buildEmptyConfig = (company?: CompanyRow): AccountSyncConfig => ({
  domain: "",
  enabled: true,
  provider: "encompass",
  source: "sendgrid-inbound-email",
  companyId: company?.id ?? "",
  companyName: company?.companyName ?? "",
  inboundEmailAlias: "accounts@imports.displaygram.com",
  reportId: "24408998",
  requestDashboardId: "100100",
  tableName: "Stops",
  selectMaxRecords: 5000,
  parameters: DEFAULT_PARAMETERS,
  selectDisplayInParent: DEFAULT_SELECT_DISPLAY_IN_PARENT,
  autoApplyDelayHours: 12,
});

export default function DeveloperAccountSyncConfigs() {
  const dispatch = useAppDispatch();

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [configs, setConfigs] = useState<AccountSyncConfig[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(
    null,
  );
  const [form, setForm] = useState<AccountSyncConfig>(buildEmptyConfig());
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const configByCompanyId = useMemo(() => {
    const map = new Map<string, AccountSyncConfig>();

    configs.forEach((config) => {
      if (config.companyId) {
        map.set(config.companyId, config);
      }
    });

    return map;
  }, [configs]);

  const loadData = async () => {
    setLoading(true);

    try {
      const [companiesSnap, configsSnap] = await Promise.all([
        getDocs(collection(db, "companies")),
        getDocs(collection(db, "accountSyncConfigs")),
      ]);

      const nextCompanies: CompanyRow[] = companiesSnap.docs
        .map((d) => {
          const data = d.data() as any;

          return {
            id: d.id,
            companyName: data.companyName ?? data.name ?? "Unnamed Company",
            companyType: data.companyType,
            accountsId: data.accountsId,
          };
        })
        .sort((a, b) => a.companyName.localeCompare(b.companyName));

      const nextConfigs: AccountSyncConfig[] = configsSnap.docs.map((d) => {
        const data = d.data() as Partial<AccountSyncConfig>;

        return {
          ...buildEmptyConfig(),
          ...data,
          id: d.id,
          domain: data.domain || d.id,
        };
      });

      setCompanies(nextCompanies);
      setConfigs(nextConfigs);
    } catch (err) {
      console.error(err);
      dispatch(showMessage("Failed to load account sync config data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = (company: CompanyRow) => {
    setSelectedCompany(company);
    setForm(buildEmptyConfig(company));
    setModalOpen(true);
  };

  const openEditModal = (company: CompanyRow, config: AccountSyncConfig) => {
    setSelectedCompany(company);
    setForm({
      ...buildEmptyConfig(company),
      ...config,
      companyId: company.id,
      companyName: company.companyName,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedCompany(null);
    setForm(buildEmptyConfig());
  };

  const updateField = <K extends keyof AccountSyncConfig>(
    key: K,
    value: AccountSyncConfig[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const cleanCommaList = (value: string) =>
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(",");

  const handleSave = async () => {
    const domain = form.domain.trim().toLowerCase();

    if (!selectedCompany) {
      dispatch(showMessage("Select a company first."));
      return;
    }

    if (!domain) {
      dispatch(showMessage("Domain is required."));
      return;
    }

    if (form.provider !== "encompass") {
      dispatch(showMessage("Only Encompass is supported right now."));
      return;
    }

    setSaving(true);

    try {
      const existing = configs.find((config) => config.id === domain);

      await setDoc(
        doc(db, "accountSyncConfigs", domain),
        {
          ...form,
          domain,
          companyId: selectedCompany.id,
          companyName: selectedCompany.companyName,
          inboundEmailAlias: form.inboundEmailAlias.trim().toLowerCase(),
          reportId: form.reportId.trim(),
          requestDashboardId: form.requestDashboardId.trim(),
          tableName: form.tableName.trim(),
          selectMaxRecords: Number(form.selectMaxRecords || 5000),
          autoApplyDelayHours: Number(form.autoApplyDelayHours || 12),
          parameters: form.parameters.trim(),
          selectDisplayInParent: cleanCommaList(form.selectDisplayInParent),
          updatedAt: serverTimestamp(),
          ...(existing ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true },
      );

      dispatch(showMessage("Account sync config saved."));
      await loadData();
      closeModal();
    } catch (err) {
      console.error(err);
      dispatch(showMessage("Failed to save account sync config."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (config: AccountSyncConfig) => {
    if (!config.domain) return;

    const ok = window.confirm(`Delete config for ${config.domain}?`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "accountSyncConfigs", config.domain));
      dispatch(showMessage("Account sync config deleted."));
      await loadData();
    } catch (err) {
      console.error(err);
      dispatch(showMessage("Failed to delete account sync config."));
    }
  };

  return (
    <Box mt={3}>
      <Box display="flex" justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Typography variant="h6">Account Sync Configs</Typography>
          <Typography variant="body2">
            Developer-managed integrations for automated account imports.
          </Typography>
        </Box>

        <Button variant="outlined" onClick={loadData} disabled={loading}>
          Refresh
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Accounts Ready</TableCell>
              <TableCell>Sync Status</TableCell>
              <TableCell>Domain</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Report</TableCell>
              <TableCell>Inbound Email</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>Loading…</TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>No companies found.</TableCell>
              </TableRow>
            ) : (
              companies.map((company) => {
                const config = configByCompanyId.get(company.id);
                const hasAccounts = Boolean(company.accountsId);

                return (
                  <TableRow key={company.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {company.companyName}
                      </Typography>
                      <Typography variant="caption">{company.id}</Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        color={hasAccounts ? "success" : "warning"}
                        label={hasAccounts ? "Has accountsId" : "No accountsId"}
                      />
                    </TableCell>

                    <TableCell>
                      {config ? (
                        <Chip
                          size="small"
                          color={config.enabled ? "success" : "default"}
                          label={config.enabled ? "Enabled" : "Disabled"}
                        />
                      ) : (
                        <Chip size="small" label="Not configured" />
                      )}
                    </TableCell>

                    <TableCell>{config?.domain ?? "—"}</TableCell>
                    <TableCell>{config?.provider ?? "—"}</TableCell>
                    <TableCell>
                      {config
                        ? `${config.reportId} / ${config.requestDashboardId}`
                        : "—"}
                    </TableCell>
                    <TableCell>{config?.inboundEmailAlias ?? "—"}</TableCell>

                    <TableCell align="right">
                      {config ? (
                        <Box display="flex" justifyContent="flex-end" gap={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openEditModal(company, config)}
                          >
                            Edit
                          </Button>

                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleDelete(config)}
                          >
                            Delete
                          </Button>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => openCreateModal(company)}
                          disabled={!hasAccounts}
                        >
                          Configure
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>
          {form.id ? "Edit Account Sync Config" : "Configure Account Sync"}
        </DialogTitle>

        <DialogContent>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mt={1}>
            <TextField
              label="Company"
              size="small"
              value={selectedCompany?.companyName ?? ""}
              disabled
            />

            <TextField
              label="Company ID"
              size="small"
              value={selectedCompany?.id ?? ""}
              disabled
            />

            <TextField
              label="Domain / Doc ID"
              size="small"
              value={form.domain}
              onChange={(e) => updateField("domain", e.target.value)}
              helperText="Example: healywholesale.net"
            />

            <TextField
              label="Provider"
              size="small"
              select
              value={form.provider}
              onChange={(e) =>
                updateField(
                  "provider",
                  e.target.value as AccountSyncConfig["provider"],
                )
              }
            >
              <MenuItem value="encompass">encompass</MenuItem>
            </TextField>

            <TextField
              label="Source"
              size="small"
              value={form.source}
              onChange={(e) => updateField("source", e.target.value)}
            />

            <TextField
              label="Inbound Email Alias"
              size="small"
              value={form.inboundEmailAlias}
              onChange={(e) => updateField("inboundEmailAlias", e.target.value)}
            />

            <TextField
              label="Report ID"
              size="small"
              value={form.reportId}
              onChange={(e) => updateField("reportId", e.target.value)}
            />

            <TextField
              label="Request Dashboard ID"
              size="small"
              value={form.requestDashboardId}
              onChange={(e) =>
                updateField("requestDashboardId", e.target.value)
              }
            />

            <TextField
              label="Table Name"
              size="small"
              value={form.tableName}
              onChange={(e) => updateField("tableName", e.target.value)}
            />

            <TextField
              label="Select Max Records"
              size="small"
              type="number"
              value={form.selectMaxRecords}
              onChange={(e) =>
                updateField("selectMaxRecords", Number(e.target.value))
              }
            />

            <TextField
              label="Auto Apply Delay Hours"
              size="small"
              type="number"
              value={form.autoApplyDelayHours}
              onChange={(e) =>
                updateField("autoApplyDelayHours", Number(e.target.value))
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={form.enabled}
                  onChange={(e) => updateField("enabled", e.target.checked)}
                />
              }
              label="Enabled"
            />
          </Box>

          <TextField
            label="Parameters"
            fullWidth
            multiline
            minRows={2}
            size="small"
            value={form.parameters}
            onChange={(e) => updateField("parameters", e.target.value)}
            sx={{ mt: 2 }}
          />

          <TextField
            label="Select Display In Parent"
            fullWidth
            multiline
            minRows={4}
            size="small"
            value={form.selectDisplayInParent}
            onChange={(e) =>
              updateField("selectDisplayInParent", e.target.value)
            }
            helperText="Comma-separated Encompass fields. Extra spaces are cleaned on save."
            sx={{ mt: 2 }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={closeModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Config"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
