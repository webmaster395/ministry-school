"use client";

import { useEffect } from "react";

/** Recharge une ancienne interface ouverte lorsqu'un nouveau déploiement devient actif. */
export default function DeploymentUpdateGuard({ currentCommit }: { currentCommit: string }) {
  useEffect(() => {
    if (!currentCommit || currentCommit === "local") return;
    let checking = false;

    const checkDeployment = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch("/api/deployment-version", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok) return;
        const data = await response.json() as { commit?: string };
        const remoteCommit = data.commit;
        if (!remoteCommit || remoteCommit === currentCommit) return;
        const reloadKey = `ministry-school-reloaded-${remoteCommit}`;
        if (window.sessionStorage.getItem(reloadKey)) return;
        window.sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
      } catch {
        // Une coupure réseau ne doit jamais gêner l'utilisation de la plateforme.
      } finally {
        checking = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkDeployment();
    };
    void checkDeployment();
    window.addEventListener("focus", checkDeployment);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(checkDeployment, 120_000);
    return () => {
      window.removeEventListener("focus", checkDeployment);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [currentCommit]);

  return null;
}
