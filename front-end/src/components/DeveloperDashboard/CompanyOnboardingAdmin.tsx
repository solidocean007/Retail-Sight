import { useEffect, useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  Box,
  Chip,
  LinearProgress,
  Button,
  Typography,
} from "@mui/material";
import { Verified } from "@mui/icons-material";
import {
  collection,
  onSnapshot,
  query,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import CompanyDrawer from "./CompanyDrawer";

type Row = {
  id: string;
  companyName: string;
  requesterEmail?: string;
  requesterName?: string;
  status: "pending-approval" | "approved" | "rejected" | "live";
  companyVerified?: boolean;
  createdAt?: string;
  onboardingScore?: number;
  accessStatus?: "off" | "limited" | "on";
};

export default function CompanyOnboardingAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "verified" | "suspended">("all");

  useEffect(() => {
    const unsubRequests = onSnapshot(
      query(collection(db, "accessRequests")),
      (snap) => {
        const requests = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            companyName: data.companyName ?? "Unknown",
            requesterEmail: data.workEmail,
            requesterName: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
            status: (data.status ?? "pending-approval") as Row["status"],
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? "",
          } as Row;
        });
        setRows((prev) => {
          // Merge with any existing company rows (optional step)
          const existing = prev.filter((p) => p.status === "live");
          return [...requests, ...existing];
        });
        setLoading(false);
      }
    );

    const unsubCompanies = onSnapshot(
      query(collection(db, "companies")),
      (snap) => {
        const companies = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            companyName: data.companyName ?? "Unnamed Company",
            status: "live" as const,
            companyVerified: !!data.verified,
            onboardingScore: data.onboardingScore ?? 0,
            accessStatus: data.accessStatus ?? "on",
          };
        });
        setRows((prev) => {
          const requests = prev.filter((p) => p.status !== "live");
          return [...requests, ...companies];
        });
      }
    );

    return () => {
      unsubRequests();
      unsubCompanies();
    };
  }, []);

  const filteredRows =
    filter === "all"
      ? rows
      : rows.filter((r) => {
          if (filter === "pending") return r.status === "pending-approval";
          if (filter === "approved") return r.status === "approved";
          if (filter === "verified") return !!r.companyVerified;
          if (filter === "suspended") return r.accessStatus === "off";
          return true;
        });

  const columns: GridColDef<Row>[] = [
    {
      field: "companyName",
      headerName: "Company",
      flex: 1.2,
      renderCell: (params: GridRenderCellParams<Row>) => (
        <Box display="flex" alignItems="center" gap={1}>
          {params.row.companyVerified && <Verified fontSize="small" color="success" />}
          <Typography variant="body2" fontWeight={600}>
            {params.row.companyName}
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (params: GridRenderCellParams<Row>) => {
        const status = params.row.status;
        const color =
          status === "approved"
            ? "success"
            : status === "pending-approval"
            ? "warning"
            : status === "rejected"
            ? "error"
            : "default";
        return (
          <Chip
            size="small"
            color={color as any}
            label={status.replace("-", " ").toUpperCase()}
          />
        );
      },
    },
    {
      field: "requester",
      headerName: "Requester",
      width: 220,
      renderCell: (p) => (
        <Typography variant="body2">
          {p.row.requesterName || "—"}
          <br />
          <small>{p.row.requesterEmail}</small>
        </Typography>
      ),
    },
    {
      field: "onboardingScore",
      headerName: "Onboarding",
      width: 140,
      renderCell: (params) =>
        params.row.onboardingScore !== undefined ? (
          <Box width="100%">
            <LinearProgress
              variant="determinate"
              value={params.row.onboardingScore}
            />
            <small>{params.row.onboardingScore}%</small>
          </Box>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Box display="flex" gap={1}>
          <Button
            variant={filter === "all" ? "contained" : "outlined"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "pending" ? "contained" : "outlined"}
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={filter === "approved" ? "contained" : "outlined"}
            onClick={() => setFilter("approved")}
          >
            Approved
          </Button>
          <Button
            variant={filter === "verified" ? "contained" : "outlined"}
            onClick={() => setFilter("verified")}
          >
            Verified
          </Button>
          <Button
            variant={filter === "suspended" ? "contained" : "outlined"}
            onClick={() => setFilter("suspended")}
          >
            Suspended
          </Button>
        </Box>
        <Button variant="contained">Export CSV</Button>
      </Box>

      <div style={{ height: 640, width: "100%" }}>
        <DataGrid<Row>
          rows={filteredRows}
          columns={columns}
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          onRowClick={(p) => setSelected(p.row)}
        />
      </div>

      {false && selected && ( // need to revisit this later
        <CompanyDrawer
          company={selected as any}
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
