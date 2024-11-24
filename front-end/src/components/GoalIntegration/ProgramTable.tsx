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
import { ProgramType } from "../../utils/types";

interface ProgramTableProps {
  programs: ProgramType[];
  selectedProgram: ProgramType | null;
  onSelectProgram: (program: ProgramType) => void;
}

const ProgramTable: React.FC<ProgramTableProps> = ({
  programs,
  selectedProgram,
  onSelectProgram,
}) => {
  return (
    <TableContainer>
      <Typography variant="h6">Programs</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Select</TableCell>
            <TableCell>Program Title</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>End Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {programs.map((program) => (
            <TableRow key={program.programId}>
              <TableCell>
                <Checkbox
                  checked={selectedProgram?.programId === program.programId}
                  onChange={() => onSelectProgram(program)}
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

