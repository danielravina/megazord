import { AuthGuard } from "@/components/layout/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="mr-64 flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </ToastProvider>
    </AuthGuard>
  );
}
