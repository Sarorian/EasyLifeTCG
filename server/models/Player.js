const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  playerId: { type: Number, required: true, unique: true },
  realName: { type: String, default: "" },
  gamertag: { type: String, required: true, unique: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  matchList: [{ type: Number }],
  elo: { type: Number, default: 1500 },
  eloHistory: [
    {
      matchId: Number,
      elo: Number,
      change: Number,
      opponent: String,
      won: Boolean,
      date: Date,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Metadata

// Virtual: win rate calculated on the fly without storing it
playerSchema.virtual("winRate").get(function () {
  const total = this.wins + this.losses;
  if (total === 0) return 0;
  return ((this.wins / total) * 100).toFixed(1);
});

// Ensure virtuals are included when converting to JSON
playerSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Player", playerSchema);
