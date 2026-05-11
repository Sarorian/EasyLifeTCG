const express = require("express");
const router = express.Router();
const Player = require("../models/Player");
const Match = require("../models/Match");

// ─── GET all players ───────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const players = await Player.find().sort({ playerId: 1 });
    res.json(players);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch players", error: err.message });
  }
});

// ─── GET a single player by gamertag ──────────────────────────────────────────
router.get("/:gamertag", async (req, res) => {
  try {
    const player = await Player.findOne({ gamertag: req.params.gamertag });
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json(player);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch player", error: err.message });
  }
});

// ─── GET a player's full match history (populated) ────────────────────────────
router.get("/:gamertag/matches", async (req, res) => {
  try {
    const player = await Player.findOne({ gamertag: req.params.gamertag });
    if (!player) return res.status(404).json({ message: "Player not found" });

    const matches = await Match.find({
      matchId: { $in: player.matchList },
    }).sort({ matchId: -1 });

    res.json(matches);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch player matches", error: err.message });
  }
});

// ─── GET next available playerId ──────────────────────────────────────────────
router.get("/meta/nextId", async (req, res) => {
  try {
    const latest = await Player.findOne().sort({ playerId: -1 });
    const nextId = latest ? latest.playerId + 1 : 1;
    res.json({ nextId });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to get next player ID", error: err.message });
  }
});

// ─── POST a new player ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create player", error: err.message });
  }
});

// ─── PUT full edit of a player ────────────────────────────────────────────────
router.put("/:gamertag", async (req, res) => {
  try {
    const player = await Player.findOneAndUpdate(
      { gamertag: req.params.gamertag },
      req.body,
      { new: true, runValidators: true, overwrite: true },
    );
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json(player);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update player", error: err.message });
  }
});

// ─── DELETE a player ──────────────────────────────────────────────────────────
router.delete("/:gamertag", async (req, res) => {
  try {
    const player = await Player.findOneAndDelete({
      gamertag: req.params.gamertag,
    });
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json({ message: `Player ${req.params.gamertag} deleted` });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete player", error: err.message });
  }
});

module.exports = router;
