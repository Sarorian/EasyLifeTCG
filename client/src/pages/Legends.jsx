import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Legends.css";

import API from "../api";

export default function Legends() {
  const [legends, setLegends] = useState([]);
  const [matches, setMatches] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([API.get("/legends"), API.get("/matches")]).then(([l, m]) => {
      setLegends(l.data);
      setMatches(m.data);
      setLoading(false);
    });
  }, []);

  // Build a set of legends that have match data
  const legendsWithData = new Set();
  matches.forEach((m) => {
    if (m.player1Legend) legendsWithData.add(m.player1Legend);
    if (m.player2Legend) legendsWithData.add(m.player2Legend);
  });

  // Get overall WR for a legend using exact champion name matching
  const getLegendWR = (legendName) => {
    const championName = legendName.split(",")[0].trim();
    const relevant = matches.filter((m) => {
      const p1Match =
        m.player1Legend === legendName || m.player1Legend === championName;
      const p2Match =
        m.player2Legend === legendName || m.player2Legend === championName;
      return p1Match || p2Match;
    });
    if (!relevant.length) return null;
    let wins = 0;
    relevant.forEach((m) => {
      const isP1 =
        m.player1Legend === legendName || m.player1Legend === championName;
      const won =
        (isP1 && m.matchWinner === "Player1") ||
        (!isP1 && m.matchWinner === "Player2");
      if (won) wins++;
    });
    return {
      wins,
      losses: relevant.length - wins,
      total: relevant.length,
      wr: ((wins / relevant.length) * 100).toFixed(1),
    };
  };

  const filtered = legends.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div className="lg-loading">Loading...</div>;

  return (
    <div className="lg-page">
      <div className="lg-header">
        <div className="lg-header-glow" />
        <h1 className="lg-title">Legends</h1>
        <p className="lg-sub">
          {legends.length} legends · {legendsWithData.size} with match data
        </p>
      </div>

      <div className="lg-container">
        <input
          className="lg-search"
          placeholder="Search legends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="lg-grid">
          {filtered.map((legend) => {
            const cardChamp = legend.name.split(",")[0].trim();

            // Exact champion name match only — no partial includes
            const hasData = [...legendsWithData].some((n) => {
              const storedChamp = n.split(",")[0].trim();
              return n === legend.name || storedChamp === cardChamp;
            });

            const stats = getLegendWR(legend.name);

            return (
              <div
                key={legend._id}
                className={`lg-card ${!hasData ? "lg-card-no-data" : ""}`}
                onClick={() =>
                  hasData &&
                  navigate(`/legends/${encodeURIComponent(legend.name)}`)
                }
                style={
                  legend.imageUrl
                    ? {
                        backgroundImage: `url(${legend.imageUrl}?auto=format&fit=fill&q=80&w=400)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center 20%",
                      }
                    : {}
                }
              >
                <div
                  className={`lg-card-overlay ${!hasData ? "lg-card-overlay-dark" : ""}`}
                />
                <div className="lg-card-content">
                  <div className="lg-card-name">
                    {legend.name.split(",")[0]}
                  </div>
                  <div className="lg-card-title">
                    {legend.name.split(",")[1]?.trim()}
                  </div>
                  {hasData && stats ? (
                    <div className="lg-card-stats">
                      <span className="lg-card-wr">{stats.wr}%</span>
                      <span className="lg-card-record">
                        {stats.wins}W — {stats.losses}L
                      </span>
                    </div>
                  ) : (
                    <div className="lg-card-no-data-label">No data yet</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
