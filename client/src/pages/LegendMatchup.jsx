import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./LegendMatchup.css";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

export default function LegendMatchup() {
  const { legendName, opponentName } = useParams();
  const navigate = useNavigate();
  const name = decodeURIComponent(legendName);
  const opponent = decodeURIComponent(opponentName);

  const [matches, setMatches] = useState([]);
  const [myLegend, setMyLegend] = useState(null);
  const [oppLegend, setOppLegend] = useState(null);
  const [battlefields, setBattlefields] = useState([]);
  const [includeRandom, setIncludeRandom] = useState(false);
  const [loading, setLoading] = useState(true);

  const championName = name.split(",")[0].trim();
  const oppChampionName = opponent.split(",")[0].trim();

  useEffect(() => {
    Promise.all([
      API.get("/matches"),
      API.get("/legends"),
      API.get("/battlefields"),
    ]).then(([m, l, b]) => {
      setMatches(m.data);
      setMyLegend(
        l.data.find(
          (leg) => leg.name === name || leg.name.startsWith(championName),
        ) || null,
      );
      setOppLegend(
        l.data.find(
          (leg) =>
            leg.name === opponent || leg.name.startsWith(oppChampionName),
        ) || null,
      );
      setBattlefields(b.data);
      setLoading(false);
    });
  }, [name, opponent]);

  const getBfImage = (bfName) => {
    const bf = battlefields.find((b) => b.name === bfName?.trim());
    return bf?.imageUrl
      ? `${bf.imageUrl}?auto=format&fit=fill&q=80&w=120`
      : null;
  };

  if (loading) return <div className="lmu-loading">Loading...</div>;

  // ── Filter matches for this specific matchup ──
  const relevantMatches = matches.filter((m) => {
    const myIsP1 = m.player1Legend === championName || m.player1Legend === name;
    const myIsP2 = m.player2Legend === championName || m.player2Legend === name;
    const oppIsP1 =
      m.player1Legend === oppChampionName || m.player1Legend === opponent;
    const oppIsP2 =
      m.player2Legend === oppChampionName || m.player2Legend === opponent;
    const valid = (myIsP1 && oppIsP2) || (myIsP2 && oppIsP1);
    if (!valid) return false;
    if (!includeRandom && (m.player1 === "Random" || m.player2 === "Random"))
      return false;
    return true;
  });

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
      const key = `${myBf} vs ${oppBf}`;
      if (!bfStats[key])
        bfStats[key] = {
          wins: 0,
          losses: 0,
          first: 0,
          second: 0,
          firstWins: 0,
          secondWins: 0,
        };
      if (gameWon) bfStats[key].wins++;
      else bfStats[key].losses++;
      if (myFirst) {
        bfStats[key].first++;
        if (gameWon) bfStats[key].firstWins++;
      } else {
        bfStats[key].second++;
        if (gameWon) bfStats[key].secondWins++;
      }
    });
  });

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const myBgUrl = myLegend?.imageUrl
    ? `${myLegend.imageUrl}?auto=format&fit=fill&q=80&w=1200`
    : null;
  const oppBgUrl = oppLegend?.imageUrl
    ? `${oppLegend.imageUrl}?auto=format&fit=fill&q=80&w=400`
    : null;

  return (
    <div className="lmu-page">
      {/* ── Header ── */}
      <div
        className="lmu-header"
        style={
          myBgUrl
            ? {
                backgroundImage: `url(${myBgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center 20%",
              }
            : {}
        }
      >
        <div className="lmu-header-glow" />
        {myBgUrl && (
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
          <button
            className="lmu-back"
            onClick={() => navigate(`/legends/${encodeURIComponent(name)}`)}
          >
            ← {championName}
          </button>
          <div className="lmu-header-inner">
            <div className="lmu-matchup-title">
              <div className="lmu-side">
                {myBgUrl && (
                  <div
                    className="lmu-mini-art"
                    style={{
                      backgroundImage: `url(${myBgUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center 20%",
                    }}
                  />
                )}
                <div>
                  <div className="lmu-champ-name lmu-champ-blue">
                    {championName}
                  </div>
                  <div className="lmu-champ-title">
                    {name.split(",")[1]?.trim()}
                  </div>
                </div>
              </div>

              <div className="lmu-vs-block">
                <div className="lmu-vs">VS</div>
                {total > 0 && (
                  <div
                    className="lmu-overall-wr"
                    style={{
                      color: parseFloat(wr) >= 50 ? "#27AE60" : "#C0392B",
                    }}
                  >
                    {wr}%
                  </div>
                )}
              </div>

              <div className="lmu-side lmu-side-right">
                <div>
                  <div className="lmu-champ-name lmu-champ-red">
                    {oppChampionName}
                  </div>
                  <div className="lmu-champ-title">
                    {opponent.split(",")[1]?.trim()}
                  </div>
                </div>
                {oppBgUrl && (
                  <div
                    className="lmu-mini-art"
                    style={{
                      backgroundImage: `url(${oppBgUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center 20%",
                    }}
                  />
                )}
              </div>
            </div>

            <div className="lmu-toggle-wrap">
              <span className="lmu-toggle-label">Include Random opponents</span>
              <button
                className={`lmu-toggle ${includeRandom ? "lmu-toggle-on" : ""}`}
                onClick={() => setIncludeRandom(!includeRandom)}
              >
                <span className="lmu-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lmu-container">
        {/* ── Overview Stats ── */}
        <div className="lmu-stat-row">
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
            <div key={label} className="lmu-stat-card">
              <div className={`lmu-stat-value ${gold ? "lmu-stat-gold" : ""}`}>
                {value}
              </div>
              {sub && <div className="lmu-stat-sub">{sub}</div>}
              <div className="lmu-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {total === 0 && (
          <div className="lmu-section">
            <div className="lmu-empty">
              No matches found for this matchup yet.
            </div>
          </div>
        )}

        {/* ── Battlefield Stats ── */}
        {Object.keys(bfStats).length > 0 && (
          <div className="lmu-section">
            <div className="lmu-section-corner-tr" />
            <div className="lmu-section-corner-bl" />
            <div className="lmu-section-title">
              Battlefield Win Rates · {championName} vs {oppChampionName}
            </div>
            <div className="lmu-bf-table">
              <div className="lmu-bf-header">
                <span>My BF vs Opp BF</span>
                <span>Overall</span>
                <span>Going First</span>
                <span>Going Second</span>
              </div>
              {Object.entries(bfStats)
                .sort(
                  (a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses),
                )
                .map(([key, s]) => {
                  const overallWR = (
                    (s.wins / (s.wins + s.losses)) *
                    100
                  ).toFixed(1);
                  const fWR = s.first
                    ? ((s.firstWins / s.first) * 100).toFixed(1)
                    : "—";
                  const sWR = s.second
                    ? ((s.secondWins / s.second) * 100).toFixed(1)
                    : "—";
                  const [myBfName, oppBfName] = key.split(" vs ");
                  const myBfImg = getBfImage(myBfName);
                  const oppBfImg = getBfImage(oppBfName);
                  return (
                    <div key={key} className="lmu-bf-row">
                      <span className="lmu-bf-name">
                        {myBfImg && (
                          <img
                            src={myBfImg}
                            alt={myBfName}
                            style={{
                              width: "48px",
                              height: "34px",
                              objectFit: "cover",
                              borderRadius: "2px",
                              border: "1px solid #1E2D45",
                            }}
                          />
                        )}
                        <span>{myBfName}</span>
                        <span style={{ color: "#5B5A56", fontSize: "11px" }}>
                          vs
                        </span>
                        {oppBfImg && (
                          <img
                            src={oppBfImg}
                            alt={oppBfName}
                            style={{
                              width: "48px",
                              height: "34px",
                              objectFit: "cover",
                              borderRadius: "2px",
                              border: "1px solid #1E2D45",
                            }}
                          />
                        )}
                        <span>{oppBfName}</span>
                      </span>
                      <span
                        className="lmu-bf-stat"
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
                      <span className="lmu-bf-stat">
                        {fWR}
                        {fWR !== "—" ? "%" : ""}{" "}
                        <small>
                          ({s.firstWins}/{s.first})
                        </small>
                      </span>
                      <span className="lmu-bf-stat">
                        {sWR}
                        {sWR !== "—" ? "%" : ""}{" "}
                        <small>
                          ({s.secondWins}/{s.second})
                        </small>
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Match History ── */}
        {relevantMatches.length > 0 && (
          <div className="lmu-section">
            <div className="lmu-section-corner-tr" />
            <div className="lmu-section-corner-bl" />
            <div className="lmu-section-title">
              Match History ({relevantMatches.length})
            </div>
            {relevantMatches.map((m) => {
              const isP1 =
                m.player1Legend === championName || m.player1Legend === name;
              const won =
                (isP1 && m.matchWinner === "Player1") ||
                (!isP1 && m.matchWinner === "Player2");
              const myPlayer = isP1 ? m.player1 : m.player2;
              const oppPlayer = isP1 ? m.player2 : m.player1;
              return (
                <div
                  key={m.matchId}
                  className={`lmu-match-card ${won ? "lmu-match-win" : "lmu-match-loss"}`}
                >
                  <div className="lmu-match-top">
                    <div className="lmu-match-id">#{m.matchId}</div>
                    <div className="lmu-match-players">
                      <span className="lmu-match-p1">{myPlayer}</span>
                      <span className="lmu-match-vs">vs</span>
                      <span className="lmu-match-p2">{oppPlayer}</span>
                    </div>
                    <div
                      className={`lmu-match-result ${won ? "lmu-result-win" : "lmu-result-loss"}`}
                    >
                      {won ? "WIN" : "LOSS"}
                    </div>
                    <div className="lmu-match-date">
                      {formatDate(m.createdAt)}
                    </div>
                  </div>
                  <div className="lmu-games">
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
                      const myBfImg = getBfImage(myBf);
                      const oppBfImg = getBfImage(oppBf);
                      return (
                        <div
                          key={i}
                          className={`lmu-game ${gameWon ? "lmu-game-win" : "lmu-game-loss"}`}
                        >
                          <div className="lmu-game-num">G{i + 1}</div>
                          <div className="lmu-game-score">
                            <span
                              className={
                                gameWon ? "lmu-score-win" : "lmu-score-loss"
                              }
                            >
                              {myScore}
                            </span>
                            <span className="lmu-score-sep">—</span>
                            <span
                              className={
                                !gameWon ? "lmu-score-win" : "lmu-score-loss"
                              }
                            >
                              {oppScore}
                            </span>
                          </div>
                          <div
                            className="lmu-game-bf"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {myBfImg && (
                              <img
                                src={myBfImg}
                                alt={myBf}
                                style={{
                                  width: "36px",
                                  height: "26px",
                                  objectFit: "cover",
                                  borderRadius: "2px",
                                  border: "1px solid #1E2D45",
                                }}
                              />
                            )}
                            <span>{myBf}</span>
                            <span
                              style={{ color: "#5B5A56", fontSize: "11px" }}
                            >
                              vs
                            </span>
                            {oppBfImg && (
                              <img
                                src={oppBfImg}
                                alt={oppBf}
                                style={{
                                  width: "36px",
                                  height: "26px",
                                  objectFit: "cover",
                                  borderRadius: "2px",
                                  border: "1px solid #1E2D45",
                                }}
                              />
                            )}
                            <span>{oppBf}</span>
                          </div>
                          <div className="lmu-game-meta">
                            {g.turns} turns ·{" "}
                            {wentFirst ? "went first" : "went second"}
                          </div>
                          <div
                            className={`lmu-game-result ${gameWon ? "lmu-game-w" : "lmu-game-l"}`}
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
        )}
      </div>
    </div>
  );
}
