import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./EloLeaderboard.css";

export default function EloLeaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/players/elo-leaderboard").then((res) => {
      setPlayers(res.data);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0A0E17",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C89B3C",
          fontFamily: "'Rajdhani', sans-serif",
          letterSpacing: "4px",
          fontSize: "13px",
          textTransform: "uppercase",
        }}
      >
        Loading...
      </div>
    );

  return (
    <div className="elo-page">
      <div className="elo-header">
        <div className="elo-header-glow" />
        <h1 className="elo-title">ELO Rankings</h1>
        <p className="elo-sub">
          {players.length} ranked players · Starting ELO 100 · K-Factor 32
        </p>
      </div>

      <div className="elo-container">
        {/* ── Top 3 Podium ── */}
        {players.length >= 3 && (
          <div className="elo-podium">
            {/* 2nd place */}
            <div
              className="elo-podium-card elo-podium-2"
              onClick={() => navigate(`/players/${players[1].gamertag}`)}
            >
              <div className="elo-podium-rank">2</div>
              <div className="elo-podium-name">{players[1].gamertag}</div>
              <div className="elo-podium-elo">{players[1].elo}</div>
              <div className="elo-podium-record">
                {players[1].wins}W — {players[1].losses}L
              </div>
              <div className="elo-podium-block elo-podium-block-2" />
            </div>

            {/* 1st place */}
            <div
              className="elo-podium-card elo-podium-1"
              onClick={() => navigate(`/players/${players[0].gamertag}`)}
            >
              <div className="elo-podium-crown">👑</div>
              <div className="elo-podium-rank elo-rank-gold">1</div>
              <div className="elo-podium-name">{players[0].gamertag}</div>
              <div className="elo-podium-elo elo-elo-gold">
                {players[0].elo}
              </div>
              <div className="elo-podium-record">
                {players[0].wins}W — {players[0].losses}L
              </div>
              <div className="elo-podium-block elo-podium-block-1" />
            </div>

            {/* 3rd place */}
            <div
              className="elo-podium-card elo-podium-3"
              onClick={() => navigate(`/players/${players[2].gamertag}`)}
            >
              <div className="elo-podium-rank">3</div>
              <div className="elo-podium-name">{players[2].gamertag}</div>
              <div className="elo-podium-elo">{players[2].elo}</div>
              <div className="elo-podium-record">
                {players[2].wins}W — {players[2].losses}L
              </div>
              <div className="elo-podium-block elo-podium-block-3" />
            </div>
          </div>
        )}

        {/* ── Full Rankings Table ── */}
        <div className="elo-section">
          <div className="elo-section-corner-tr" />
          <div className="elo-section-corner-bl" />
          <div className="elo-section-title">Full Rankings</div>
          <div className="elo-table-header">
            <span>Rank</span>
            <span>Player</span>
            <span>ELO</span>
            <span>Record</span>
            <span>Last Match</span>
          </div>
          {players.map((p, i) => {
            const lastEntry = p.eloHistory?.[p.eloHistory.length - 1];
            const lastChange = lastEntry?.change;
            return (
              <div
                key={p.gamertag}
                className="elo-table-row"
                onClick={() => navigate(`/players/${p.gamertag}`)}
              >
                <span
                  className={`elo-rank-num ${i === 0 ? "elo-gold" : i === 1 ? "elo-silver" : i === 2 ? "elo-bronze" : ""}`}
                >
                  #{i + 1}
                </span>
                <span className="elo-player-name">{p.gamertag}</span>
                <span className={`elo-score ${i === 0 ? "elo-gold" : ""}`}>
                  {p.elo ?? 1000}
                </span>
                <span className="elo-record">
                  {p.wins}W — {p.losses}L
                </span>
                <span className="elo-last-change">
                  {lastChange !== undefined ? (
                    <span
                      style={{ color: lastChange >= 0 ? "#27AE60" : "#C0392B" }}
                    >
                      {lastChange >= 0 ? "+" : ""}
                      {lastChange}
                    </span>
                  ) : (
                    <span style={{ color: "#5B5A56" }}>—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── ELO History per player ── */}
        <div className="elo-section">
          <div className="elo-section-corner-tr" />
          <div className="elo-section-corner-bl" />
          <div className="elo-section-title">Recent ELO Changes</div>
          {players
            .filter((p) => p.eloHistory?.length > 0)
            .map((p) => {
              const recent = [...(p.eloHistory || [])].reverse().slice(0, 3);
              return (
                <div key={p.gamertag} className="elo-history-player">
                  <div
                    className="elo-history-name"
                    onClick={() => navigate(`/players/${p.gamertag}`)}
                  >
                    {p.gamertag}
                  </div>
                  <div className="elo-history-entries">
                    {recent.map((e, i) => (
                      <div key={i} className="elo-history-entry">
                        <span className="elo-history-opp">vs {e.opponent}</span>
                        <span
                          className={`elo-history-result ${e.won ? "elo-win" : "elo-loss"}`}
                        >
                          {e.won ? "W" : "L"}
                        </span>
                        <span className="elo-history-elo">{e.elo}</span>
                        <span
                          className={`elo-history-change ${e.change >= 0 ? "elo-win" : "elo-loss"}`}
                        >
                          {e.change >= 0 ? "+" : ""}
                          {e.change}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          {players.every((p) => !p.eloHistory?.length) && (
            <div className="elo-empty">
              No ELO history yet — report a match to start ranking.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
