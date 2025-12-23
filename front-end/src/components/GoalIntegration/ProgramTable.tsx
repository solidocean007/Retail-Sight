// ProgramTable.tsx
import React from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Typography,
} from "@mui/material";
import { GalloProgramType } from "../../utils/types";

type EnrichedGalloProgram = GalloProgramType & {
  __debug?: {
    hasMarketId: boolean;
    startDateUnix?: number;
    endDateUnix?: number;
    rawKeys: string[];
  };
};

interface ProgramTableProps {
  programs: GalloProgramType[] | EnrichedGalloProgram[];
  selectedProgram: GalloProgramType | null;
  onSelectProgram: (program: GalloProgramType | null) => void;
}

function isEnrichedProgram(
  program: GalloProgramType | EnrichedGalloProgram
): program is EnrichedGalloProgram {
  return "__debug" in program;
}

const ProgramTable: React.FC<ProgramTableProps> = ({
  programs,
  selectedProgram,
  onSelectProgram,
}) => {
  // i need to think about what to do if we already have goals created for accounts that come from programs fetched again.
  return (
    <TableContainer>
      {programs.length > 0 && <Typography variant="h6">Programs</Typography>}
      <Table>
        {programs.length > 0 && (
          <TableHead>
            <TableRow>
              <TableCell>Select</TableCell>
              <TableCell>Program Title</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Market</TableCell>
              <TableCell>Debug</TableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {Array.isArray(programs) &&
            programs.map((program) => (
              <TableRow
                key={`${program.programId}-${program.marketId ?? "nomarket"}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedProgram?.programId === program.programId}
                    onChange={() =>
                      selectedProgram?.programId === program.programId
                        ? onSelectProgram(null)
                        : onSelectProgram(program)
                    }
                  />
                </TableCell>

                <TableCell>{program.programTitle}</TableCell>
                <TableCell>{program.startDate}</TableCell>
                <TableCell>{program.endDate}</TableCell>
                <TableCell>{program.marketId || "—"}</TableCell>

                <TableCell>
                  {isEnrichedProgram(program) && (
                    <Typography variant="caption">
                      keys:{program.__debug?.rawKeys.length}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProgramTable;
