import { useState, useEffect } from "react";
import axios from "axios";
import "./Admin.css";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

const emptyGame = (num) => ({
  gameNumber: num,
  whoWentFirst: "",
  player1Score: "",
  player2Score: "",
  player1Battlefield: "",
  player2Battlefield: "",
  turns: "",
  gameWinner: "",
});

export default function Admin() {
  const [players, setPlayers] = useState([]);
  const [archetypes, setArchetypes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState("players");
  const [matchSearch, setMatchSearch] = useState("");

  // Player form
  const [playerForm, setPlayerForm] = useState({ realName: "", gamertag: "" });
  const [playerMsg, setPlayerMsg] = useState(null);

  // Archetype form
  const [archetypeForm, setArchetypeForm] = useState({
    name: "",
    description: "",
  });
  const [archetypeMsg, setArchetypeMsg] = useState(null);

  // Edit modal
  const [editMatch, setEditMatch] = useState(null);
  const [editMsg, setEditMsg] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Debug
  const [dbStats, setDbStats] = useState(null);

  useEffect(() => {
    fetchPlayers();
    fetchArchetypes();
    fetchMatches();
  }, []);

  const fetchPlayers = async () => {
    const res = await API.get("/players");
    setPlayers(res.data);
  };

  const fetchArchetypes = async () => {
    const res = await API.get("/archetypes");
    setArchetypes(res.data);
  };

  const fetchMatches = async () => {
    const res = await API.get("/matches");
    setMatches(res.data);
  };

  const fetchDebug = async () => {
    const [p, a, m] = await Promise.all([
      API.get("/players"),
      API.get("/archetypes"),
      API.get("/matches"),
    ]);
    setDbStats({
      players: p.data.length,
      archetypes: a.data.length,
      matches: m.data.length,
    });
  };

  // ── Player submit ──
  const handleAddPlayer = async () => {
    try {
      const nextId = await API.get("/players/meta/nextId");
      await API.post("/players", {
        ...playerForm,
        playerId: nextId.data.nextId,
      });
      setPlayerMsg({
        type: "success",
        text: `Player "${playerForm.gamertag}" added successfully.`,
      });
      setPlayerForm({ realName: "", gamertag: "" });
      fetchPlayers();
    } catch (err) {
      setPlayerMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to add player.",
      });
    }
    setTimeout(() => setPlayerMsg(null), 4000);
  };

  const handleDeletePlayer = async (gamertag) => {
    if (
      !window.confirm(
        `Delete player "${gamertag}"? This will not remove their matches.`,
      )
    )
      return;
    await API.delete(`/players/${gamertag}`);
    fetchPlayers();
  };

  // ── Archetype submit ──
  const handleAddArchetype = async () => {
    try {
      await API.post("/archetypes", archetypeForm);
      setArchetypeMsg({
        type: "success",
        text: `Archetype "${archetypeForm.name}" added successfully.`,
      });
      setArchetypeForm({ name: "", description: "" });
      fetchArchetypes();
    } catch (err) {
      setArchetypeMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to add archetype.",
      });
    }
    setTimeout(() => setArchetypeMsg(null), 4000);
  };

  const handleDeleteArchetype = async (id, name) => {
    if (!window.confirm(`Delete archetype "${name}"?`)) return;
    await API.delete(`/archetypes/${id}`);
    fetchArchetypes();
  };

  // ── Match delete ──
  const handleDeleteMatch = async (matchId) => {
    if (
      !window.confirm(
        `Delete match #${matchId}? This will update both players' records.`,
      )
    )
      return;
    await API.delete(`/matches/${matchId}`);
    fetchMatches();
    fetchPlayers();
  };

  // ── Edit modal ──
  const openEdit = (match) => {
    setEditMatch(JSON.parse(JSON.stringify(match)));
    setEditMsg(null);
  };

  const closeEdit = () => {
    setEditMatch(null);
    setEditMsg(null);
  };

  const setEditField = (key, val) => {
    setEditMatch((m) => ({ ...m, [key]: val }));
  };

  const setEditGameField = (i, key, val) => {
    setEditMatch((m) => {
      const games = [...m.games];
      games[i] = { ...games[i], [key]: val };
      return { ...m, games };
    });
  };

  const handleEditSubmit = async () => {
    setEditSubmitting(true);
    try {
      await API.put(`/matches/${editMatch.matchId}`, editMatch);
      setEditMsg({ type: "success", text: "Match updated successfully." });
      fetchMatches();
      fetchPlayers();
      setTimeout(() => closeEdit(), 1500);
    } catch (err) {
      setEditMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to update match.",
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Filtered matches ──
  const filteredMatches = matches.filter((m) => {
    const q = matchSearch.toLowerCase();
    return (
      !q ||
      String(m.matchId).includes(q) ||
      m.player1?.toLowerCase().includes(q) ||
      m.player2?.toLowerCase().includes(q) ||
      m.player1Legend?.toLowerCase().includes(q) ||
      m.player2Legend?.toLowerCase().includes(q) ||
      m.matchWinner?.toLowerCase().includes(q)
    );
  });

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const tabs = ["players", "archetypes", "matches", "debug"];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-glow" />
        <h1 className="admin-title">Admin Panel</h1>
        <p className="admin-sub">
          Manage players, archetypes, matches, and database
        </p>
      </div>

      <div className="admin-container">
        {/* ── Tabs ── */}
        <div className="admin-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`admin-tab ${activeTab === tab ? "admin-tab-active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "debug") fetchDebug();
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Players Tab ── */}
        {activeTab === "players" && (
          <div>
            <div className="admin-section">
              <div className="admin-section-corner-tr" />
              <div className="admin-section-corner-bl" />
              <div className="admin-section-title">Add New Player</div>
              {playerMsg && (
                <div
                  className={`admin-msg ${playerMsg.type === "success" ? "admin-msg-success" : "admin-msg-error"}`}
                >
                  {playerMsg.text}
                </div>
              )}
              <div className="admin-grid-2">
                <div className="admin-field">
                  <label className="admin-label">Prefered Name</label>
                  <input
                    className="admin-input"
                    placeholder="Search"
                    value={playerForm.realName}
                    onChange={(e) =>
                      setPlayerForm((f) => ({ ...f, realName: e.target.value }))
                    }
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Gamertag</label>
                  <input
                    className="admin-input"
                    placeholder="Search"
                    value={playerForm.gamertag}
                    onChange={(e) =>
                      setPlayerForm((f) => ({ ...f, gamertag: e.target.value }))
                    }
                  />
                </div>
              </div>
              <button className="admin-submit" onClick={handleAddPlayer}>
                Add Player
              </button>
            </div>

            <div className="admin-section">
              <div className="admin-section-corner-tr" />
              <div className="admin-section-corner-bl" />
              <div className="admin-section-title">
                Current Players ({players.length})
              </div>
              <div className="admin-list">
                {players.map((p) => (
                  <div key={p.gamertag} className="admin-list-item">
                    <div className="admin-list-main">
                      <span className="admin-list-primary">{p.gamertag}</span>
                      <span className="admin-list-secondary">{p.realName}</span>
                    </div>
                    <div className="admin-list-meta">
                      <span className="admin-list-stat">
                        {p.wins}W — {p.losses}L
                      </span>
                      <span className="admin-list-wr">{p.winRate}% WR</span>
                      <button
                        className="admin-delete-btn"
                        onClick={() => handleDeletePlayer(p.gamertag)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Archetypes Tab ── */}
        {activeTab === "archetypes" && (
          <div>
            <div className="admin-section">
              <div className="admin-section-corner-tr" />
              <div className="admin-section-corner-bl" />
              <div className="admin-section-title">Add New Archetype</div>
              {archetypeMsg && (
                <div
                  className={`admin-msg ${archetypeMsg.type === "success" ? "admin-msg-success" : "admin-msg-error"}`}
                >
                  {archetypeMsg.text}
                </div>
              )}
              <div className="admin-grid-2">
                <div className="admin-field">
                  <label className="admin-label">Archetype Name</label>
                  <input
                    className="admin-input"
                    placeholder="e.g. Control"
                    value={archetypeForm.name}
                    onChange={(e) =>
                      setArchetypeForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Description (optional)</label>
                  <input
                    className="admin-input"
                    placeholder=""
                    value={archetypeForm.description}
                    onChange={(e) =>
                      setArchetypeForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <button className="admin-submit" onClick={handleAddArchetype}>
                Add Archetype
              </button>
            </div>

            <div className="admin-section">
              <div className="admin-section-corner-tr" />
              <div className="admin-section-corner-bl" />
              <div className="admin-section-title">
                Current Archetypes ({archetypes.length})
              </div>
              <div className="admin-list">
                {archetypes.map((a) => (
                  <div key={a._id} className="admin-list-item">
                    <div className="admin-list-main">
                      <span className="admin-list-primary">{a.name}</span>
                      {a.description && (
                        <span className="admin-list-secondary">
                          {a.description}
                        </span>
                      )}
                    </div>
                    <button
                      className="admin-delete-btn"
                      onClick={() => handleDeleteArchetype(a._id, a.name)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Matches Tab ── */}
        {activeTab === "matches" && (
          <div className="admin-section">
            <div className="admin-section-corner-tr" />
            <div className="admin-section-corner-bl" />
            <div className="admin-section-title">
              Match Records ({matches.length})
            </div>

            <input
              className="admin-input"
              placeholder="Search by match ID, player, legend, or winner..."
              value={matchSearch}
              onChange={(e) => setMatchSearch(e.target.value)}
              style={{ marginBottom: "16px" }}
            />

            <div className="admin-match-list">
              {filteredMatches.map((m) => (
                <div key={m.matchId} className="admin-match-item">
                  <div className="admin-match-id">#{m.matchId}</div>
                  <div className="admin-match-info">
                    <div className="admin-match-players">
                      <span className="admin-match-p1">{m.player1}</span>
                      <span className="admin-match-vs">vs</span>
                      <span className="admin-match-p2">{m.player2}</span>
                    </div>
                    <div className="admin-match-meta">
                      <span className="admin-match-legends">
                        {m.player1Legend} vs {m.player2Legend}
                      </span>
                      <span className="admin-match-dot">·</span>
                      <span className="admin-match-winner">
                        {m.matchWinner === "Player1" ? m.player1 : m.player2}{" "}
                        won
                      </span>
                      <span className="admin-match-dot">·</span>
                      <span className="admin-match-date">
                        {formatDate(m.createdAt)}
                      </span>
                      <span className="admin-match-dot">·</span>
                      <span className="admin-match-games">
                        {m.gamesPlayed} game{m.gamesPlayed > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="admin-match-actions">
                    <button
                      className="admin-edit-btn"
                      onClick={() => openEdit(m)}
                    >
                      Edit
                    </button>
                    <button
                      className="admin-delete-btn"
                      onClick={() => handleDeleteMatch(m.matchId)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {filteredMatches.length === 0 && (
                <div className="admin-empty">No matches found.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Debug Tab ── */}
        {activeTab === "debug" && (
          <div className="admin-section">
            <div className="admin-section-corner-tr" />
            <div className="admin-section-corner-bl" />
            <div className="admin-section-title">Database Stats</div>
            {dbStats ? (
              <div className="admin-debug-grid">
                <div className="admin-debug-card">
                  <div className="admin-debug-value">{dbStats.players}</div>
                  <div className="admin-debug-label">Players</div>
                </div>
                <div className="admin-debug-card">
                  <div className="admin-debug-value">{dbStats.archetypes}</div>
                  <div className="admin-debug-label">Archetypes</div>
                </div>
                <div className="admin-debug-card">
                  <div className="admin-debug-value">{dbStats.matches}</div>
                  <div className="admin-debug-label">Matches</div>
                </div>
              </div>
            ) : (
              <div className="admin-debug-loading">Loading stats...</div>
            )}
            <button
              className="admin-submit"
              style={{ marginTop: "20px" }}
              onClick={fetchDebug}
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editMatch && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Match #{editMatch.matchId}</div>
              <button className="modal-close" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {editMsg && (
                <div
                  className={`admin-msg ${editMsg.type === "success" ? "admin-msg-success" : "admin-msg-error"}`}
                >
                  {editMsg.text}
                </div>
              )}

              {/* Reporter / Format / Games */}
              <div className="modal-section-title">Match Details</div>
              <div className="modal-grid-3">
                <div className="admin-field">
                  <label className="admin-label">Reporter</label>
                  <input
                    className="admin-input"
                    value={editMatch.reporter}
                    onChange={(e) => setEditField("reporter", e.target.value)}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Format</label>
                  <select
                    className="admin-select"
                    value={editMatch.isBo3 ? "bo3" : "bo1"}
                    onChange={(e) =>
                      setEditField("isBo3", e.target.value === "bo3")
                    }
                  >
                    <option value="bo1">Best of 1</option>
                    <option value="bo3">Best of 3</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Games Played</label>
                  <input
                    className="admin-input"
                    type="number"
                    min="1"
                    max="3"
                    value={editMatch.gamesPlayed}
                    onChange={(e) =>
                      setEditField("gamesPlayed", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              {/* Players */}
              <div className="modal-grid-2" style={{ marginTop: "16px" }}>
                <div>
                  <div className="modal-player-label-p1">Player 1</div>
                  <div className="admin-field" style={{ marginBottom: "10px" }}>
                    <label className="admin-label">Name</label>
                    <input
                      className="admin-input"
                      value={editMatch.player1}
                      onChange={(e) => setEditField("player1", e.target.value)}
                    />
                  </div>
                  <div className="admin-field" style={{ marginBottom: "10px" }}>
                    <label className="admin-label">Legend</label>
                    <input
                      className="admin-input"
                      value={editMatch.player1Legend}
                      onChange={(e) =>
                        setEditField("player1Legend", e.target.value)
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Archetype</label>
                    <input
                      className="admin-input"
                      value={editMatch.player1Archetype}
                      onChange={(e) =>
                        setEditField("player1Archetype", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <div className="modal-player-label-p2">Player 2</div>
                  <div className="admin-field" style={{ marginBottom: "10px" }}>
                    <label className="admin-label">Name</label>
                    <input
                      className="admin-input"
                      value={editMatch.player2}
                      onChange={(e) => setEditField("player2", e.target.value)}
                    />
                  </div>
                  <div className="admin-field" style={{ marginBottom: "10px" }}>
                    <label className="admin-label">Legend</label>
                    <input
                      className="admin-input"
                      value={editMatch.player2Legend}
                      onChange={(e) =>
                        setEditField("player2Legend", e.target.value)
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Archetype</label>
                    <input
                      className="admin-input"
                      value={editMatch.player2Archetype}
                      onChange={(e) =>
                        setEditField("player2Archetype", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Games */}
              {editMatch.games.map((game, i) => (
                <div key={i} className="modal-game">
                  <div className="modal-game-title">Game {i + 1}</div>
                  <div className="modal-grid-3">
                    <div className="admin-field">
                      <label className="admin-label">Who Went First</label>
                      <select
                        className="admin-select"
                        value={game.whoWentFirst}
                        onChange={(e) =>
                          setEditGameField(i, "whoWentFirst", e.target.value)
                        }
                      >
                        <option value="Player1">
                          {editMatch.player1 || "Player 1"}
                        </option>
                        <option value="Player2">
                          {editMatch.player2 || "Player 2"}
                        </option>
                      </select>
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">P1 Score</label>
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        max="10"
                        value={game.player1Score}
                        onChange={(e) =>
                          setEditGameField(
                            i,
                            "player1Score",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">P2 Score</label>
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        max="10"
                        value={game.player2Score}
                        onChange={(e) =>
                          setEditGameField(
                            i,
                            "player2Score",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="modal-grid-3" style={{ marginTop: "10px" }}>
                    <div className="admin-field">
                      <label className="admin-label">P1 Battlefield</label>
                      <input
                        className="admin-input"
                        value={game.player1Battlefield}
                        onChange={(e) =>
                          setEditGameField(
                            i,
                            "player1Battlefield",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">P2 Battlefield</label>
                      <input
                        className="admin-input"
                        value={game.player2Battlefield}
                        onChange={(e) =>
                          setEditGameField(
                            i,
                            "player2Battlefield",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Turns</label>
                      <input
                        className="admin-input"
                        type="number"
                        min="1"
                        value={game.turns}
                        onChange={(e) =>
                          setEditGameField(i, "turns", parseInt(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  <div className="admin-field" style={{ marginTop: "10px" }}>
                    <label className="admin-label">Game Winner</label>
                    <select
                      className="admin-select"
                      value={game.gameWinner}
                      onChange={(e) =>
                        setEditGameField(i, "gameWinner", e.target.value)
                      }
                    >
                      <option value="Player1">
                        {editMatch.player1 || "Player 1"}
                      </option>
                      <option value="Player2">
                        {editMatch.player2 || "Player 2"}
                      </option>
                    </select>
                  </div>
                </div>
              ))}

              {/* Match Winner */}
              <div className="admin-field" style={{ marginTop: "16px" }}>
                <label className="admin-label">Match Winner</label>
                <select
                  className="admin-select"
                  value={editMatch.matchWinner}
                  onChange={(e) => setEditField("matchWinner", e.target.value)}
                >
                  <option value="Player1">
                    {editMatch.player1 || "Player 1"}
                  </option>
                  <option value="Player2">
                    {editMatch.player2 || "Player 2"}
                  </option>
                </select>
              </div>

              {/* Notes */}
              <div className="admin-field" style={{ marginTop: "16px" }}>
                <label className="admin-label">Notes</label>
                <textarea
                  className="admin-textarea"
                  value={editMatch.notes}
                  onChange={(e) => setEditField("notes", e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={closeEdit}>
                Cancel
              </button>
              <button
                className="admin-submit modal-save-btn"
                onClick={handleEditSubmit}
                disabled={editSubmitting}
              >
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
