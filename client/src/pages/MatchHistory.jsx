import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./MatchHistory.css";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

export default function MatchHistory() {
  const [matches, setMatches] = useState([]);
  const [legends, setLegends] = useState([]);
  const [battlefields, setBattlefields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedMatch, setExpandedMatch] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get("/matches"),
      API.get("/legends"),
      API.get("/battlefields"),
    ]).then(([m, l, b]) => {
      setMatches(m.data);
      setLegends(l.data);
      setBattlefields(b.data);
      setLoading(false);
    });
  }, []);

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

  const getBfImg = (bfName) => {
    if (!bfName) return null;
    const found = battlefields.find((b) => b.name === bfName);
    return found?.imageUrl
      ? `${found.imageUrl}?auto=format&fit=fill&q=80&w=200`
      : null;
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const filtered = matches.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      String(m.matchId).includes(q) ||
      m.player1?.toLowerCase().includes(q) ||
      m.player2?.toLowerCase().includes(q) ||
      m.player1Legend?.toLowerCase().includes(q) ||
      m.player2Legend?.toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="mh-loading">Loading...</div>;

  return (
    <div className="mh-page">
      <div className="mh-header">
        <div className="mh-header-glow" />
        <h1 className="mh-title">Match History</h1>
        <p className="mh-sub">{matches.length} matches recorded</p>
      </div>

      <div className="mh-container">
        <input
          className="mh-search"
          placeholder="Search by player, legend, or match ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="mh-list">
          {filtered.map((match) => {
            const p1Img = getLegendImg(match.player1Legend);
            const p2Img = getLegendImg(match.player2Legend);
            const isExpanded = expandedMatch === match.matchId;
            const p1Won = match.matchWinner === "Player1";

            return (
              <div key={match.matchId} className="mh-match">
                {/* ── Match Header ── */}
                <div
                  className="mh-match-header"
                  onClick={() =>
                    setExpandedMatch(isExpanded ? null : match.matchId)
                  }
                >
                  {/* Legend art backgrounds */}
                  {p1Img && (
                    <div
                      className="mh-legend-bg mh-legend-bg-left"
                      style={{ backgroundImage: `url(${p1Img})` }}
                    />
                  )}
                  {p2Img && (
                    <div
                      className="mh-legend-bg mh-legend-bg-right"
                      style={{ backgroundImage: `url(${p2Img})` }}
                    />
                  )}
                  <div className="mh-match-overlay" />

                  {/* Content */}
                  <div className="mh-match-content">
                    {/* Player 1 side */}
                    <div
                      className={`mh-player-side mh-player-left ${p1Won ? "mh-side-winner" : "mh-side-loser"}`}
                    >
                      <div className="mh-player-name">{match.player1}</div>
                      <div className="mh-player-legend">
                        {match.player1Legend}
                      </div>
                      <div className="mh-player-arch">
                        {match.player1Archetype}
                      </div>
                      {p1Won && <div className="mh-winner-badge">WINNER</div>}
                    </div>

                    {/* Center info */}
                    <div className="mh-center">
                      <div className="mh-match-id">#{match.matchId}</div>
                      <div className="mh-vs">VS</div>
                      <div className="mh-games-score">
                        <span
                          className={p1Won ? "mh-score-win" : "mh-score-loss"}
                        >
                          {
                            match.games.filter(
                              (g) => g.gameWinner === "Player1",
                            ).length
                          }
                        </span>
                        <span className="mh-score-dash">—</span>
                        <span
                          className={!p1Won ? "mh-score-win" : "mh-score-loss"}
                        >
                          {
                            match.games.filter(
                              (g) => g.gameWinner === "Player2",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="mh-format">
                        {match.isBo3 ? "Bo3" : "Bo1"}
                      </div>
                      <div className="mh-date">
                        {formatDate(match.createdAt)}
                      </div>
                      <div className="mh-expand-icon">
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </div>

                    {/* Player 2 side */}
                    <div
                      className={`mh-player-side mh-player-right ${!p1Won ? "mh-side-winner" : "mh-side-loser"}`}
                    >
                      {!p1Won && <div className="mh-winner-badge">WINNER</div>}
                      <div className="mh-player-name">{match.player2}</div>
                      <div className="mh-player-legend">
                        {match.player2Legend}
                      </div>
                      <div className="mh-player-arch">
                        {match.player2Archetype}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Expanded Game Details ── */}
                {isExpanded && (
                  <div className="mh-games">
                    <div className="mh-games-header">
                      <span>Game</span>
                      <span>First</span>
                      <span>P1 Battlefield</span>
                      <span>Score</span>
                      <span>P2 Battlefield</span>
                      <span>Turns</span>
                      <span>Winner</span>
                    </div>

                    {match.games.map((g, i) => {
                      const p1BfImg = getBfImg(g.player1Battlefield);
                      const p2BfImg = getBfImg(g.player2Battlefield);
                      const gameP1Won = g.gameWinner === "Player1";

                      return (
                        <div key={i} className="mh-game-row">
                          <div className="mh-game-num">
                            <span>G{i + 1}</span>
                          </div>

                          <div className="mh-game-first">
                            <span
                              className={
                                g.whoWentFirst === "Player1"
                                  ? "mh-first-p1"
                                  : "mh-first-p2"
                              }
                            >
                              {g.whoWentFirst === "Player1"
                                ? match.player1
                                : match.player2}
                            </span>
                          </div>

                          <div className="mh-game-bf">
                            {p1BfImg && (
                              <img
                                src={p1BfImg}
                                alt={g.player1Battlefield}
                                className="mh-bf-img"
                              />
                            )}
                            <span>{g.player1Battlefield}</span>
                          </div>

                          <div className="mh-game-score-cell">
                            <span
                              className={
                                gameP1Won ? "mh-score-win" : "mh-score-loss"
                              }
                            >
                              {g.player1Score}
                            </span>
                            <span className="mh-score-dash">—</span>
                            <span
                              className={
                                !gameP1Won ? "mh-score-win" : "mh-score-loss"
                              }
                            >
                              {g.player2Score}
                            </span>
                          </div>

                          <div className="mh-game-bf mh-game-bf-right">
                            <span>{g.player2Battlefield}</span>
                            {p2BfImg && (
                              <img
                                src={p2BfImg}
                                alt={g.player2Battlefield}
                                className="mh-bf-img"
                              />
                            )}
                          </div>

                          <div className="mh-game-turns">{g.turns} turns</div>

                          <div
                            className={`mh-game-winner ${gameP1Won ? "mh-winner-p1" : "mh-winner-p2"}`}
                          >
                            {gameP1Won ? match.player1 : match.player2}
                          </div>
                        </div>
                      );
                    })}

                    {/* Match footer */}
                    <div className="mh-match-footer">
                      <span className="mh-footer-label">Reporter</span>
                      <span className="mh-footer-value">{match.reporter}</span>
                      {match.notes && (
                        <>
                          <span className="mh-footer-label">Notes</span>
                          <span className="mh-footer-value">{match.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="mh-empty">No matches found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
