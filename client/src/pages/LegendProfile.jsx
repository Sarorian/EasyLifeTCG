import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./LegendProfile.css";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

export default function LegendProfile() {
  const { legendName } = useParams();
  const navigate = useNavigate();
  const name = decodeURIComponent(legendName);

  const [matches, setMatches] = useState([]);
  const [legend, setLegend] = useState(null);
  const [includeRandom, setIncludeRandom] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get("/matches"), API.get("/legends")]).then(([m, l]) => {
      setMatches(m.data);
      const found = l.data.find((leg) => leg.name === name);
      setLegend(found || null);
      setLoading(false);
    });
  }, [name]);

  if (loading) return <div className="lp-loading">Loading...</div>;

  // ── Filter matches for this legend ──
  const championName = name.split(",")[0].trim();

  const relevantMatches = matches.filter((m) => {
    const isP1 = m.player1Legend === championName || m.player1Legend === name;
    const isP2 = m.player2Legend === championName || m.player2Legend === name;
    if (!isP1 && !isP2) return false;
    if (!includeRandom) {
      if (m.player1 === "Random" || m.player2 === "Random") return false;
    }
    return true;
  });

  if (!relevantMatches.length && !legend) {
    return <div className="lp-loading">Legend not found.</div>;
  }

  // ── Overall stats ──
  let wins = 0,
    losses = 0;
  let wentFirstWins = 0,
    wentFirstTotal = 0;
  let wentSecondWins = 0,
    wentSecondTotal = 0;

  relevantMatches.forEach((m) => {
    const isP1 = m.player1Legend === championName || m.player1Legend === name;
    const won =
      (isP1 && m.matchWinner === "Player1") ||
      (!isP1 && m.matchWinner === "Player2");
    if (won) wins++;
    else losses++;

    // Per game first/second stats
    m.games.forEach((g) => {
      const myFirst =
        (isP1 && g.whoWentFirst === "Player1") ||
        (!isP1 && g.whoWentFirst === "Player2");
      const gameWon =
        (isP1 && g.gameWinner === "Player1") ||
        (!isP1 && g.gameWinner === "Player2");
      if (myFirst) {
        wentFirstTotal++;
        if (gameWon) wentFirstWins++;
      } else {
        wentSecondTotal++;
        if (gameWon) wentSecondWins++;
      }
    });
  });

  const total = wins + losses;
  const wr = total ? ((wins / total) * 100).toFixed(1) : "—";
  const firstWR = wentFirstTotal
    ? ((wentFirstWins / wentFirstTotal) * 100).toFixed(1)
    : "—";
  const secondWR = wentSecondTotal
    ? ((wentSecondWins / wentSecondTotal) * 100).toFixed(1)
    : "—";

  // ── Battlefield stats ──
  const bfStats = {};
  relevantMatches.forEach((m) => {
    const isP1 = m.player1Legend === championName || m.player1Legend === name;
    m.games.forEach((g) => {
      const myBf = isP1 ? g.player1Battlefield : g.player2Battlefield;
      const oppBf = isP1 ? g.player2Battlefield : g.player1Battlefield;
      const myFirst =
        (isP1 && g.whoWentFirst === "Player1") ||
        (!isP1 && g.whoWentFirst === "Player2");
      const gameWon =
        (isP1 && g.gameWinner === "Player1") ||
        (!isP1 && g.gameWinner === "Player2");
      const gameNum = g.gameNumber;

      // My battlefield stats
      if (myBf) {
        if (!bfStats[myBf])
          bfStats[myBf] = {
            wins: 0,
            losses: 0,
            first: 0,
            second: 0,
            firstWins: 0,
            secondWins: 0,
          };
        if (gameWon) bfStats[myBf].wins++;
        else bfStats[myBf].losses++;
        if (myFirst) {
          bfStats[myBf].first++;
          if (gameWon) bfStats[myBf].firstWins++;
        } else {
          bfStats[myBf].second++;
          if (gameWon) bfStats[myBf].secondWins++;
        }
      }
    });
  });

  // ── Head to head ──
  const h2h = {};
  relevantMatches.forEach((m) => {
    const isP1 = m.player1Legend === championName || m.player1Legend === name;
    const oppLegend = isP1 ? m.player2Legend : m.player1Legend;
    const won =
      (isP1 && m.matchWinner === "Player1") ||
      (!isP1 && m.matchWinner === "Player2");
    if (!h2h[oppLegend]) h2h[oppLegend] = { wins: 0, losses: 0 };
    if (won) h2h[oppLegend].wins++;
    else h2h[oppLegend].losses++;
  });

  const h2hEntries = Object.entries(h2h).sort((a, b) => {
    const wrA = a[1].wins / (a[1].wins + a[1].losses);
    const wrB = b[1].wins / (b[1].wins + b[1].losses);
    return wrB - wrA;
  });

  // ── Battlefield head to head ──
  const bfH2H = {};
  relevantMatches.forEach((m) => {
    const isP1 = m.player1Legend === championName || m.player1Legend === name;
    const oppLegend = isP1 ? m.player2Legend : m.player1Legend;
    m.games.forEach((g) => {
      const myBf = isP1 ? g.player1Battlefield : g.player2Battlefield;
      const oppBf = isP1 ? g.player2Battlefield : g.player1Battlefield;
      const gameWon =
        (isP1 && g.gameWinner === "Player1") ||
        (!isP1 && g.gameWinner === "Player2");
      const key = `${myBf} vs ${oppBf} · vs ${oppLegend}`;
      if (!bfH2H[key]) bfH2H[key] = { wins: 0, losses: 0 };
      if (gameWon) bfH2H[key].wins++;
      else bfH2H[key].losses++;
    });
  });

  const bfH2HEntries = Object.entries(bfH2H)
    .filter(([, r]) => r.wins + r.losses >= 1)
    .sort((a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses));

  const bgUrl = legend?.imageUrl
    ? `${legend.imageUrl}?auto=format&fit=fill&q=80&w=1200`
    : null;

  return (
    <div className="lp-page">
      {/* ── Header ── */}
      <div
        className="lp-header"
        style={
          bgUrl
            ? {
                backgroundImage: `url(${bgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center 20%",
              }
            : {}
        }
      >
        <div className="lp-header-glow" />
        {bgUrl && (
          <div
            style={{
              position: "absolute",
              inset: "-4px",
              background:
                "linear-gradient(180deg, rgba(6,9,16,0.6) 0%, rgba(10,14,23,0.95) 100%)",
              zIndex: 0,
            }}
          />
        )}
        <div style={{ position: "relative", zIndex: 1 }}>
          <button className="lp-back" onClick={() => navigate("/legends")}>
            ← Legends
          </button>
          <div className="lp-header-inner">
            <div>
              <h1 className="lp-champion">{name.split(",")[0]}</h1>
              <p className="lp-title-text">{name.split(",")[1]?.trim()}</p>
            </div>
            {/* Random toggle */}
            <div className="lp-toggle-wrap">
              <span className="lp-toggle-label">Include Random opponents</span>
              <button
                className={`lp-toggle ${includeRandom ? "lp-toggle-on" : ""}`}
                onClick={() => setIncludeRandom(!includeRandom)}
              >
                <span className="lp-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-container">
        {/* ── Overview ── */}
        <div className="lp-stat-row">
          {[
            { label: "Matches", value: total },
            { label: "Wins", value: wins },
            { label: "Losses", value: losses },
            { label: "Win Rate", value: `${wr}%`, gold: true },
            {
              label: "Going First",
              value: `${firstWR}%`,
              sub: `${wentFirstWins}W ${wentFirstTotal - wentFirstWins}L`,
            },
            {
              label: "Going Second",
              value: `${secondWR}%`,
              sub: `${wentSecondWins}W ${wentSecondTotal - wentSecondWins}L`,
            },
          ].map(({ label, value, gold, sub }) => (
            <div key={label} className="lp-stat-card">
              <div className={`lp-stat-value ${gold ? "lp-stat-gold" : ""}`}>
                {value}
              </div>
              {sub && <div className="lp-stat-sub">{sub}</div>}
              <div className="lp-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Head to Head ── */}
        <div className="lp-section">
          <div className="lp-section-corner-tr" />
          <div className="lp-section-corner-bl" />
          <div className="lp-section-title">Head to Head vs Other Legends</div>
          {h2hEntries.length === 0 && (
            <div className="lp-empty">No matchup data yet.</div>
          )}
          <div className="lp-h2h-grid">
            {h2hEntries.map(([opp, rec]) => {
              const t = rec.wins + rec.losses;
              const w = ((rec.wins / t) * 100).toFixed(1);
              return (
                <div
                  key={opp}
                  className="lp-h2h-card"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(
                      `/legends/${encodeURIComponent(name)}/vs/${encodeURIComponent(opp)}`,
                    )
                  }
                >
                  <div className="lp-h2h-opp">{opp}</div>
                  <div
                    className="lp-h2h-wr"
                    style={{
                      color: parseFloat(w) >= 50 ? "#27AE60" : "#C0392B",
                    }}
                  >
                    {w}%
                  </div>
                  <div className="lp-h2h-record">
                    {rec.wins}W — {rec.losses}L
                  </div>
                  <div className="lp-h2h-bar-wrap">
                    <div
                      className="lp-h2h-bar"
                      style={{
                        width: `${w}%`,
                        background: parseFloat(w) >= 50 ? "#27AE60" : "#C0392B",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Battlefield Stats ── */}
        <div className="lp-section">
          <div className="lp-section-corner-tr" />
          <div className="lp-section-corner-bl" />
          <div className="lp-section-title">Battlefield Win Rates</div>
          {Object.keys(bfStats).length === 0 && (
            <div className="lp-empty">No battlefield data yet.</div>
          )}
          <div className="lp-bf-table">
            <div className="lp-bf-header">
              <span>Battlefield</span>
              <span>Overall</span>
              <span>Going First</span>
              <span>Going Second</span>
            </div>
            {Object.entries(bfStats)
              .sort(
                (a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses),
              )
              .map(([bf, s]) => {
                const overallWR = (
                  (s.wins / (s.wins + s.losses)) *
                  100
                ).toFixed(1);
                const firstWR = s.first
                  ? ((s.firstWins / s.first) * 100).toFixed(1)
                  : "—";
                const secondWR = s.second
                  ? ((s.secondWins / s.second) * 100).toFixed(1)
                  : "—";
                const g1WR = s.game1
                  ? ((s.game1Wins / s.game1) * 100).toFixed(1)
                  : "—";
                return (
                  <div key={bf} className="lp-bf-row">
                    <span className="lp-bf-name">{bf}</span>
                    <span
                      className="lp-bf-stat"
                      style={{
                        color:
                          parseFloat(overallWR) >= 50 ? "#27AE60" : "#C0392B",
                      }}
                    >
                      {overallWR}%{" "}
                      <small>
                        ({s.wins}W {s.losses}L)
                      </small>
                    </span>
                    <span className="lp-bf-stat">
                      {firstWR}
                      {firstWR !== "—" ? "%" : ""}{" "}
                      <small>
                        ({s.firstWins}/{s.first})
                      </small>
                    </span>
                    <span className="lp-bf-stat">
                      {secondWR}
                      {secondWR !== "—" ? "%" : ""}{" "}
                      <small>
                        ({s.secondWins}/{s.second})
                      </small>
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── Battlefield H2H ── */}
        {bfH2HEntries.length > 0 && (
          <div className="lp-section">
            <div className="lp-section-corner-tr" />
            <div className="lp-section-corner-bl" />
            <div className="lp-section-title">Battlefield Matchup Data</div>
            <div className="lp-bf-table">
              <div className="lp-bf-header">
                <span>My BF vs Opp BF · vs Legend</span>
                <span>Win Rate</span>
                <span>Record</span>
              </div>
              {bfH2HEntries.map(([key, rec]) => {
                const t = rec.wins + rec.losses;
                const w = ((rec.wins / t) * 100).toFixed(1);
                return (
                  <div key={key} className="lp-bf-row">
                    <span className="lp-bf-name">{key}</span>
                    <span
                      className="lp-bf-stat"
                      style={{
                        color: parseFloat(w) >= 50 ? "#27AE60" : "#C0392B",
                      }}
                    >
                      {w}%
                    </span>
                    <span className="lp-bf-stat">
                      {rec.wins}W — {rec.losses}L
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
