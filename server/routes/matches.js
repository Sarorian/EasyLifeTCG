const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const Player = require("../models/Player");

function calculateElo(playerElo, opponentElo, won, k = 32) {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const score = won ? 1 : 0;
  const change = Math.round(k * (score - expected));
  return { newElo: playerElo + change, change };
}

// ─── GET all matches ───────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const matches = await Match.find().sort({ matchId: -1 });
    res.json(matches);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch matches", error: err.message });
  }
});

// ─── GET next available matchId ───────────────────────────────────────────────
router.get("/meta/nextId", async (req, res) => {
  try {
    const latest = await Match.findOne().sort({ matchId: -1 });
    const nextId = latest ? latest.matchId + 1 : 0;
    res.json({ nextId });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to get next match ID", error: err.message });
  }
});

// ─── GET all matches by legend (either player) ────────────────────────────────
router.get("/legend/:legendName", async (req, res) => {
  try {
    const legend = req.params.legendName;
    const matches = await Match.find({
      $or: [{ player1Legend: legend }, { player2Legend: legend }],
    }).sort({ matchId: -1 });

    if (!matches.length)
      return res
        .status(404)
        .json({ message: `No matches found for legend: ${legend}` });
    res.json(matches);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch matches by legend",
      error: err.message,
    });
  }
});

// ─── GET all matches by legend on a specific side ─────────────────────────────
router.get("/legend/:legendName/:side", async (req, res) => {
  try {
    const { legendName, side } = req.params;

    if (!["player1", "player2"].includes(side)) {
      return res
        .status(400)
        .json({ message: 'Side must be "player1" or "player2"' });
    }

    const field = side === "player1" ? "player1Legend" : "player2Legend";
    const matches = await Match.find({ [field]: legendName }).sort({
      matchId: -1,
    });

    if (!matches.length)
      return res
        .status(404)
        .json({ message: `No matches found for ${legendName} on ${side}` });
    res.json(matches);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch matches by legend and side",
      error: err.message,
    });
  }
});

// ─── GET all matches by player ────────────────────────────────────────────────
router.get("/player/:playerName", async (req, res) => {
  try {
    const player = req.params.playerName;
    const matches = await Match.find({
      $or: [{ player1: player }, { player2: player }],
    }).sort({ matchId: -1 });

    if (!matches.length)
      return res
        .status(404)
        .json({ message: `No matches found for player: ${player}` });
    res.json(matches);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch matches by player",
      error: err.message,
    });
  }
});

// ─── GET a single match by matchId ────────────────────────────────────────────
router.get("/:matchId", async (req, res) => {
  try {
    const match = await Match.findOne({ matchId: req.params.matchId });
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch match", error: err.message });
  }
});

// ─── POST a new match (with duplicate detection) ──────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      player1,
      player2,
      player1Legend,
      player2Legend,
      gamesPlayed,
      matchWinner,
      games,
      force, // ← reporter confirmed it's a new match
    } = req.body;

    // 1. Skip duplicate check if reporter forced the submission
    if (!force) {
      const candidates = await Match.find({
        player1: player1,
        player2: player2,
        player1Legend: player1Legend,
        player2Legend: player2Legend,
        gamesPlayed: gamesPlayed,
        matchWinner: matchWinner,
      });

      const similarMatch = candidates.find((existing) => {
        return existing.games.every((existingGame, i) => {
          const newGame = games[i];
          if (!newGame) return false;

          const scoresMatch =
            existingGame.player1Score === newGame.player1Score &&
            existingGame.player2Score === newGame.player2Score;

          const battlefieldsMatch =
            existingGame.player1Battlefield === newGame.player1Battlefield &&
            existingGame.player2Battlefield === newGame.player2Battlefield;

          const turnsAreSimilar =
            Math.abs(existingGame.turns - newGame.turns) <= 2;

          const winnersMatch = existingGame.gameWinner === newGame.gameWinner;

          return (
            scoresMatch && battlefieldsMatch && turnsAreSimilar && winnersMatch
          );
        });
      });

      if (similarMatch) {
        return res.status(409).json({
          duplicate: true,
          message: `This match looks similar to match #${similarMatch.matchId} reported by ${similarMatch.reporter}. Please contact ${similarMatch.reporter} to confirm it hasn't already been entered.`,
          similarMatchId: similarMatch.matchId,
          reportedBy: similarMatch.reporter,
        });
      }
    }

    // 2. Save the match
    const match = new Match(req.body);
    await match.save();

    const { matchId } = match;

    // 3. Update player1
    await Player.findOneAndUpdate(
      { gamertag: player1 },
      {
        $push: { matchList: matchId },
        $inc: {
          wins: matchWinner === "Player1" ? 1 : 0,
          losses: matchWinner === "Player2" ? 1 : 0,
        },
      },
    );

    // 4. Update player2 (includes Random)
    await Player.findOneAndUpdate(
      { gamertag: player2 },
      {
        $push: { matchList: matchId },
        $inc: {
          wins: matchWinner === "Player2" ? 1 : 0,
          losses: matchWinner === "Player1" ? 1 : 0,
        },
      },
    );

    // ── ELO calculation (skip Random opponents) ──
    if (
      player1Doc &&
      player2Doc &&
      player1Doc.gamertag !== "Random" &&
      player2Doc.gamertag !== "Random"
    ) {
      const p1Won = matchWinner === "Player1";
      const p2Won = matchWinner === "Player2";

      const p1Elo = player1Doc.elo ?? 1500;
      const p2Elo = player2Doc.elo ?? 1500;

      const { newElo: p1NewElo, change: p1Change } = calculateElo(
        p1Elo,
        p2Elo,
        p1Won,
      );
      const { newElo: p2NewElo, change: p2Change } = calculateElo(
        p2Elo,
        p1Elo,
        p2Won,
      );

      player1Doc.elo = p1NewElo;
      player1Doc.eloHistory.push({
        matchId: savedMatch.matchId,
        elo: p1NewElo,
        change: p1Change,
        opponent: player2Doc.gamertag,
        won: p1Won,
        date: new Date(),
      });

      player2Doc.elo = p2NewElo;
      player2Doc.eloHistory.push({
        matchId: savedMatch.matchId,
        elo: p2NewElo,
        change: p2Change,
        opponent: player1Doc.gamertag,
        won: p2Won,
        date: new Date(),
      });

      await player1Doc.save();
      await player2Doc.save();
    }

    res.status(201).json(match);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to save match", error: err.message });
  }
});

