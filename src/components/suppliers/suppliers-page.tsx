"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonButton, SkeletonText } from "@/components/ui/skeleton";
import { formatCurrency } from "@/components/shared/format-currency";
import { Building, Plus } from "lucide-react";
import type { Supplier } from "./supplier-types";
import { supplierExpenses, sumExpenses } from "./supplier-expenses";
import type { ScanEvidence } from "@/components/finance/ledger";
import { SupplierFormModal } from "./supplier-form-modal";

export function SuppliersPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [documents, setDocuments] = useState<ScanEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [supRes, docRes] = await Promise.all([
        supabase.from("businesses").select("*").eq("user_id", uid).order("name", { ascending: true }),
        supabase.from("documents").select("*").eq("user_id", uid),
      ]);
      if (cancelled) return;
      if (supRes.error) toast("שגיאה בטעינת ספקים", "error");
      if (docRes.error) toast("שגיאה בטעינת מסמכים", "error");
      setSuppliers((supRes.data || []) as Supplier[]);
      setDocuments((docRes.data || []) as ScanEvidence[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, supabase]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setModalOpen(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, [searchParams]);

  async function loadSuppliers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user!.id)
      .order("name", { ascending: true });
    if (error) { toast("שגיאה בטעינת ספקים", "error"); }
    setSuppliers(data || []);
    setLoading(false);
  }

  const thisYear = new Date().getFullYear();
  const byId = (id: string) => sumExpenses(supplierExpenses(documents, id), thisYear);

  if (loading && suppliers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-40 h-8" />
            <Skeleton className="w-8 h-5 rounded-full" />
          </div>
          <SkeletonButton className="w-32" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 grid grid-cols-5 gap-4 px-4 py-3 border-b">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonText key={i} className="w-full" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4 border-b border-slate-100">
              <SkeletonText className="w-24" />
              <SkeletonText className="w-20" />
              <SkeletonText className="w-28" />
              <SkeletonText className="w-24" />
              <SkeletonText className="w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading && suppliers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-40 h-8" />
            <Skeleton className="w-8 h-5 rounded-full" />
          </div>
          <SkeletonButton className="w-32" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 grid grid-cols-6 gap-4 px-4 py-3 border-b">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonText key={i} className="w-full" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-slate-100">
              <SkeletonText className="w-24" />
              <SkeletonText className="w-20" />
              <SkeletonText className="w-28" />
              <SkeletonText className="w-16" />
              <SkeletonText className="w-20" />
              <div className="flex justify-end gap-3">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Building size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800">ניהול ספקים</h1>
          <Badge variant="blue">{suppliers.length}</Badge>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={14} /> ספק חדש</Button>
      </div>

      {suppliers.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<Building size={40} className="text-slate-300" />}
            title="אין ספקים עדיין"
            description='ספקים מזוהים אוטומטית מסריקת מסמכים, או לחץ על "ספק חדש" כדי להוסיף ידנית'
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["שם", "ע.מ", "טלפון", "אימייל", "סה״כ הוצאות השנה"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/suppliers/detail/?supplier=${s.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.vat_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.phone || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.email || "-"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{formatCurrency(byId(s.id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <SupplierFormModal
        open={modalOpen}
        supplier={null}
        onClose={() => setModalOpen(false)}
        onSaved={loadSuppliers}
      />
    </div>
  );
}
