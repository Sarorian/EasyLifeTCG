import "./Home.css";

const stats = [
  { label: "Total Matches", value: "—" },
  { label: "Active Players", value: "—" },
  { label: "Most Played Legend", value: "—" },
  { label: "Top Player", value: "—" },
];

export default function Home() {
  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-hero-glow" />
        <h1 className="home-title">EasyLife TCG</h1>
        <p className="home-subtitle">
          Match Tracker · Statistics · Player Records
        </p>
        <div className="home-divider" />
        <p className="home-desc">Hi</p>
      </div>

      <div className="home-stats">
        {stats.map(({ label, value }) => (
          <div key={label} className="home-stat-card">
            <div className="home-stat-corner-tr" />
            <div className="home-stat-value">{value}</div>
            <div className="home-stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