// ─── PATCH update matchWinner override ────────────────────────────────────────
router.patch("/:matchId/winner", async (req, res) => {
  try {
    const { matchWinner } = req.body;
    const match = await Match.findOneAndUpdate(
      { matchId: req.params.matchId },
      { matchWinner },
      { new: true },
    );
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update winner", error: err.message });
  }
});

// ─── PUT full edit of a match ─────────────────────────────────────────────────
router.put("/:matchId", async (req, res) => {
  try {
    const oldMatch = await Match.findOne({ matchId: req.params.matchId });
    if (!oldMatch) return res.status(404).json({ message: "Match not found" });

    const newMatch = await Match.findOneAndUpdate(
      { matchId: req.params.matchId },
      req.body,
      { new: true, runValidators: true, overwrite: true },
    );

    if (oldMatch.matchWinner !== newMatch.matchWinner) {
      await Player.findOneAndUpdate(
        { gamertag: oldMatch.player1 },
        {
          $inc: {
            wins: oldMatch.matchWinner === "Player1" ? -1 : 1,
            losses: oldMatch.matchWinner === "Player2" ? -1 : 1,
          },
        },
      );
      await Player.findOneAndUpdate(
        { gamertag: oldMatch.player2 },
        {
          $inc: {
            wins: oldMatch.matchWinner === "Player2" ? -1 : 1,
            losses: oldMatch.matchWinner === "Player1" ? -1 : 1,
          },
        },
      );
    }

    if (oldMatch.player1 !== newMatch.player1) {
      await Player.findOneAndUpdate(
        { gamertag: oldMatch.player1 },
        { $pull: { matchList: newMatch.matchId } },
      );
      await Player.findOneAndUpdate(
        { gamertag: newMatch.player1 },
        { $push: { matchList: newMatch.matchId } },
      );
    }

    if (oldMatch.player2 !== newMatch.player2) {
      await Player.findOneAndUpdate(
        { gamertag: oldMatch.player2 },
        { $pull: { matchList: newMatch.matchId } },
      );
      await Player.findOneAndUpdate(
        { gamertag: newMatch.player2 },
        { $push: { matchList: newMatch.matchId } },
      );
    }

    res.json(newMatch);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update match", error: err.message });
  }
});

// ─── DELETE a match ───────────────────────────────────────────────────────────
router.delete("/:matchId", async (req, res) => {
  try {
    const match = await Match.findOne({ matchId: req.params.matchId });
    if (!match) return res.status(404).json({ message: "Match not found" });

    await Match.findOneAndDelete({ matchId: req.params.matchId });

    // In DELETE /:matchId
    // After finding the match, before deleting:
    if (match.player1 !== "Random" && match.player2 !== "Random") {
      const p1Doc = await Player.findOne({ gamertag: match.player1 });
      const p2Doc = await Player.findOne({ gamertag: match.player2 });
      if (p1Doc) {
        const entry = p1Doc.eloHistory.find((e) => e.matchId === match.matchId);
        if (entry) {
          p1Doc.elo = (p1Doc.elo ?? 1500) - entry.change;
          p1Doc.eloHistory = p1Doc.eloHistory.filter(
            (e) => e.matchId !== match.matchId,
          );
          await p1Doc.save();
        }
      }
      if (p2Doc) {
        const entry = p2Doc.eloHistory.find((e) => e.matchId === match.matchId);
        if (entry) {
          p2Doc.elo = (p2Doc.elo ?? 1500) - entry.change;
          p2Doc.eloHistory = p2Doc.eloHistory.filter(
            (e) => e.matchId !== match.matchId,
          );
          await p2Doc.save();
        }
      }
    }

    await Player.findOneAndUpdate(
      { gamertag: match.player1 },
      {
        $pull: { matchList: match.matchId },
        $inc: {
          wins: match.matchWinner === "Player1" ? -1 : 0,
          losses: match.matchWinner === "Player2" ? -1 : 0,
        },
      },
    );

    await Player.findOneAndUpdate(
      { gamertag: match.player2 },
      {
        $pull: { matchList: match.matchId },
        $inc: {
          wins: match.matchWinner === "Player2" ? -1 : 0,
          losses: match.matchWinner === "Player1" ? -1 : 0,
        },
      },
    );

    res.json({ message: `Match ${req.params.matchId} deleted` });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete match", error: err.message });
  }
});

module.exports = router;
