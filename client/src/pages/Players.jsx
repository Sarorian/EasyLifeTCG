import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Players.css";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/players").then((res) => {
      setPlayers(res.data.filter((p) => p.gamertag !== "Random"));
      setLoading(false);
    });
  }, []);

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
          {players.map((p) => (
            <div
              key={p.gamertag}
              className="player-card"
              onClick={() => navigate(`/players/${p.gamertag}`)}
            >
              <div className="player-card-corner-tr" />
              <div className="player-card-corner-bl" />

              <div className="player-card-avatar">
                {p.gamertag.charAt(0).toUpperCase()}
              </div>

              <div className="player-card-info">
                <div className="player-card-gamertag">{p.gamertag}</div>
                <div className="player-card-realname">{p.realName}</div>
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
          ))}
        </div>
      </div>
    </div>
  );
}
