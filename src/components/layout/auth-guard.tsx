"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

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
      <div className="max-w-7xl mx-auto p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="w-40 h-8" />
          <div className="flex gap-2">
            <Skeleton className="w-24 h-9 rounded-lg" />
            <Skeleton className="w-28 h-9 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-36">
              <SkeletonText className="w-24 mb-3" />
              <Skeleton className="w-full h-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
