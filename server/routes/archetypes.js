const express = require("express");
const router = express.Router();
const Archetype = require("../models/Archetype");

// ─── GET all archetypes ───────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const archetypes = await Archetype.find().sort({ name: 1 });
    res.json(archetypes);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch archetypes", error: err.message });
  }
});

// ─── POST a new archetype ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const archetype = new Archetype(req.body);
    await archetype.save();
    res.status(201).json(archetype);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "That archetype already exists." });
    }
    res
      .status(400)
      .json({ message: "Failed to create archetype", error: err.message });
  }
});

// ─── PUT edit an archetype ────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const archetype = await Archetype.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!archetype)
      return res.status(404).json({ message: "Archetype not found" });
    res.json(archetype);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update archetype", error: err.message });
  }
});

// ─── DELETE an archetype ──────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const archetype = await Archetype.findByIdAndDelete(req.params.id);
    if (!archetype)
      return res.status(404).json({ message: "Archetype not found" });
    res.json({ message: `Archetype "${archetype.name}" deleted` });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete archetype", error: err.message });
  }
});

module.exports = router;
