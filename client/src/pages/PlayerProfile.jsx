import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import "./PlayerProfile.css";

import API from "../api";

export default function PlayerProfile() {
  const { gamertag } = useParams();
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [legendBg, setLegendBg] = useState("");

  useEffect(() => {
    Promise.all([
      API.get(`/players/${gamertag}`),
      API.get(`/players/${gamertag}/matches`),
      API.get("/players"),
    ]).then(([p, m, all]) => {
      setPlayer(p.data);
      setMatches(m.data);
      setAllPlayers(
        all.data.filter(
          (pl) => pl.gamertag !== "Random" && pl.gamertag !== gamertag,
        ),
      );
      setLoading(false);
    });
  }, [gamertag]);

  useEffect(() => {
    if (!matches.length) return;
    const legendCount = {};
    matches.forEach((m) => {
      const isP1 = m.player1 === gamertag;
      const legend = isP1 ? m.player1Legend : m.player2Legend;
      legendCount[legend] = (legendCount[legend] || 0) + 1;
    });
    const mostPlayed = Object.entries(legendCount).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    if (!mostPlayed || mostPlayed === "—") return;
    API.get("/legends").then((res) => {
      const match = res.data.find((l) => l.name.includes(mostPlayed));
      if (match?.imageUrl) {
        setLegendBg(`${match.imageUrl}?auto=format&fit=fill&q=80&w=800`);
      }
    });
  }, [matches, gamertag]);

  // ── Early returns AFTER all hooks ──
  if (loading) return <div className="pp-loading">Loading...</div>;
  if (!player) return <div className="pp-loading">Player not found.</div>;

  // ── Derived stats ──
  const totalMatches = player.wins + player.losses;

  const legendCount = {};
  const archetypeCount = {};
  matches.forEach((m) => {
    const isP1 = m.player1 === gamertag;
    const legend = isP1 ? m.player1Legend : m.player2Legend;
    const archetype = isP1 ? m.player1Archetype : m.player2Archetype;
    legendCount[legend] = (legendCount[legend] || 0) + 1;
    archetypeCount[archetype] = (archetypeCount[archetype] || 0) + 1;
  });

  const mostPlayedLegend =
    Object.entries(legendCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const mostPlayedArchetype =
    Object.entries(archetypeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // ── Head to head ──
  const h2h = {};
  allPlayers.forEach((p) => {
    h2h[p.gamertag] = { wins: 0, losses: 0 };
  });
  matches.forEach((m) => {
    const isP1 = m.player1 === gamertag;
    const opponent = isP1 ? m.player2 : m.player1;
    const won =
      (isP1 && m.matchWinner === "Player1") ||
      (!isP1 && m.matchWinner === "Player2");
    if (h2h[opponent]) {
      if (won) h2h[opponent].wins++;
      else h2h[opponent].losses++;
    }
  });

  const h2hEntries = Object.entries(h2h).filter(
    ([, r]) => r.wins + r.losses > 0,
  );

  // ── Win rate by legend ──
  const legendStats = {};
  matches.forEach((m) => {
    const isP1 = m.player1 === gamertag;
    const legend = isP1 ? m.player1Legend : m.player2Legend;
    const won =
      (isP1 && m.matchWinner === "Player1") ||
      (!isP1 && m.matchWinner === "Player2");
    if (!legendStats[legend]) legendStats[legend] = { wins: 0, losses: 0 };
    if (won) legendStats[legend].wins++;
    else legendStats[legend].losses++;
  });

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="pp-page">
      <div
        className="pp-header"
        style={
          legendBg
            ? {
                backgroundImage: `url(${legendBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }
            : {}
        }
      >
        <div className="pp-header-glow" />
        {legendBg && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(6,9,16,0.72) 0%, rgba(10,14,23,0.93) 100%)",
              zIndex: 0,
            }}
          />
        )}
        <div style={{ position: "relative", zIndex: 1 }}>
          <button className="pp-back" onClick={() => navigate("/players")}>
            ← Roster
          </button>
          <div className="pp-header-inner">
            <div className="pp-avatar">{gamertag.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className="pp-gamertag">{gamertag}</h1>
              <p className="pp-realname">{player.realName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pp-container">
        <div className="pp-stat-row">
          {[
            { label: "Matches", value: totalMatches },
            { label: "Wins", value: player.wins },
            { label: "Losses", value: player.losses },
            { label: "Win Rate", value: `${player.winRate}%`, gold: true },
            { label: "Top Legend", value: mostPlayedLegend.split(",")[0] },
            { label: "Top Archetype", value: mostPlayedArchetype },
            { label: "ELO", value: player.elo ?? 1500, gold: true },
          ].map(({ label, value, gold }) => (
            <div key={label} className="pp-stat-card">
              <div className={`pp-stat-value ${gold ? "pp-stat-gold" : ""}`}>
                {value}
              </div>
              <div className="pp-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ── ELO Graph ── */}
        {player.eloHistory && player.eloHistory.length > 0 && (
          <div className="pp-section">
            <div className="pp-section-corner-tr" />
            <div className="pp-section-corner-bl" />
            <div className="pp-section-title">ELO History</div>

            {/* Peak / Low / Current summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              {[
                { label: "Current ELO", value: player.elo ?? 1000, gold: true },
                {
                  label: "Peak ELO",
                  value: Math.max(...player.eloHistory.map((e) => e.elo)),
                },
                {
                  label: "Lowest ELO",
                  value: Math.min(...player.eloHistory.map((e) => e.elo)),
                },
              ].map(({ label, value, gold }) => (
                <div
                  key={label}
                  style={{
                    background: "#080C15",
                    border: "1px solid #1E2D45",
                    borderTop: "2px solid rgba(200,155,60,0.4)",
                    borderRadius: "2px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: gold ? "#C89B3C" : "#C8AA6E",
                      marginBottom: "4px",
                      textShadow: gold
                        ? "0 0 20px rgba(200,155,60,0.3)"
                        : "none",
                    }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: "10px",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: "#5B5A56",
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ width: "100%", height: "200px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { matchId: "Start", elo: 1000 },
                    ...player.eloHistory.map((e) => ({
                      matchId: `#${e.matchId}`,
                      elo: e.elo,
                      change: e.change,
                      opponent: e.opponent,
                      won: e.won,
                    })),
                  ]}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="matchId"
                    tick={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: 11,
                      fill: "#5B5A56",
                    }}
                    axisLine={{ stroke: "#1E2D45" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: 11,
                      fill: "#5B5A56",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0D1220",
                      border: "1px solid #1E2D45",
                      borderRadius: "2px",
                      fontFamily: "'Rajdhani', sans-serif",
                      color: "#C8AA6E",
                    }}
                    formatter={(value, name, props) => {
                      const { opponent, change, won } = props.payload;
                      return [
                        <span>
                          <span style={{ color: "#C89B3C", fontWeight: "700" }}>
                            {value}
                          </span>
                          {change !== undefined && (
                            <span
                              style={{
                                color: change >= 0 ? "#27AE60" : "#C0392B",
                                marginLeft: "8px",
                              }}
                            >
                              {change >= 0 ? "+" : ""}
                              {change}
                            </span>
                          )}
                          {opponent && (
                            <span
                              style={{ color: "#5B5A56", marginLeft: "8px" }}
                            >
                              vs {opponent} · {won ? "W" : "L"}
                            </span>
                          )}
                        </span>,
                        "ELO",
                      ];
                    }}
                    labelStyle={{
                      color: "#5B5A56",
                      fontSize: "11px",
                      letterSpacing: "1px",
                    }}
                  />
                  <ReferenceLine
                    y={1000}
                    stroke="#1E2D45"
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="elo"
                    stroke="#C89B3C"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload.matchId === "Start") return null;
                      return (
                        <circle
                          key={payload.matchId}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={payload.won ? "#27AE60" : "#C0392B"}
                          stroke="#0D1220"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{
                      r: 6,
                      fill: "#C89B3C",
                      stroke: "#0D1220",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                marginTop: "12px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "12px",
                  color: "#27AE60",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#27AE60",
                    display: "inline-block",
                  }}
                />{" "}
                Win
              </span>
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "12px",
                  color: "#C0392B",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#C0392B",
                    display: "inline-block",
                  }}
                />{" "}
                Loss
              </span>
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "12px",
                  color: "#5B5A56",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "24px",
                    height: "1px",
                    background: "#1E2D45",
                    display: "inline-block",
                    borderTop: "1px dashed #1E2D45",
                  }}
                />{" "}
                Baseline (1000)
              </span>
            </div>
          </div>
        )}

        <div className="pp-grid-2">
          <div className="pp-section">
            <div className="pp-section-corner-tr" />
            <div className="pp-section-corner-bl" />
            <div className="pp-section-title">Legend Win Rates</div>
            {Object.entries(legendStats).length === 0 && (
              <div className="pp-empty">No data yet.</div>
            )}
            {Object.entries(legendStats).map(([legend, rec]) => {
              const total = rec.wins + rec.losses;
              const wr = ((rec.wins / total) * 100).toFixed(1);
              return (
                <div key={legend} className="pp-legend-row">
                  <div className="pp-legend-name">{legend}</div>
                  <div className="pp-legend-bar-wrap">
                    <div
                      className="pp-legend-bar"
                      style={{ width: `${wr}%` }}
                    />
                  </div>
                  <div className="pp-legend-stats">
                    <span className="pp-legend-wr">{wr}%</span>
                    <span className="pp-legend-record">
                      {rec.wins}W {rec.losses}L
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pp-section">
            <div className="pp-section-corner-tr" />
            <div className="pp-section-corner-bl" />
            <div className="pp-section-title">Head to Head</div>
            {h2hEntries.length === 0 && (
              <div className="pp-empty">No club matches yet.</div>
            )}
            {h2hEntries.map(([opponent, rec]) => {
              const total = rec.wins + rec.losses;
              const wr = ((rec.wins / total) * 100).toFixed(1);
              return (
                <div
                  key={opponent}
                  className="pp-h2h-row"
                  onClick={() => navigate(`/players/${opponent}`)}
                >
                  <div className="pp-h2h-name">{opponent}</div>
                  <div className="pp-h2h-record">
                    <span className="pp-h2h-wins">{rec.wins}W</span>
                    <span className="pp-h2h-sep">—</span>
                    <span className="pp-h2h-losses">{rec.losses}L</span>
                  </div>
                  <div className="pp-h2h-wr">{wr}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pp-section">
          <div className="pp-section-corner-tr" />
          <div className="pp-section-corner-bl" />
          <div className="pp-section-title">
            Match History ({matches.length})
          </div>
          {matches.length === 0 && (
            <div className="pp-empty">No matches yet.</div>
          )}
          {matches.map((m) => {
            const isP1 = m.player1 === gamertag;
            const won =
              (isP1 && m.matchWinner === "Player1") ||
              (!isP1 && m.matchWinner === "Player2");
            const myLegend = isP1 ? m.player1Legend : m.player2Legend;
            const myArchetype = isP1 ? m.player1Archetype : m.player2Archetype;
            const oppLegend = isP1 ? m.player2Legend : m.player1Legend;
            const oppArchetype = isP1 ? m.player2Archetype : m.player1Archetype;
            const opponent = isP1 ? m.player2 : m.player1;

            return (
              <div
                key={m.matchId}
                className={`pp-match-card ${won ? "pp-match-win" : "pp-match-loss"}`}
              >
                <div className="pp-match-top">
                  <div className="pp-match-id">#{m.matchId}</div>
                  <div className="pp-match-vs">
                    <span className="pp-match-my-legend">{myLegend}</span>
                    <span className="pp-match-arch">({myArchetype})</span>
                    <span className="pp-match-versus">vs</span>
                    <span className="pp-match-opp-legend">{oppLegend}</span>
                    <span className="pp-match-arch">({oppArchetype})</span>
                    <span className="pp-match-opponent">· {opponent}</span>
                  </div>
                  <div
                    className={`pp-match-result ${won ? "pp-result-win" : "pp-result-loss"}`}
                  >
                    {won ? "WIN" : "LOSS"}
                  </div>
                  <div className="pp-match-date">{formatDate(m.createdAt)}</div>
                </div>
                <div className="pp-games">
                  {m.games.map((g, i) => {
                    const myScore = isP1 ? g.player1Score : g.player2Score;
                    const oppScore = isP1 ? g.player2Score : g.player1Score;
                    const myBf = isP1
                      ? g.player1Battlefield
                      : g.player2Battlefield;
                    const oppBf = isP1
                      ? g.player2Battlefield
                      : g.player1Battlefield;
                    const gameWon =
                      (isP1 && g.gameWinner === "Player1") ||
                      (!isP1 && g.gameWinner === "Player2");
                    const wentFirst =
                      (isP1 && g.whoWentFirst === "Player1") ||
                      (!isP1 && g.whoWentFirst === "Player2");
                    return (
                      <div
                        key={i}
                        className={`pp-game ${gameWon ? "pp-game-win" : "pp-game-loss"}`}
                      >
                        <div className="pp-game-num">G{i + 1}</div>
                        <div className="pp-game-score">
                          <span
                            className={
                              gameWon ? "pp-score-win" : "pp-score-loss"
                            }
                          >
                            {myScore}
                          </span>
                          <span className="pp-score-sep">—</span>
                          <span
                            className={
                              !gameWon ? "pp-score-win" : "pp-score-loss"
                            }
                          >
                            {oppScore}
                          </span>
                        </div>
                        <div className="pp-game-bf">
                          {myBf} vs {oppBf}
                        </div>
                        <div className="pp-game-meta">
                          {g.turns} turns ·{" "}
                          {wentFirst ? "went first" : "went second"}
                        </div>
                        <div
                          className={`pp-game-result ${gameWon ? "pp-game-w" : "pp-game-l"}`}
                        >
                          {gameWon ? "W" : "L"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
