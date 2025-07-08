import { useState } from "react";
import { Box, Collapse, Badge, Button } from "@mui/material";
import { CompanyGoalWithIdType } from "../../utils/types";
import CompanyGoalCard from "./CompanyGoalCard";

interface ArchivedGoalsLayoutProps {
  archivedGoals: CompanyGoalWithIdType[];
  isMobile?: boolean;
  salesRouteNum?: string;
}


const ArchivedGoalsLayout = ({ archivedGoals, isMobile, salesRouteNum }: ArchivedGoalsLayoutProps) => {
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Group goals by Year and Month
  const groupedGoals = archivedGoals.reduce<Record<string, Record<string, CompanyGoalWithIdType[]>>>(
    (acc, goal) => {
      const date = new Date(goal.goalEndDate);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString("default", { month: "long" });

      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      acc[year][month].push(goal);

      return acc;
    },
    {}
  );

  return (
    <Box mt={2}>
      {Object.entries(groupedGoals)
        .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA)) // newest years first
        .map(([year, months]) => (
          <Box key={year} mb={2}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setExpandedYear(expandedYear === year ? null : year)}
            >
              {year} ({Object.values(months).flat().length} goals)
            </Button>
            <Collapse in={expandedYear === year}>
              <Box ml={2} mt={1}>
                {Object.entries(months)
                  .sort(
                    ([monthA], [monthB]) =>
                      new Date(`${monthB} 1, ${year}`).getTime() -
                      new Date(`${monthA} 1, ${year}`).getTime()
                  )
                  .map(([month, goals]) => (
                    <Box key={month} mb={1}>
                      <Button
                        variant="text"
                        onClick={() =>
                          setExpandedMonth(expandedMonth === `${year}-${month}` ? null : `${year}-${month}`)
                        }
                      >
                        {month}{" "}
                        <Badge color="primary" badgeContent={goals.length} sx={{ ml: 1 }} />
                      </Button>
                      <Collapse in={expandedMonth === `${year}-${month}`}>
                        <Box ml={3}>
                          {goals.map((goal) => (
                            <CompanyGoalCard key={goal.id} goal={goal} mobile={isMobile} salesRouteNum={salesRouteNum} />
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
                  ))}
              </Box>
            </Collapse>
          </Box>
        ))}
    </Box>
  );
};

export default ArchivedGoalsLayout;
