"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCircle, SkeletonButton, SkeletonText } from "@/components/ui/skeleton";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import type { ChartOptions } from "chart.js";
import { formatCurrency } from "@/components/shared/format-currency";
import { formatDate } from "@/components/shared/format-date";
import { Building, Pencil, Trash2, ArrowRight, Plus, Wallet, Calendar, Layers, Receipt } from "lucide-react";
import type { Supplier } from "./supplier-types";
import { supplierExpenses, sumExpenses } from "./supplier-expenses";
import { SupplierFormModal } from "./supplier-form-modal";
import { DOC_TYPE_META } from "@/components/documents/invoice-types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONTHS_HE = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יונ׳", "יול׳", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];
const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(Object.entries(DOC_TYPE_META).map(([k, v]) => [k, v.label]));

interface DocRow {
  id: string;
  title: string;
  doc_type: string;
  direction: string;
  total_amount: number | null;
  date_on_doc: string | null;
  date: string;
  business_id?: string | null;
}

export function SupplierProfilePage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supplierId = searchParams.get("supplier");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user || !supplierId) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [supRes, docRes] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", supplierId).eq("user_id", uid).maybeSingle(),
        supabase.from("documents")
          .select("*")
          .eq("user_id", uid)
          .eq("business_id", supplierId)
          .order("date_on_doc", { ascending: false, nullsFirst: false })
          .order("date", { ascending: false }),
      ]);
      if (cancelled) return;
      if (supRes.error || !supRes.data) {
        setSupplier(null);
        setLoading(false);
        return;
      }
      if (docRes.error) toast("שגיאה בטעינת מסמכים", "error");
      setSupplier(supRes.data as Supplier);
      setDocuments((docRes.data || []) as DocRow[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, supabase, supplierId]);

  async function reloadSupplier() {
    if (!user || !supplierId) return;
    const { data } = await supabase.from("businesses").select("*").eq("id", supplierId).eq("user_id", user.id).maybeSingle();
    if (data) setSupplier(data as Supplier);
    const { data: docs } = await supabase.from("documents")
      .select("*")
      .eq("user_id", user.id)
      .eq("business_id", supplierId)
      .order("date_on_doc", { ascending: false, nullsFirst: false })
      .order("date", { ascending: false });
    setDocuments((docs || []) as DocRow[]);
  }

  async function handleDelete() {
    if (!supplier || !user) return;
    if (!confirm(`האם למחוק את הספק "${supplier.name}"?`)) return;

    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("business_id", supplier.id);

    if ((count || 0) > 0) {
      toast("לא ניתן למחוק ספק המשויך למסמכים", "error");
      return;
    }

    const { error } = await supabase.from("businesses").delete().eq("id", supplier.id);
    if (error) {
      toast("שגיאה במחיקה", "error");
    } else {
      toast("הספק נמחק", "success");
      router.push("/suppliers/");
    }
  }

  if (loading || !supplier) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Skeleton className="w-24 h-9" />
          <div className="flex items-center gap-3">
            <SkeletonCircle />
            <Skeleton className="w-40 h-8" />
          </div>
          <SkeletonButton className="w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="w-full h-64 rounded-xl mt-6" />
        <Skeleton className="w-full h-64 rounded-xl mt-6" />
      </div>
    );
  }

  const expenses = supplierExpenses(documents, supplier.id);
  const now = new Date();
  const thisYear = now.getFullYear();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const allTime = sumExpenses(expenses);
  const yearTotal = sumExpenses(expenses, thisYear);
  const lastMonthTotal = sumExpenses(expenses, prevYear, prevMonth);

  const monthTotals = Array.from({ length: 12 }).map((_, m) => sumExpenses(expenses, thisYear, m));
  const chartData = {
    labels: MONTHS_HE,
    datasets: [{
      label: "הוצאות",
      data: monthTotals,
      backgroundColor: "rgba(59,130,246,0.7)",
      borderRadius: 4,
      borderWidth: 0,
    }],
  };
  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: string | number) => {
            const v = Number(value);
            if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
            return v;
          },
        },
      },
    },
  };

  const KPIS = [
    { label: "סה״כ הוצאות השנה", value: yearTotal, icon: Calendar, color: "text-blue-600" },
    { label: "הוצאות החודש שעבר", value: lastMonthTotal, icon: Layers, color: "text-violet-600" },
    { label: "סה״כ הוצאות בכל התקופה", value: allTime, icon: Wallet, color: "text-emerald-600" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/suppliers/")} className="text-slate-400 hover:text-blue-600" title="חזרה לרשימת ספקים">
            <ArrowRight size={20} />
          </button>
          <div className="flex flex-wrap justify-between gap-2">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building size={24} className="text-blue-500" />
              {supplier.name}
            </h1>
          </div>
          <Badge variant="blue">ספק</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil size={14} /> ערוך ספק</Button>
          <button onClick={handleDelete} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors">
            <Trash2 size={14} /> מחק ספק
          </button>
        </div>
      </div>

      {/* Contact details */}
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">מספר עוסק מורשה</div>
            <p className="text-sm font-medium">{supplier.vat_number || "-"}</p>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">טלפון</div>
            <p className="text-sm font-medium">{supplier.phone || "-"}</p>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">אימייל</div>
            <p className="text-sm font-medium">{supplier.email || "-"}</p>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">כתובת</div>
            <p className="text-sm font-medium">{supplier.address || "-"}</p>
          </div>
        </div>
        {supplier.notes && (
          <p className="text-xs text-slate-400 mt-3">הערות: {supplier.notes}</p>
        )}
      </Card>

      {/* Financial dashboard */}
      <h2 className="text-lg font-bold text-slate-800 mb-3">מעקב פיננסי</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-500">{k.label}</span>
                <Icon size={20} className={k.color} />
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(k.value)}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-500 mb-3">הוצאות חודשיות ({thisYear})</h3>
        <div className="flex-1 min-h-0" style={{ minHeight: 220 }}>
          {monthTotals.every((v) => v === 0) ? (
            <p className="text-sm text-slate-400">אין הוצאות בתוך השנה הנוכחית להצגה</p>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </Card>

      {/* Document history */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-bold text-slate-800">מסמכים וסריקות של הספק</h2>
        <Button onClick={() => router.push(`/scans/?supplier=${supplier.id}`)}><Plus size={14} /> הוסף מסמך</Button>
      </div>

      {documents.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<Receipt size={40} className="text-blue-300" />}
            title="אין מסמכים של הספק עדיין"
            description="סרוק מסמך כדי להוסיף מסמך חדש לספק זה"
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["כותרת", "סוג", "תאריך", "סכום"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((d) => (
                  <tr key={d.id} onClick={() => router.push(`/scans/?supplier=${supplier.id}&document=${d.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{DOC_TYPE_LABEL[d.doc_type] || d.doc_type}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(d.date_on_doc || d.date.split("T")[0])}</td>
                    <td className="px-4 py-3 text-sm font-medium">{d.total_amount != null ? formatCurrency(d.total_amount) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <SupplierFormModal
        open={editOpen}
        supplier={supplier}
        onClose={() => setEditOpen(false)}
        onSaved={reloadSupplier}
      />
    </div>
  );
}