import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { WorldPage } from "../features/world/WorldPage";
import { PlacePage } from "../features/place/PlacePage";
import { SkillPage } from "../features/skill/SkillPage";
import { AgentActivityPage } from "../features/agent/AgentActivityPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/world" replace /> },
        { path: "world", element: <WorldPage /> },
        { path: "place/:region/:location/:place", element: <PlacePage /> },
        { path: "agent-activity", element: <AgentActivityPage /> },
        { path: "skill", element: <SkillPage /> },
      ],
    },
  ],
  { basename: "/narrate" }
);
