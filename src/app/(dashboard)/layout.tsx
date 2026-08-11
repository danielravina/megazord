import { AuthGuard } from "@/components/layout/auth-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ToastProvider>
        <DashboardShell>{children}</DashboardShell>
      </ToastProvider>
    </AuthGuard>
  );
}
