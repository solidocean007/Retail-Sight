// NoContentCard.tsx
import { CardContent, Card } from "@mui/material";
import "./postCard.css";

const NoContentCard = () => {
  return (
    <Card className="no-content-container">
      <CardContent>
        <h2>No posts found</h2>
        <h2>please adjust your filters.</h2>
      </CardContent>
    </Card>
  );
};

export default NoContentCard;
