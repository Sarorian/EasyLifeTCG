const express = require("express");
const router = express.Router();
const Legend = require("../models/Legend");

router.get("/", async (req, res) => {
  try {
    const legends = await Legend.find().sort({ name: 1 });
    res.json(legends);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch legends", error: err.message });
  }
});

module.exports = router;
