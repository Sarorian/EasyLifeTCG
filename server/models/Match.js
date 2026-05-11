const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  gameNumber: { type: Number, required: true },
  whoWentFirst: { type: String, enum: ["Player1", "Player2"], required: true },
  player1Score: { type: Number, required: true, min: 0, max: 10 },
  player2Score: { type: Number, required: true, min: 0, max: 10 },
  player1Battlefield: { type: String, required: true },
  player2Battlefield: { type: String, required: true },
  turns: { type: Number, required: true, min: 1 },
  gameWinner: { type: String, enum: ["Player1", "Player2"], required: true },
});

const matchSchema = new mongoose.Schema({
  // Identity
  matchId: { type: Number, required: true, unique: true },

  // People
  reporter: { type: String, required: true },
  player1: { type: String, required: true },
  player2: { type: String, required: true }, // "Random" is a valid value

  // Decks
  player1Legend: { type: String, required: true },
  player1Archetype: { type: String, required: true },
  player2Legend: { type: String, required: true },
  player2Archetype: { type: String, required: true },

  // Format
  isBo3: { type: Boolean, required: true },
  gamesPlayed: { type: Number, required: true, min: 1, max: 3 },

  // Games (1–3 subdocuments)
  games: {
    type: [gameSchema],
    required: true,
    validate: {
      validator: function (games) {
        return games.length >= 1 && games.length <= 3;
      },
      message: "A match must have between 1 and 3 games.",
    },
  },

  // Result
  matchWinner: { type: String, required: true },

  // Extras
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Match", matchSchema);
