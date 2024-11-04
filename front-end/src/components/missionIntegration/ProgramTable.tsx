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
  selectedPrograms: string[];
  onSelectProgram: (programId: string) => void;
  onFetchGoals: (type: "programs" | "goals", additionalParams?: { [key: string]: string }) => Promise<void>;
}

const ProgramTable: React.FC<ProgramTableProps> = ({
  programs,
  selectedPrograms,
  onSelectProgram,
  onFetchGoals,
}) => {
  console.log(programs)
  // there should probably be a button in this table to trigger the onFetchGoals for this program.  when a program is selected we should track the state of
  // programId and marketId. those parameters should be passed to the onFetchGoals function to look like this:
  // https://https://6w7u156vcb.execute-api.us-west-2.amazonaws.com/healy/goals?marketId={marketId}&programId={programId}
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
          {programs.length > 0 && programs.map((program) => (
            <TableRow key={program.programId}>
              <TableCell>
                <Checkbox
                  checked={selectedPrograms.includes(program.programId)}
                  onChange={() => onSelectProgram(program.programId)}
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

