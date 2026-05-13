const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173", "https://sarorian.github.io"],
  }),
);
app.use(express.json());

// Routes
const matchRoutes = require("./routes/matches");
const playerRoutes = require("./routes/players");
const archetypeRoutes = require("./routes/archetypes");
const legendRoutes = require("./routes/legends");
const battlefieldRoutes = require("./routes/battlefields");

app.use("/api/legends", legendRoutes);
app.use("/api/battlefields", battlefieldRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/archetypes", archetypeRoutes);

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected!");
    app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`),
    );
  })
  .catch((err) => console.error(err));
