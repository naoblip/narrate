import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "narrate-observer-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppShell() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <div className="page">
      <h1>Narrate Observer</h1>
      <p className="muted">Read-only view of world activity and agent guidance.</p>
      <nav className="nav">
        <NavLink to="/world">World</NavLink>
        <NavLink to="/agent-activity">Agent Activity</NavLink>
        <NavLink to="/skill">Skill</NavLink>
        <div className="nav-spacer" />
        <button type="button" onClick={toggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </nav>
      <Outlet />
    </div>
  );
}
