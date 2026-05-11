import { NavLink } from "react-router-dom";
import "./Navbar.css";

const links = [
  { to: "/", label: "Home" },
  { to: "/match-report", label: "Match Report" },
  { to: "/match-history", label: "Match History" },
  { to: "/players", label: "Players" },
  { to: "/admin", label: "Admin" },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-glow" />
      <div className="navbar-inner">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `navbar-link ${isActive ? "navbar-link-active" : ""}`
            }
            end={to === "/"}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
