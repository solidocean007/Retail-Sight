// MissionIntegrationView.tsx
import { useState, useEffect } from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { AccountType, GoalType, ProgramType } from "../../utils/types";
import fetchExternalApiKey from "../ApiKeyLogic/fetchExternalApiKey";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import dayjs, { Dayjs } from "dayjs";
import DateSelector from "./DateSelector";
import ProgramTable from "./ProgramTable";
import GoalTable from "./GoalTable";
import AccountTable from "./AccountTable";

const MissionIntegrationViewGallo = () => {
  const [apiKey, setApiKey] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ProgramType | null>(
    null
  );
  const [goals, setGoals] = useState<GoalType[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null); // Track selected goal
  const [accounts, setAccounts] = useState<AccountType[]>([]); // State for accounts
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const baseUrl = "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

  useEffect(() => {
    // Fetch API key only once
    if (companyId) {
      fetchExternalApiKey(companyId, "galloApiKey").then(setApiKey);
    }
  }, [companyId]);

  const getUnixTimestamp = (date: Dayjs | null): string => {
    return date ? date.unix().toString() : "";
  };

  const fetchPrograms = async () => {
    if (!companyId || !apiKey) return;

    const startDateUnix = getUnixTimestamp(startDate);
    const url = `${baseUrl}/healy/programs?startDate=${startDateUnix}`;

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    };

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/fetchData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );

      const data = await response.json();
      setPrograms(data); // Assuming data contains program list
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchGoals = async () => {
    if (!selectedProgram || !apiKey) return;

    const url = `${baseUrl}/healy/goals?programId=${selectedProgram.programId}&marketId=${selectedProgram.marketId}`;
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    };

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/fetchData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );

      const data = await response.json();
      console.log(data);
      setGoals(data); // Assuming data contains goals list
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  // Fetch accounts based on marketId from selectedProgram and goalId from selectedGoal
  const fetchAccounts = async () => {
    if (!selectedProgram || !selectedGoal || !apiKey) return;

    const url = `${baseUrl}/healy/accounts?marketId=${selectedProgram.marketId}&goalId=${selectedGoal.goalId}`;
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    };

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/fetchData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );

      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  return (
    <Container>
      <Box>
        <DateSelector
          startDate={startDate}
          onDateChange={setStartDate}
          onFetchPrograms={fetchPrograms}
        />
        <ProgramTable
          programs={programs}
          selectedProgram={selectedProgram}
          onSelectProgram={setSelectedProgram}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={fetchGoals}
          disabled={!selectedProgram}
        >
          Search Goals
        </Button>
        {goals.length > 0 && (
          <GoalTable
            goals={goals}
            selectedGoal={selectedGoal}
            onSelectGoal={setSelectedGoal}
          />
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={fetchAccounts}
          disabled={!selectedProgram}
        >
          Fetch Accounts
        </Button>
        {accounts.length > 0 && <AccountTable accounts={accounts} />}
      </Box>
    </Container>
  );
};

export default MissionIntegrationViewGallo;
