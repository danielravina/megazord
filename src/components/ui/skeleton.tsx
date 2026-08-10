"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-slate-200/70 ${className}`} />;
}

export function SkeletonText({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-3 rounded ${className}`} />;
}

export function SkeletonCircle({ className = "" }: SkeletonProps) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

export function SkeletonButton({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-9 rounded-lg ${className}`} />;
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <Skeleton className={className} />
    </div>
  );
}
