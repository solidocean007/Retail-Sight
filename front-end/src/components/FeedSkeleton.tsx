import './feedSkeleton.css';

export default function FeedSkeleton({ count = 6 }) {
  return (
    <div className="feed-skeleton-wrapper">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}
