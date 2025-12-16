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

interface ProgramTableProps {
  programs: GalloProgramType[];
  selectedProgram: GalloProgramType | null;
  onSelectProgram: (program: GalloProgramType | null) => void;
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
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {Array.isArray(programs) &&
            programs.map((program) => (
              <TableRow key={program.programId}>
                <TableCell>
                  <Checkbox
                    checked={selectedProgram?.programId === program.programId}
                    onChange={
                      () =>
                        selectedProgram?.programId === program.programId
                          ? onSelectProgram(null) // Deselect if already selected
                          : onSelectProgram(program) // Select the clicked program
                    }
                  />
                </TableCell>
                <TableCell>{program.programTitle}</TableCell>
                <TableCell>{program.startDate}</TableCell>
                <TableCell>{program.endDate}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProgramTable;
