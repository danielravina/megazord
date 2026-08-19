"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonButton, SkeletonText } from "@/components/ui/skeleton";
import { formatDate } from "@/components/shared/format-date";
import { formatCurrencyShort } from "@/components/shared/format-currency";
import { generateId } from "@/components/shared/generate-id";
import { isValidEmail } from "@/components/shared/validate-email";
import {
  FolderKanban, Plus, MapPin, Save, ChevronLeft, Calendar,
} from "lucide-react";
import type { Project, ProjectFormData, ProjectRow } from "./project-types";
import { normalizeProject } from "./project-types";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl px-2.5 py-2">
      <p className="text-[10px] text-slate-400 mb-0.5 truncate">{label}</p>
      <p className="text-sm font-semibold text-slate-700 truncate" dir="ltr">{value}</p>
    </div>
  );
}

const emptyForm: ProjectFormData = {
  customer_id: "", location: "", quote_price: null, expenses: null,
  color: "#3b82f6", start_date: new Date().toISOString().split("T")[0],
  start_time: "", duration: "", closing_price: null, search_words: "",
};

export function ProjectsPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectFormData>({ ...emptyForm });
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");

  useEffect(() => {
    if (!user) return;
    loadProjects();
    loadCustomers();
  }, [user]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openNew();
    }
  }, [searchParams]);

  async function loadProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*, customers(name)")
      .eq("user_id", user!.id)
      .order("start_date", { ascending: false });
    if (error) { toast("שגיאה בטעינת פרויקטים", "error"); }
    setProjects(((data || []) as ProjectRow[]).map(normalizeProject));
    setLoading(false);
  }

  async function loadCustomers() {
    const { data } = await supabase.from("customers").select("id, name").eq("user_id", user!.id).order("name", { ascending: true });
    setCustomers(data || []);
  }

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name || "";

  function openNew() {
    setForm({ ...emptyForm, start_date: new Date().toISOString().split("T")[0] });
    setNewCustOpen(false);
    setNewCustName("");
    setNewCustEmail("");
    setModalOpen(true);
  }

  async function createQuickCustomer(): Promise<string> {
    if (!user || !newCustName.trim()) return "";
    if (newCustEmail.trim() && !isValidEmail(newCustEmail)) {
      toast("כתובת אימייל לא תקינה", "error");
      return "";
    }
    const id = generateId();
    const { error } = await supabase.from("customers").insert({
      id, user_id: user.id, name: newCustName.trim(), email: newCustEmail.trim() || null,
    });
    if (error) {
      toast("שגיאה ביצירת הלקוח", "error");
      return "";
    }
    setCustomers((prev) => [...prev, { id, name: newCustName.trim() }]);
    setNewCustName("");
    setNewCustEmail("");
    setNewCustOpen(false);
    toast("הלקוח נוצר", "success");
    return id;
  }

  async function handleCustomerChange(value: string) {
    if (value === "new") {
      setNewCustOpen(true);
      setForm((f) => ({ ...f, customer_id: "" }));
      return;
    }
    setForm((f) => ({ ...f, customer_id: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.customer_id) {
      toast("יש לבחור לקוח", "error");
      return;
    }
    setSaving(true);

    const newId = generateId();
    const projectData = {
      user_id: user.id,
      customer_id: form.customer_id || null,
      location: form.location || null,
      quote_price: form.quote_price,
      expenses: form.expenses ?? 0,
      color: form.color,
      start_date: form.start_date || null,
      start_time: form.start_time || null,
      duration: form.duration || null,
      closing_price: form.closing_price,
      search_words: form.search_words || null,
    };

    const custName = customerName(form.customer_id);
    const newProject: Project = { id: newId, ...projectData, customer_name: custName, created_at: new Date().toISOString() } as Project;
    setProjects((prev) => [newProject, ...prev]);

    const { error } = await supabase.from("projects").insert({ id: newId, ...projectData });
    if (error) {
      setProjects((prev) => prev.filter((p) => p.id !== newId));
      toast("שגיאה בשמירה", "error");
    } else {
      toast("הפרויקט נוצר", "success");
      // Sync to calendar events
      if (form.start_date) {
        const days = Math.max(1, parseInt(form.duration || "1") || 1);
        const [y, m, d] = form.start_date.split("-").map(Number);
        const startDate = new Date(y, m - 1, d);
        const endDate = new Date(y, m - 1, d + days - 1);

        const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
        const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

        const { error: eventError } = await supabase.from("events").insert({
          id: generateId(),
          user_id: user.id,
          title: `${custName}${form.location ? " - " + form.location : ""}`,
          date: startStr,
          end_date: days > 1 ? endStr : null,
          color: form.color,
          is_project: true,
          project_id: newId,
        });
        if (eventError) toast("הפרויקט נוצר אך אירוע היומן לא נשמר", "info");
      }
    }

    setSaving(false);
    setModalOpen(false);
  }

  if (loading && projects.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
<div className="flex flex-wrap justify-between items-center gap-2 mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-40 h-8" />
            <Skeleton className="w-8 h-5 rounded-full" />
          </div>
          <SkeletonButton className="w-32" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-900/5 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <SkeletonText className="w-1/2" />
                  <SkeletonText className="w-3/4" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <SkeletonText className="w-1/3" />
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
          <FolderKanban size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800">ניהול פרויקטים</h1>
        </div>
        <Button onClick={openNew}><Plus size={14} /> פרויקט חדש</Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<FolderKanban size={40} className="text-slate-300" />}
            title="אין פרויקטים עדיין"
            description='לחץ על "פרויקט חדש" כדי להתחיל'
          />
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/projects/detail/?project=${project.id}`)}
              className="group relative bg-white rounded-2xl shadow-sm ring-1 ring-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 hover:ring-slate-900/10 transition-all duration-200 cursor-pointer overflow-hidden"
            >
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(to left, ${project.color}, ${project.color}66)` }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                      style={{ backgroundColor: `${project.color}1a`, color: project.color }}
                    >
                      {(project.customer_name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate group-hover:text-slate-900">
                        {project.customer_name || "ללא לקוח"}
                      </h3>
                      {project.location && (
                        <p className="text-sm text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          {project.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronLeft size={18} className="text-slate-300 mt-1 shrink-0 group-hover:text-blue-500 transition-colors" />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <StatTile
                    label="הצעת מחיר"
                    value={project.quote_price ? formatCurrencyShort(project.quote_price) : "—"}
                  />
                  <StatTile
                    label="הוצאות"
                    value={project.expenses ? formatCurrencyShort(project.expenses) : "—"}
                  />
                  <StatTile
                    label="משך"
                    value={project.duration ? `${project.duration} ימים` : "—"}
                  />
                </div>

                {project.search_words && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {project.search_words.split(",").map((tag) => tag.trim() && (
                      <span key={tag} className="text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {project.start_date && (
                  <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                    <Calendar size={12} />
                    {formatDate(project.start_date)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="הוספת פרויקט חדש"
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ביטול</Button>
            <Button loading={saving} onClick={handleSubmit}><Save size={14} /> שמור פרויקט</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Select
              label="לקוח *"
              options={[
                { value: "", label: "בחר לקוח..." },
                ...customers.map((c) => ({ value: c.id, label: c.name })),
                { value: "new", label: "+ הוסף לקוח" },
              ]}
              value={form.customer_id}
              onChange={(e) => handleCustomerChange(e.target.value)}
              required
            />
            {newCustOpen && (
              <div className="mt-2 space-y-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <Input label="שם לקוח *" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                <Input label="אימייל" type="email" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} />
                <Button size="sm" type="button" onClick={async () => { const id = await createQuickCustomer(); if (id) setForm((f) => ({ ...f, customer_id: id })); }}>
                  <Plus size={14} /> צור לקוח
                </Button>
              </div>
            )}
          </div>
          <Input label="מיקום" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="מחיר הצעה (₪)" type="number" min="0" value={form.quote_price ?? ""} onChange={(e) => { const v = e.target.value; setForm({ ...form, quote_price: v === "" ? null : parseFloat(v) }); }} />
            <Input label="הוצאות צפויות (₪)" type="number" min="0" value={form.expenses ?? ""} onChange={(e) => { const v = e.target.value; setForm({ ...form, expenses: v === "" ? null : parseFloat(v) }); }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">צבע זיהוי</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-16 h-10 border rounded-md cursor-pointer" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="תאריך התחלה" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <Input label="שעת התחלה" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="משך עבודה (ימים)" type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            <Input label="מחיר סגירה (₪)" type="number" min="0" value={form.closing_price ?? ""} onChange={(e) => { const v = e.target.value; setForm({ ...form, closing_price: v === "" ? null : parseFloat(v) }); }} />
          </div>
          <Input label="מילות חיפוש / תגיות" placeholder="פסיק בין מילה למילה" value={form.search_words} onChange={(e) => setForm({ ...form, search_words: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
