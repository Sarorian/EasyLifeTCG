import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import "./Players.css";

import API from "../api";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [legends, setLegends] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get("/players"),
      API.get("/legends"),
      API.get("/matches"),
    ]).then(([p, l, m]) => {
      setPlayers(p.data.filter((pl) => pl.gamertag !== "Random"));
      setLegends(l.data);
      setMatches(m.data);
      setLoading(false);
    });
  }, []);

  // ── Get most played legend image for a player ──
  const getLegendBg = (gamertag) => {
    const playerMatches = matches.filter(
      (m) => m.player1 === gamertag || m.player2 === gamertag,
    );
    if (!playerMatches.length) return null;

    const legendCount = {};
    playerMatches.forEach((m) => {
      const isP1 = m.player1 === gamertag;
      const legend = isP1 ? m.player1Legend : m.player2Legend;
      legendCount[legend] = (legendCount[legend] || 0) + 1;
    });

    const mostPlayed = Object.entries(legendCount).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    if (!mostPlayed) return null;

    const legendData = legends.find((l) => l.name.includes(mostPlayed));
    return legendData?.imageUrl
      ? `${legendData.imageUrl}?auto=format&fit=fill&q=80&w=600`
      : null;
  };

  if (loading) return <div className="players-loading">Loading...</div>;

  return (
    <div className="players-page">
      <div className="players-header">
        <div className="players-header-glow" />
        <h1 className="players-title">Player Roster</h1>
        <p className="players-sub">{players.length} members</p>
      </div>

      <div className="players-container">
        <div className="players-grid">
          {players.map((p) => {
            const bg = getLegendBg(p.gamertag);
            return (
              <div
                key={p.gamertag}
                className="player-card"
                onClick={() => navigate(`/players/${p.gamertag}`)}
                style={
                  bg
                    ? {
                        backgroundImage: `url(${bg})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center 20%", // changed from "center top"
                      }
                    : {}
                }
              >
                {/* Dark overlay when bg image is present */}
                {bg && (
                  <div
                    style={{
                      position: "absolute",
                      inset: "-4px",
                      background:
                        "linear-gradient(135deg, rgba(6,9,16,0.80) 0%, rgba(13,18,32,0.85) 100%)",
                      borderRadius: "2px",
                      zIndex: 0,
                    }}
                  />
                )}

                {/* Card content above overlay */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  <div className="player-card-corner-tr" />
                  <div className="player-card-corner-bl" />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div className="player-card-avatar">
                      {p.gamertag.charAt(0).toUpperCase()}
                    </div>
                    <div className="player-card-info">
                      <div className="player-card-gamertag">{p.gamertag}</div>
                      <div className="player-card-realname">{p.realName}</div>
                    </div>
                  </div>

                  <div className="player-card-stats">
                    <div className="player-card-stat">
                      <div className="player-card-stat-value">
                        {p.wins + p.losses}
                      </div>
                      <div className="player-card-stat-label">Matches</div>
                    </div>
                    <div className="player-card-stat">
                      <div className="player-card-stat-value">{p.wins}</div>
                      <div className="player-card-stat-label">Wins</div>
                    </div>
                    <div className="player-card-stat">
                      <div className="player-card-stat-value">{p.losses}</div>
                      <div className="player-card-stat-label">Losses</div>
                    </div>
                    <div className="player-card-stat">
                      <div className="player-card-stat-value player-card-wr">
                        {p.winRate}%
                      </div>
                      <div className="player-card-stat-label">Win Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
