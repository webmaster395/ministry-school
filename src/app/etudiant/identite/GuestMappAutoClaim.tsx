"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function GuestMappAutoClaim() {
  const attempted = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void fetch("/api/mapp/guest/claim", { method: "POST" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => null) as { claimed?: boolean } | null }))
      .then(({ response, payload }) => {
        if (response.ok && payload?.claimed) router.refresh();
      });
  }, [router]);

  return null;
}
