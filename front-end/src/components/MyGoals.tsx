// MyGoals.tsx
import { Container, Typography } from "@mui/material";
import MyCompanyGoals from "./MyCompanyGoals";
import MyGalloGoals from "./MyGalloGoals";

const MyGoals = () => {
  return (
    <Container>
      <Typography variant="h2" sx={{ flexGrow: 1, fontSize: "large" }} >My Goals</Typography>
      <MyCompanyGoals />
      <MyGalloGoals />
    </Container>
  );
};

export default MyGoals;
