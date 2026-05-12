const express = require("express");
const router = express.Router();
const Battlefield = require("../models/Battlefield");

router.get("/", async (req, res) => {
  try {
    const battlefields = await Battlefield.find().sort({ name: 1 });
    res.json(battlefields);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch battlefields", error: err.message });
  }
});

module.exports = router;
