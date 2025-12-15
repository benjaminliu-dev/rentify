"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getIdToken } from "@/app/lib/id_token";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Only redirect to browse if we actually have an auth token (stored in cookies after login).
    router.replace(getIdToken() ? "/page/browse" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      Redirecting…
    </div>
  );
}
