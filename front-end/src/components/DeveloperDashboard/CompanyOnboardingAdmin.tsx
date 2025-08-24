// components/admin/CompanyOnboardingAdmin.tsx
import { useEffect, useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridValueGetter,
} from "@mui/x-data-grid";
import { Box, Chip, LinearProgress, Button } from "@mui/material";
import { Verified } from "@mui/icons-material";
import { collection, onSnapshot, query } from "firebase/firestore";
import CompanyDrawer from "./CompanyDrawer";
import { db } from "../../utils/firebase";
import { normalizeCompany } from "./normalizeCompany";
import IntegrationsManager from "./IntegrationsManager";

type Row = {
  id: string;
  companyName: string;
  companyVerified: boolean;
  tier: "free" | "pro" | "enterprise";
  primaryContact?: { name?: string; email?: string; phone?: string };
  counts: {
    usersTotal: number;
    usersPending: number;
    connectionsApproved: number;
    connectionsPending: number;
    brands: number;
    products: number;
    accounts: number;
    goalsActive: number;
  };
  onboardingScore: number;
  accessStatus: "off" | "limited" | "on";
  createdAt?: string;
};

export default function CompanyOnboardingAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);

  useEffect(() => {
    const q = query(collection(db, "companies"));
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => normalizeCompany(d.id, d.data())));
      setLoading(false);
    });
  }, []);

  const columns: GridColDef<Row>[] = [
    {
      field: "companyName",
      headerName: "Company",
      flex: 1.1,
      renderCell: (params: GridRenderCellParams<Row>) => (
        <Box display="flex" alignItems="center" gap={1}>
          {params.row.companyVerified && <Verified fontSize="small" />}
          <strong>{params.row.companyName}</strong>
          <Chip
            size="small"
            label={(params.row.tier ?? "free").toUpperCase()}
            variant="outlined"
          />
        </Box>
      ),
    },
    {
      field: "users",
      headerName: "Users",
      width: 120,
      renderCell: (params: GridRenderCellParams<Row>) => {
        const total = params.row?.counts?.usersTotal ?? 0;
        const pending = params.row?.counts?.usersPending ?? 0;
        return (
          <div>
            {total} <small>{pending ? `(${pending} pending)` : ""}</small>
          </div>
        );
      },
    },

    {
      field: "onboardingScore",
      headerName: "Onboarding",
      width: 160,
      renderCell: (params: GridRenderCellParams<Row>) => (
        <Box width="100%">
          <LinearProgress
            variant="determinate"
            value={params.row.onboardingScore ?? 0}
          />
          <small>{params.row.onboardingScore ?? 0}%</small>
        </Box>
      ),
    },
    {
      field: "accessStatus",
      headerName: "Access",
      width: 120,
      renderCell: (params: GridRenderCellParams<Row>) => {
        const status = (params.row.accessStatus ?? "off") as
          | "off"
          | "limited"
          | "on";
        return (
          <Chip
            size="small"
            color={
              status === "on"
                ? "success"
                : status === "limited"
                ? "warning"
                : "default"
            }
            label={status.toUpperCase()}
          />
        );
      },
    },
    // inside columns in CompanyOnboardingAdmin
    {
      field: "integrations",
      headerName: "Integrations",
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <IntegrationsManager
          companyId={params.row.id}
          value={(params.row as any).integrations} // pass current map if you add it to normalizeCompany
        />
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Box display="flex" gap={1}>
          <Button variant="outlined">All</Button>
          <Button variant="outlined">Pending</Button>
          <Button variant="outlined">Verified</Button>
          <Button variant="outlined">Suspended</Button>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="contained">Export CSV</Button>
        </Box>
      </Box>

      <div style={{ height: 640, width: "100%" }}>
        <DataGrid<Row>
          rows={rows}
          columns={columns}
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          onRowClick={(p) => setSelected(p.row)}
        />
      </div>

      {selected && (
        <CompanyDrawer
          company={selected}
          onClose={() => setSelected(null)}
          onChanged={(updated) =>
            setRows((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            )
          }
        />
      )}
    </Box>
  );
}
