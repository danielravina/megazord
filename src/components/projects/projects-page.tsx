"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/components/shared/format-date";
import { generateId } from "@/components/shared/generate-id";
import {
  FolderKanban, Plus, MapPin, Receipt, Clock,
  Trash2, Edit, Save,
} from "lucide-react";
import type { Project, ProjectFormData } from "./project-types";

const emptyForm: ProjectFormData = {
  customer_name: "", location: "", quote_price: null, expenses: null,
  color: "#3b82f6", start_date: new Date().toISOString().split("T")[0],
  start_time: "", duration: "", closing_price: null, search_words: "",
};

export function ProjectsPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectFormData>({ ...emptyForm });

  useEffect(() => {
    if (!user) return;
    loadProjects();
  }, [user]);

  async function loadProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user!.id)
      .order("start_date", { ascending: false });
    if (error) { toast("שגיאה בטעינת פרויקטים", "error"); }
    setProjects(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm, start_date: new Date().toISOString().split("T")[0] });
    setModalOpen(true);
  }

  function openEdit(id: string) {
    const p = projects.find((pr) => pr.id === id);
    if (!p) return;
    setEditingId(id);
    setForm({
      customer_name: p.customer_name,
      location: p.location || "",
      quote_price: p.quote_price,
      expenses: p.expenses,
      color: p.color,
      start_date: p.start_date || "",
      start_time: p.start_time || "",
      duration: p.duration || "",
      closing_price: p.closing_price,
      search_words: p.search_words || "",
    });
    setModalOpen(true);
  }

  function openView(id: string) {
    setViewingId(id);
    setViewModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const projectData = {
      user_id: user.id,
      customer_name: form.customer_name,
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

    if (editingId) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingId ? { ...p, ...projectData, id: editingId } as Project : p,
        ),
      );
      const { error } = await supabase.from("projects").update(projectData).eq("id", editingId);
      if (error) { toast("שגיאה בעדכון", "error"); await loadProjects(); }
      else { toast("הפרויקט עודכן", "success"); }
    } else {
      const newId = generateId();
      const newProject: Project = {
        id: newId, ...projectData, created_at: new Date().toISOString(),
      } as Project;
      setProjects((prev) => [newProject, ...prev]);
      const { error } = await supabase.from("projects").insert({ id: newId, ...projectData });
      if (error) {
        setProjects((prev) => prev.filter((p) => p.id !== newId));
        toast("שגיאה בשמירה", "error");
      } else {
        toast("הפרויקט נוצר", "success");
        // Cross-app: sync to calendar events
        if (form.start_date) {
          const days = Math.max(1, parseInt((form.duration || "1").replace(/[^0-9]/g, "")) || 1);
          const [y, m, d] = form.start_date.split("-").map(Number);
          const events = [];
          const current = new Date(y, m - 1, d);
          for (let i = 0; i < days; i++) {
            const dateStr = current.toISOString().split("T")[0];
            events.push({
              id: generateId(),
              user_id: user.id,
              title: `${form.customer_name}${form.location ? " - " + form.location : ""}`,
              date: dateStr,
              color: form.color,
              is_project: true,
            });
            current.setDate(current.getDate() + 1);
          }
          await supabase.from("events").insert(events);
        }
        // Cross-app: sync to finance incomes
        if (form.closing_price && form.start_date) {
          await supabase.from("incomes").insert({
            id: generateId(),
            user_id: user.id,
            date: form.start_date,
            type: "עתידי",
            amount: form.closing_price,
            description: `הכנסה מפרויקט: ${form.customer_name}`,
          });
        }
      }
    }

    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    if (!confirm(`האם למחוק את הפרויקט "${project.customer_name}"?`)) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setViewModalOpen(false);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast("שגיאה במחיקה", "error"); loadProjects(); }
    else { toast("הפרויקט נמחק", "success"); }
  }

  const viewingProject = projects.find((p) => p.id === viewingId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <FolderKanban size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800">ניהול פרויקטים</h1>
          <Badge variant="blue">{projects.length}</Badge>
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => openView(project.id)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-1.5 h-full" style={{ backgroundColor: project.color }} />
              <div className="mr-2">
                <h3 className="font-bold text-lg text-slate-800 truncate">{project.customer_name}</h3>
                <div className="space-y-1 mt-2 text-sm text-slate-600">
                  {project.location && (
                    <p className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {project.location}</p>
                  )}
                  {project.quote_price && (
                    <p className="flex items-center gap-1"><Receipt size={14} className="text-slate-400" /> מחיר הצעה: ₪{project.quote_price.toLocaleString()}</p>
                  )}
                  {project.duration && (
                    <p className="flex items-center gap-1"><Clock size={14} className="text-slate-400" /> משך: {project.duration}</p>
                  )}
                </div>
                {project.start_date && (
                  <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">{formatDate(project.start_date)}</p>
                )}
                {project.search_words && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.search_words.split(",").map((tag) => tag.trim() && (
                      <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "עריכת פרויקט" : "הוספת פרויקט חדש"}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ביטול</Button>
            <Button loading={saving} onClick={handleSubmit}><Save size={14} /> שמור פרויקט</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="שם לקוח *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          <Input label="מיקום" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="מחיר הצעה (₪)" type="number" min="0" value={form.quote_price ?? ""} onChange={(e) => setForm({ ...form, quote_price: parseFloat(e.target.value) || null })} />
            <Input label="הוצאות צפויות (₪)" type="number" min="0" value={form.expenses ?? ""} onChange={(e) => setForm({ ...form, expenses: parseFloat(e.target.value) || null })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">צבע זיהוי</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-16 h-10 border rounded-md cursor-pointer" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="תאריך התחלה" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <Input label="שעת התחלה" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="משך עבודה" placeholder='לדוג: "יומיים"' value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            <Input label="מחיר סגירה (₪)" type="number" min="0" value={form.closing_price ?? ""} onChange={(e) => setForm({ ...form, closing_price: parseFloat(e.target.value) || null })} />
          </div>
          <Input label="מילות חיפוש / תגיות" placeholder="פסיק בין מילה למילה" value={form.search_words} onChange={(e) => setForm({ ...form, search_words: e.target.value })} />
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={viewingProject?.customer_name || "פרטי פרויקט"}
        size="lg"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="danger" onClick={() => viewingId && handleDelete(viewingId)}><Trash2 size={14} /> מחק</Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setViewModalOpen(false)}>סגור</Button>
              <Button onClick={() => { setViewModalOpen(false); if (viewingId) openEdit(viewingId); }}><Edit size={14} /> ערוך</Button>
            </div>
          </div>
        }
      >
        {viewingProject && (
          <div className="space-y-4 text-sm">
            {viewingProject.location && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">מיקום</p>
                <p>{viewingProject.location}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">תאריך התחלה</p>
                <p>{formatDate(viewingProject.start_date || "")} {viewingProject.start_time || ""}</p>
              </div>
              {viewingProject.duration && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">משך</p>
                  <p>{viewingProject.duration}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {viewingProject.quote_price != null && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">מחיר הצעה</p>
                  <p>₪{viewingProject.quote_price?.toLocaleString()}</p>
                </div>
              )}
              {viewingProject.closing_price != null && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">מחיר סגירה</p>
                  <p>₪{viewingProject.closing_price?.toLocaleString()}</p>
                </div>
              )}
            </div>
            {viewingProject.expenses != null && viewingProject.expenses > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">הוצאות צפויות</p>
                <p>₪{viewingProject.expenses?.toLocaleString()}</p>
              </div>
            )}
            {viewingProject.search_words && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">תגיות</p>
                <div className="flex flex-wrap gap-1">
                  {viewingProject.search_words.split(",").map((tag) => tag.trim() && (
                    <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">{tag.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}


