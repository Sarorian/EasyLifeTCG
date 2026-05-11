import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import MatchReport from "./pages/MatchReport";
import MatchHistory from "./pages/MatchHistory";
import Players from "./pages/Players";
import PlayerProfile from "./pages/PlayerProfile";
import Admin from "./pages/Admin";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/match-report" element={<MatchReport />} />
          <Route path="/match-history" element={<MatchHistory />} />
          <Route path="/players" element={<Players />} />
          <Route path="/players/:gamertag" element={<PlayerProfile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}
