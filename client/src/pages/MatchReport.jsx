import { useState, useEffect } from "react";
import axios from "axios";
import "./MatchReport.css";
import Autocomplete from "../Autocomplete";

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

export default function MatchReport() {
  const [players, setPlayers] = useState([]);
  const [archetypes, setArchetypes] = useState([]);
  const [nextMatchId, setNextMatchId] = useState(0);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    reporter: "",
    player1: "",
    player2: "",
    player1Legend: "",
    player1Archetype: "",
    player2Legend: "",
    player2Archetype: "",
    isBo3: true,
    gamesPlayed: "",
    matchWinner: "",
    notes: "",
  });

  const [games, setGames] = useState([]);
  const [duplicate, setDuplicate] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get("/players"),
      API.get("/archetypes"),
      API.get("/matches/meta/nextId"),
    ]).then(([p, a, m]) => {
      setPlayers(p.data.filter((pl) => pl.gamertag !== "Random"));
      setArchetypes(a.data);
      setNextMatchId(m.data.nextId);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const count = parseInt(form.gamesPlayed);
    if (!count || count < 1 || count > 3) {
      setGames([]);
      return;
    }
    setGames(Array.from({ length: count }, (_, i) => emptyGame(i + 1)));
  }, [form.gamesPlayed]);

  useEffect(() => {
    if (!games.length) return;
    const p1wins = games.filter((g) => g.gameWinner === "Player1").length;
    const p2wins = games.filter((g) => g.gameWinner === "Player2").length;
    if (p1wins > p2wins) setForm((f) => ({ ...f, matchWinner: "Player1" }));
    else if (p2wins > p1wins)
      setForm((f) => ({ ...f, matchWinner: "Player2" }));
  }, [games]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setGameField = (index, key, val) => {
    setGames((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  const buildPayload = (force = false) => ({
    matchId: nextMatchId,
    reporter: form.reporter,
    player1: form.player1,
    player2: form.player2 || "Random",
    player1Legend: form.player1Legend,
    player1Archetype: form.player1Archetype,
    player2Legend: form.player2Legend,
    player2Archetype: form.player2Archetype,
    isBo3: form.isBo3,
    gamesPlayed: parseInt(form.gamesPlayed),
    games: games.map((g) => ({
      ...g,
      player1Score: parseInt(g.player1Score),
      player2Score: parseInt(g.player2Score),
      turns: parseInt(g.turns),
    })),
    matchWinner: form.matchWinner,
    notes: form.notes,
    force,
  });

  const handleSubmit = async (force = false) => {
    setSubmitting(true);
    setDuplicate(null);
    try {
      await API.post("/matches", buildPayload(force));
      setSuccess(true);
      setForm({
        reporter: "",
        player1: "",
        player2: "",
        player1Legend: "",
        player1Archetype: "",
        player2Legend: "",
        player2Archetype: "",
        isBo3: false,
        gamesPlayed: "",
        matchWinner: "",
        notes: "",
      });
      setGames([]);
      const m = await API.get("/matches/meta/nextId");
      setNextMatchId(m.data.nextId);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      if (err.response?.status === 409) setDuplicate(err.response.data);
    } finally {
      setSubmitting(false);
    }
  };

  const playerNames = players.map((p) => p.gamertag);
  const archetypeNames = archetypes.map((a) => a.name);
  const p1Label = form.player1 || "Player 1";
  const p2Label = form.player2 || "Player 2";

  if (loading) return <div className="mr-loading">Loading...</div>;

  return (
    <div className="mr-page">
      <div className="mr-header">
        <div className="mr-header-glow" />
        <p className="mr-header-title">Match Report</p>
        <p className="mr-header-sub">
          Match #{nextMatchId} · Riftbound TCG Tracker
        </p>
      </div>

      <div className="mr-container">
        {success && (
          <div className="mr-success">
            ✓ &nbsp; Match #{nextMatchId - 1} submitted successfully
          </div>
        )}

        {duplicate && (
          <div className="mr-warning">
            <div className="mr-warning-text">⚠ &nbsp; {duplicate.message}</div>
            <div className="mr-warning-btns">
              <button
                className="mr-btn-cancel"
                onClick={() => setDuplicate(null)}
              >
                Cancel
              </button>
              <button
                className="mr-btn-force"
                onClick={() => handleSubmit(true)}
              >
                Submit Anyway
              </button>
            </div>
          </div>
        )}

        {/* ── Match Details ── */}
        <div className="mr-section">
          <div className="mr-section-corner-tr" />
          <div className="mr-section-corner-bl" />
          <div className="mr-section-title">Match Details</div>

          <div className="mr-grid-3" style={{ marginBottom: "16px" }}>
            <div className="mr-field">
              <label className="mr-label">Reporter</label>
              <Autocomplete
                options={playerNames}
                value={form.reporter}
                onChange={(val) => setField("reporter", val)}
                placeholder="Search reporter..."
              />
            </div>
            <div className="mr-field">
              <label className="mr-label">Format</label>
              <select
                className="mr-select"
                value={form.isBo3 ? "bo3" : "bo1"}
                onChange={(e) => setField("isBo3", e.target.value === "bo3")}
              >
                <option value="bo1">Best of 1</option>
                <option value="bo3">Best of 3</option>
              </select>
            </div>
            <div className="mr-field">
              <label className="mr-label">Games Played</label>
              <select
                className="mr-select"
                value={form.gamesPlayed}
                onChange={(e) => setField("gamesPlayed", e.target.value)}
              >
                <option value="">Select</option>
                {form.isBo3 ? (
                  [1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))
                ) : (
                  <option value="1">1</option>
                )}
              </select>
            </div>
          </div>

          <div className="mr-divider" />

          <div className="mr-grid-2">
            {/* Player 1 */}
            <div>
              <div className="mr-label-p1">Player 1</div>
              <div className="mr-player-col">
                <div className="mr-field">
                  <label className="mr-label">Name</label>
                  <Autocomplete
                    options={playerNames}
                    value={form.player1}
                    onChange={(val) => setField("player1", val)}
                    placeholder="Search player..."
                  />
                </div>
                <div className="mr-field">
                  <label className="mr-label">Legend</label>
                  <input
                    className="mr-input"
                    placeholder="e.g. Viktor"
                    value={form.player1Legend}
                    onChange={(e) => setField("player1Legend", e.target.value)}
                  />
                </div>
                <div className="mr-field">
                  <label className="mr-label">Archetype</label>
                  <Autocomplete
                    options={archetypeNames}
                    value={form.player1Archetype}
                    onChange={(val) => setField("player1Archetype", val)}
                    placeholder="Search archetype..."
                  />
                </div>
              </div>
            </div>

            {/* Player 2 */}
            <div>
              <div className="mr-label-p2">Player 2</div>
              <div className="mr-player-col">
                <div className="mr-field">
                  <label className="mr-label">Name</label>
                  <Autocomplete
                    options={["Random", ...playerNames]}
                    value={form.player2}
                    onChange={(val) => setField("player2", val)}
                    placeholder="Search or Random..."
                  />
                </div>
                <div className="mr-field">
                  <label className="mr-label">Legend</label>
                  <input
                    className="mr-input"
                    placeholder="e.g. Jinx"
                    value={form.player2Legend}
                    onChange={(e) => setField("player2Legend", e.target.value)}
                  />
                </div>
                <div className="mr-field">
                  <label className="mr-label">Archetype</label>
                  <Autocomplete
                    options={archetypeNames}
                    value={form.player2Archetype}
                    onChange={(val) => setField("player2Archetype", val)}
                    placeholder="Search archetype..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Game Sections ── */}
        {games.length > 0 && (
          <div className="mr-section">
            <div className="mr-section-corner-tr" />
            <div className="mr-section-corner-bl" />
            <div className="mr-section-title">Game Results</div>

            {games.map((game, i) => (
              <div key={i} className="mr-game">
                <div className="mr-game-title">Game {i + 1}</div>

                <div className="mr-field" style={{ marginBottom: "16px" }}>
                  <label className="mr-label">Who Went First</label>
                  <div className="mr-toggle-row">
                    <button
                      className={`mr-toggle mr-toggle-p1 ${game.whoWentFirst === "Player1" ? "active" : ""}`}
                      onClick={() => setGameField(i, "whoWentFirst", "Player1")}
                    >
                      {p1Label}
                    </button>
                    <button
                      className={`mr-toggle mr-toggle-p2 ${game.whoWentFirst === "Player2" ? "active" : ""}`}
                      onClick={() => setGameField(i, "whoWentFirst", "Player2")}
                    >
                      {p2Label}
                    </button>
                  </div>
                </div>

                <div className="mr-field" style={{ marginBottom: "16px" }}>
                  <label className="mr-label">Score</label>
                  <div className="mr-score-row">
                    <input
                      className="mr-num-input mr-input-p1"
                      type="number"
                      min="0"
                      max="10"
                      placeholder="0"
                      value={game.player1Score}
                      onChange={(e) =>
                        setGameField(i, "player1Score", e.target.value)
                      }
                    />
                    <span className="mr-score-sep">—</span>
                    <input
                      className="mr-num-input mr-input-p2"
                      type="number"
                      min="0"
                      max="10"
                      placeholder="0"
                      value={game.player2Score}
                      onChange={(e) =>
                        setGameField(i, "player2Score", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="mr-grid-3" style={{ marginBottom: "16px" }}>
                  <div className="mr-field">
                    <label className="mr-label">{p1Label} Battlefield</label>
                    <input
                      className="mr-input"
                      placeholder="e.g. Reaver's Row"
                      value={game.player1Battlefield}
                      onChange={(e) =>
                        setGameField(i, "player1Battlefield", e.target.value)
                      }
                    />
                  </div>
                  <div className="mr-field">
                    <label className="mr-label">{p2Label} Battlefield</label>
                    <input
                      className="mr-input"
                      placeholder="e.g. Obelisk of Power"
                      value={game.player2Battlefield}
                      onChange={(e) =>
                        setGameField(i, "player2Battlefield", e.target.value)
                      }
                    />
                  </div>
                  <div className="mr-field">
                    <label className="mr-label">Turns</label>
                    <input
                      className="mr-num-input"
                      type="number"
                      min="1"
                      placeholder="0"
                      value={game.turns}
                      onChange={(e) => setGameField(i, "turns", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mr-field">
                  <label className="mr-label">Game Winner</label>
                  <div className="mr-toggle-row">
                    <button
                      className={`mr-toggle mr-toggle-p1 ${game.gameWinner === "Player1" ? "active" : ""}`}
                      onClick={() => setGameField(i, "gameWinner", "Player1")}
                    >
                      {p1Label}
                    </button>
                    <button
                      className={`mr-toggle mr-toggle-p2 ${game.gameWinner === "Player2" ? "active" : ""}`}
                      onClick={() => setGameField(i, "gameWinner", "Player2")}
                    >
                      {p2Label}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="mr-field" style={{ marginTop: "20px" }}>
              <label className="mr-label">
                Match Winner (auto-derived · override if needed)
              </label>
              <div className="mr-toggle-row">
                <button
                  className={`mr-toggle mr-toggle-p1 ${form.matchWinner === "Player1" ? "active" : ""}`}
                  onClick={() => setField("matchWinner", "Player1")}
                >
                  {p1Label}
                </button>
                <button
                  className={`mr-toggle mr-toggle-p2 ${form.matchWinner === "Player2" ? "active" : ""}`}
                  onClick={() => setField("matchWinner", "Player2")}
                >
                  {p2Label}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Notes & Submit ── */}
        <div className="mr-section">
          <div className="mr-section-corner-tr" />
          <div className="mr-section-corner-bl" />
          <div className="mr-section-title">Notes</div>
          <textarea
            className="mr-textarea"
            placeholder="Any notable plays, context, or comments..."
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
          <button
            className="mr-submit"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Match Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
