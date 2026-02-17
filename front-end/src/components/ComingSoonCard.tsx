type ComingSoonCardProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
};

export function ComingSoonCard({
  title,
  description,
  icon,
}: ComingSoonCardProps) {
  return (
    <div className="coming-soon-card">
      <div className="coming-soon-header">
        {icon}
        <h3>{title}</h3>
      </div>
      <p>{description}</p>
      <span className="coming-soon-badge">Coming soon</span>
    </div>
  );
}
