const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  // Identity
  playerId: { type: Number, required: true, unique: true },
  realName: { type: String, required: true },
  gamertag: { type: String, required: true, unique: true },

  // Record
  wins: { type: Number, default: 0, min: 0 },
  losses: { type: Number, default: 0, min: 0 },

  // Match history — stores matchIds, populate when needed
  matchList: [{ type: Number, ref: "Match" }],

  // Metadata
  createdAt: { type: Date, default: Date.now },
});

// Virtual: win rate calculated on the fly without storing it
playerSchema.virtual("winRate").get(function () {
  const total = this.wins + this.losses;
  if (total === 0) return 0;
  return ((this.wins / total) * 100).toFixed(1);
});

// Ensure virtuals are included when converting to JSON
playerSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Player", playerSchema);
