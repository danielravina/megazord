"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login/");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
