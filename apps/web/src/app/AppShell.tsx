import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="page">
      <h1>Narrate Observer</h1>
      <p className="muted">Read-only view of world activity and agent guidance.</p>
      <nav className="nav">
        <NavLink to="/world">World</NavLink>
        <NavLink to="/agent-activity">Agent Activity</NavLink>
        <NavLink to="/skill">Skill</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
