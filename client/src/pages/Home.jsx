import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import API from "../api";

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [legends, setLegends] = useState([]);
  const [battlefields, setBattlefields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeRandom, setIncludeRandom] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get("/matches"),
      API.get("/players"),
      API.get("/legends"),
      API.get("/battlefields"),
    ]).then(([m, p, l, b]) => {
      setMatches(m.data);
      setPlayers(p.data.filter((pl) => pl.gamertag !== "Random"));
      setLegends(l.data);
      setBattlefields(b.data);
      setLoading(false);
    });
  }, []);

  // ── Filter matches based on toggle ──
  const filteredMatches = includeRandom
    ? matches
    : matches.filter((m) => m.player1 !== "Random" && m.player2 !== "Random");

  // ── Derived stats ──
  const totalMatches = filteredMatches.length;
  const activePlayers = players.length;

  // Most played legend
  const legendCount = {};
  filteredMatches.forEach((m) => {
    if (m.player1Legend)
      legendCount[m.player1Legend] = (legendCount[m.player1Legend] || 0) + 1;
    if (m.player2Legend)
      legendCount[m.player2Legend] = (legendCount[m.player2Legend] || 0) + 1;
  });
  const mostPlayedLegend =
    Object.entries(legendCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const mostPlayedLegendData = legends.find((l) =>
    l.name.startsWith(mostPlayedLegend.split(",")[0]),
  );

  // Most played battlefield
  const bfCount = {};
  filteredMatches.forEach((m) => {
    m.games?.forEach((g) => {
      if (g.player1Battlefield)
        bfCount[g.player1Battlefield] =
          (bfCount[g.player1Battlefield] || 0) + 1;
      if (g.player2Battlefield)
        bfCount[g.player2Battlefield] =
          (bfCount[g.player2Battlefield] || 0) + 1;
    });
  });
  const mostPlayedBf =
    Object.entries(bfCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const mostPlayedBfData = battlefields.find((b) => b.name === mostPlayedBf);

  // First turn win rate
  let firstWins = 0,
    firstTotal = 0;
  filteredMatches.forEach((m) => {
    m.games?.forEach((g) => {
      firstTotal++;
      if (g.whoWentFirst === "Player1" && g.gameWinner === "Player1")
        firstWins++;
      if (g.whoWentFirst === "Player2" && g.gameWinner === "Player2")
        firstWins++;
    });
  });
  const firstWR = firstTotal
    ? ((firstWins / firstTotal) * 100).toFixed(1)
    : "—";

  // Longest game
  let longestGame = null;
  filteredMatches.forEach((m) => {
    m.games?.forEach((g) => {
      if (!longestGame || g.turns > longestGame.turns) {
        longestGame = {
          ...g,
          matchId: m.matchId,
          player1: m.player1,
          player2: m.player2,
        };
      }
    });
  });

  // Most wins player
  const mostWins = [...players].sort((a, b) => b.wins - a.wins)[0];

  // Recent matches
  const recentMatches = filteredMatches.slice(0, 5);

  // Legend leaderboard
  const legendStats = {};
  filteredMatches.forEach((m) => {
    ["player1", "player2"].forEach((side) => {
      const legend = m[`${side}Legend`];
      const won =
        (side === "player1" && m.matchWinner === "Player1") ||
        (side === "player2" && m.matchWinner === "Player2");
      if (!legend) return;
      if (!legendStats[legend]) legendStats[legend] = { wins: 0, losses: 0 };
      if (won) legendStats[legend].wins++;
      else legendStats[legend].losses++;
    });
  });
  const legendLeaderboard = Object.entries(legendStats)
    .map(([name, s]) => ({
      name,
      ...s,
      wr: ((s.wins / (s.wins + s.losses)) * 100).toFixed(1),
    }))
    .filter((l) => l.wins + l.losses >= 1)
    .sort((a, b) => parseFloat(b.wr) - parseFloat(a.wr))
    .slice(0, 5);

  // Win streaks — uses filteredMatches so Random games don't count toward streaks either
  const streaks = {};
  players.forEach((p) => {
    const playerMatches = filteredMatches
      .filter((m) => m.player1 === p.gamertag || m.player2 === p.gamertag)
      .sort((a, b) => a.matchId - b.matchId);
    let currentStreak = 0,
      longestStreak = 0;
    playerMatches.forEach((m) => {
      const isP1 = m.player1 === p.gamertag;
      const won =
        (isP1 && m.matchWinner === "Player1") ||
        (!isP1 && m.matchWinner === "Player2");
      if (won) {
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else currentStreak = 0;
    });
    streaks[p.gamertag] = { longest: longestStreak, current: currentStreak };
  });

  const longestStreakPlayer = Object.entries(streaks).sort(
    (a, b) => b[1].longest - a[1].longest,
  )[0];
  const currentStreakPlayer = Object.entries(streaks)
    .filter(([, s]) => s.current > 0)
    .sort((a, b) => b[1].current - a[1].current)[0];

  const getLegendImg = (legendName) => {
    if (!legendName) return null;
    const champ = legendName.split(",")[0].trim();
    const found = legends.find(
      (l) => l.name === legendName || l.name.startsWith(champ),
    );
    return found?.imageUrl
      ? `${found.imageUrl}?auto=format&fit=fill&q=80&w=300`
      : null;
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
    <div className="home">
      {/* ── Hero ── */}
      <div className="home-hero">
        <div className="home-hero-glow" />
        {mostPlayedLegendData?.imageUrl && (
          <div
            className="home-hero-bg"
            style={{
              backgroundImage: `url(${mostPlayedLegendData.imageUrl}?auto=format&fit=fill&q=80&w=1400)`,
            }}
          />
        )}
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <h1 className="home-title">EasyLife TCG</h1>
          <p className="home-subtitle">
            Match Tracker · Statistics · Player Records
          </p>
          <div className="home-divider" />
          <div className="home-hero-btns">
            <button
              className="home-btn-primary"
              onClick={() => navigate("/match-report")}
            >
              Report a Match
            </button>
            <button
              className="home-btn-secondary"
              onClick={() => navigate("/match-history")}
            >
              View History
            </button>
          </div>
          {/* ── Random Toggle ── */}
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "13px",
                color: "#5B5A56",
                letterSpacing: "1px",
                fontWeight: "600",
              }}
            >
              Include Random opponents
            </span>
            <button
              onClick={() => setIncludeRandom(!includeRandom)}
              style={{
                width: "48px",
                height: "26px",
                background: includeRandom ? "#C89B3C" : "#1E2D45",
                border: `1px solid ${includeRandom ? "#C89B3C" : "#1E2D45"}`,
                borderRadius: "13px",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "3px",
                  left: includeRandom ? "23px" : "3px",
                  width: "18px",
                  height: "18px",
                  background: includeRandom ? "#0A0E17" : "#5B5A56",
                  borderRadius: "50%",
                  transition: "left 0.2s, background 0.2s",
                  display: "block",
                }}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="home-container">
        {/* ── Top Stats Row ── */}
        <div className="home-stats-row">
          {[
            { label: "Total Matches", value: totalMatches },
            { label: "Active Players", value: activePlayers },
            { label: "Going First WR", value: `${firstWR}%`, gold: true },
            {
              label: "Most Played BF",
              value: mostPlayedBf.split(" ")[0] || "—",
            },
          ].map(({ label, value, gold }) => (
            <div key={label} className="home-stat-card">
              <div className="home-stat-corner-tr" />
              <div
                className={`home-stat-value ${gold ? "home-stat-gold" : ""}`}
              >
                {value}
              </div>
              <div className="home-stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="home-grid-2">
          {/* ── Player Leaderboard ── */}
          <div className="home-section">
            <div className="home-section-corner-tr" />
            <div className="home-section-corner-bl" />
            <div className="home-section-title">Player Standings</div>
            {players
              .filter((p) => p.wins + p.losses >= 1)
              .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
              .map((p, i) => (
                <div
                  key={p.gamertag}
                  className="home-leaderboard-row"
                  onClick={() => navigate(`/players/${p.gamertag}`)}
                >
                  <div
                    className={`home-rank ${i === 0 ? "home-rank-gold" : i === 1 ? "home-rank-silver" : i === 2 ? "home-rank-bronze" : ""}`}
                  >
                    #{i + 1}
                  </div>
                  <div className="home-lb-name">{p.gamertag}</div>
                  <div className="home-lb-record">
                    {p.wins}W — {p.losses}L
                  </div>
                  <div
                    className="home-lb-wr"
                    style={{
                      color:
                        parseFloat(p.winRate) >= 50 ? "#27AE60" : "#C0392B",
                    }}
                  >
                    {p.winRate}%
                  </div>
                </div>
              ))}
            {players.filter((p) => p.wins + p.losses >= 1).length === 0 && (
              <div className="home-empty">No match data yet.</div>
            )}
          </div>

          {/* ── Legend Leaderboard ── */}
          <div className="home-section">
            <div className="home-section-corner-tr" />
            <div className="home-section-corner-bl" />
            <div className="home-section-title">Legend Win Rates</div>
            {legendLeaderboard.map((l, i) => {
              const img = getLegendImg(l.name);
              return (
                <div
                  key={l.name}
                  className="home-legend-row"
                  onClick={() =>
                    navigate(`/legends/${encodeURIComponent(l.name)}`)
                  }
                >
                  <div
                    className={`home-rank ${i === 0 ? "home-rank-gold" : i === 1 ? "home-rank-silver" : i === 2 ? "home-rank-bronze" : ""}`}
                  >
                    #{i + 1}
                  </div>
                  {img && (
                    <img src={img} alt={l.name} className="home-legend-thumb" />
                  )}
                  <div className="home-lb-name">{l.name.split(",")[0]}</div>
                  <div className="home-lb-record">
                    {l.wins}W — {l.losses}L
                  </div>
                  <div
                    className="home-lb-wr"
                    style={{
                      color: parseFloat(l.wr) >= 50 ? "#27AE60" : "#C0392B",
                    }}
                  >
                    {l.wr}%
                  </div>
                </div>
              );
            })}
            {legendLeaderboard.length === 0 && (
              <div className="home-empty">No match data yet.</div>
            )}
          </div>
        </div>

        {/* ── Fun Facts Row ── */}
        <div className="home-facts-row">
          {longestGame && (
            <div className="home-fact-card">
              <div className="home-fact-icon">⚔</div>
              <div className="home-fact-value">{longestGame.turns}</div>
              <div className="home-fact-label">Longest Game (turns)</div>
              <div className="home-fact-sub">
                Match #{longestGame.matchId} · {longestGame.player1} vs{" "}
                {longestGame.player2}
              </div>
            </div>
          )}
          {mostWins && (
            <div
              className="home-fact-card"
              onClick={() => navigate(`/players/${mostWins.gamertag}`)}
            >
              <div className="home-fact-icon">🏆</div>
              <div className="home-fact-value">{mostWins.wins}</div>
              <div className="home-fact-label">Most Wins</div>
              <div className="home-fact-sub">{mostWins.gamertag}</div>
            </div>
          )}
          {longestStreakPlayer && longestStreakPlayer[1].longest > 0 && (
            <div
              className="home-fact-card"
              onClick={() => navigate(`/players/${longestStreakPlayer[0]}`)}
            >
              <div className="home-fact-icon">🔥</div>
              <div className="home-fact-value">
                {longestStreakPlayer[1].longest}
              </div>
              <div className="home-fact-label">Longest Win Streak</div>
              <div className="home-fact-sub">{longestStreakPlayer[0]}</div>
            </div>
          )}
          {currentStreakPlayer ? (
            <div
              className="home-fact-card"
              onClick={() => navigate(`/players/${currentStreakPlayer[0]}`)}
            >
              <div className="home-fact-icon">⚡</div>
              <div className="home-fact-value">
                {currentStreakPlayer[1].current}
              </div>
              <div className="home-fact-label">Current Hot Streak</div>
              <div className="home-fact-sub">{currentStreakPlayer[0]}</div>
            </div>
          ) : (
            <div className="home-fact-card">
              <div className="home-fact-icon">🎯</div>
              <div className="home-fact-value">{firstWR}%</div>
              <div className="home-fact-label">First Turn Win Rate</div>
              <div className="home-fact-sub">
                Across {firstTotal} games played
              </div>
            </div>
          )}
        </div>

        {/* ── Recent Matches ── */}
        <div className="home-section">
          <div className="home-section-corner-tr" />
          <div className="home-section-corner-bl" />
          <div className="home-section-title">Recent Matches</div>
          {recentMatches.length === 0 && (
            <div className="home-empty">No matches yet.</div>
          )}
          {recentMatches.map((m) => {
            const p1Img = getLegendImg(m.player1Legend);
            const p2Img = getLegendImg(m.player2Legend);
            const p1Won = m.matchWinner === "Player1";
            return (
              <div
                key={m.matchId}
                className="home-recent-match"
                onClick={() => navigate("/match-history")}
              >
                <div className="home-recent-id">#{m.matchId}</div>
                <div className="home-recent-player">
                  {p1Img && (
                    <img
                      src={p1Img}
                      alt={m.player1Legend}
                      className="home-recent-legend-img"
                    />
                  )}
                  <div>
                    <div
                      className={`home-recent-name ${p1Won ? "home-recent-winner" : "home-recent-loser"}`}
                    >
                      {m.player1}
                    </div>
                    <div className="home-recent-legend">{m.player1Legend}</div>
                  </div>
                </div>
                <div className="home-recent-score">
                  <span className={p1Won ? "mh-score-win" : "mh-score-loss"}>
                    {m.games.filter((g) => g.gameWinner === "Player1").length}
                  </span>
                  <span className="home-score-dash">—</span>
                  <span className={!p1Won ? "mh-score-win" : "mh-score-loss"}>
                    {m.games.filter((g) => g.gameWinner === "Player2").length}
                  </span>
                </div>
                <div className="home-recent-player home-recent-player-right">
                  <div>
                    <div
                      className={`home-recent-name ${!p1Won ? "home-recent-winner" : "home-recent-loser"}`}
                    >
                      {m.player2}
                    </div>
                    <div className="home-recent-legend">{m.player2Legend}</div>
                  </div>
                  {p2Img && (
                    <img
                      src={p2Img}
                      alt={m.player2Legend}
                      className="home-recent-legend-img"
                    />
                  )}
                </div>
                <div className="home-recent-date">
                  {formatDate(m.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
