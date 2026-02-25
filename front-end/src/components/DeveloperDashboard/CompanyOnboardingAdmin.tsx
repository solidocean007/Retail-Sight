import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Chip, LinearProgress, Button, Typography } from "@mui/material";
import { Verified } from "@mui/icons-material";
import { collection, getDoc, doc, onSnapshot, query } from "firebase/firestore";
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
  const [requests, setRequests] = useState<Row[]>([]);
  const [companies, setCompanies] = useState<Row[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "verified" | "suspended"
  >("all");

  //
  // ACCESS REQUESTS LISTENER
  //
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "accessRequests")),
      (snap) => {
        const mapped = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            companyName: data.companyName ?? "Unknown",
            requesterEmail: data.workEmail,
            requesterName:
              `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
            status: (data.status ?? "pending-approval") as Row["status"],
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? "",
          } as Row;
        });

        setRequests(mapped);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  //
  // COMPANIES LISTENER
  //
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "companies")), (snap) => {
      const mapped = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          companyName: data.companyName ?? "Unnamed Company",
          status: "live" as const,
          companyVerified: !!data.verified,
          onboardingScore: data.onboardingScore ?? 0,
          accessStatus: data.accessStatus ?? "on",
        } as Row;
      });

      setCompanies(mapped);
    });

    return () => unsub();
  }, []);

  //
  // DERIVED ROWS
  //
  const rows = useMemo(() => {
    const all = [...requests, ...companies];

    if (filter === "all") return all;

    return all.filter((r) => {
      if (filter === "pending") return r.status === "pending-approval";
      if (filter === "approved") return r.status === "approved";
      if (filter === "verified") return !!r.companyVerified;
      if (filter === "suspended") return r.accessStatus === "off";
      return true;
    });
  }, [requests, companies, filter]);

  //
  // COLUMNS
  //
  const columns: GridColDef<Row>[] = [
    {
      field: "companyName",
      headerName: "Company",
      flex: 1.2,
      renderCell: (params: GridRenderCellParams<Row>) => (
        <Box display="flex" alignItems="center" gap={1}>
          {params.row.companyVerified && (
            <Verified fontSize="small" color="success" />
          )}
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
      {/* FILTER BAR */}
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Box display="flex" gap={1}>
          {["all", "pending", "approved", "verified", "suspended"].map(
            (key) => (
              <Button
                key={key}
                variant={filter === key ? "contained" : "outlined"}
                onClick={() => setFilter(key as typeof filter)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Button>
            ),
          )}
        </Box>

        <Button variant="contained">Export CSV</Button>
      </Box>

      {/* GRID */}
      <div style={{ height: 640, width: "100%" }}>
        <DataGrid<Row>
          rows={rows}
          columns={columns}
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          onRowClick={async (p) => {
            const snap = await getDoc(doc(db, "companies", p.row.id));
            if (snap.exists()) {
              setSelectedCompany({
                id: snap.id,
                ...snap.data(),
              });
            }
          }}
          sx={{
            "& .MuiDataGrid-row": {
              cursor: "pointer",
            },
          }}
        />
      </div>

      {/* DRAWER */}
      {selectedCompany && (
        <CompanyDrawer
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onChanged={(updated) => setSelectedCompany(updated)}
        />
      )}
    </Box>
  );
}
