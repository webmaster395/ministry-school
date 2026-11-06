"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function GuestMappAutoClaim() {
  const attempted = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void fetch("/api/mapp/guest/claim", { method: "POST" }).then((response) => {
      if (response.ok) router.refresh();
    });
  }, [router]);

  return null;
}
