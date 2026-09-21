import { useEffect, useState } from "react";

export const WORKSPACES = ["playground", "benchmark", "batch"] as const;
export type Workspace = (typeof WORKSPACES)[number];

function workspaceFromHash(hash: string): Workspace {
  const value = hash.replace(/^#\/?/u, "").split(/[/?#]/u, 1)[0]?.toLowerCase();
  return WORKSPACES.includes(value as Workspace) ? (value as Workspace) : "playground";
}

function workspaceUrl(workspace: Workspace) {
  return `${window.location.pathname}${window.location.search}#/${workspace}`;
}

export function useHashWorkspace(): [Workspace, (workspace: Workspace) => void] {
  const [workspace, setWorkspace] = useState<Workspace>(() =>
    typeof window === "undefined" ? "playground" : workspaceFromHash(window.location.hash),
  );

  useEffect(() => {
    const syncFromHash = () => setWorkspace(workspaceFromHash(window.location.hash));
    const initial = workspaceFromHash(window.location.hash);
    if (window.location.hash !== `#/${initial}`) {
      window.history.replaceState(window.history.state, "", workspaceUrl(initial));
    }

    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function navigate(next: Workspace) {
    setWorkspace(next);
    if (window.location.hash !== `#/${next}`) {
      window.location.hash = `/${next}`;
    }
  }

  return [workspace, navigate];
}
