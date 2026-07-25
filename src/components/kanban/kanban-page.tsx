"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/components/shared/format-date";
import { generateId } from "@/components/shared/generate-id";
import {
  Layers, Plus, Inbox, Loader, CheckCircle, Clock, MessageCircle,
  Paperclip, Send, ChevronUp,
} from "lucide-react";

interface KanbanRequest {
  id: string;
  user_id: string;
  title: string;
  details: string | null;
  priority: "high" | "medium" | "low";
  status: "new" | "in_progress" | "done";
  files: string[];
  comments: Comment[];
  created_at: string;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  created_at: number;
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "חסם מכירות", medium: "חשוב", low: "נחמד שיהיה",
};
const STATUS_LABELS: Record<string, string> = {
  new: "חדש", in_progress: "בביצוע", done: "הושלם",
};
const COLUMNS = [
  { key: "new", label: "חדש", icon: Inbox, color: "bg-gray-100", dotColor: "bg-gray-500" },
  { key: "in_progress", label: "בביצוע", icon: Loader, color: "bg-blue-50", dotColor: "bg-blue-500" },
  { key: "done", label: "הושלם", icon: CheckCircle, color: "bg-green-50", dotColor: "bg-green-500" },
] as const;

export function KanbanPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<KanbanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState("medium");
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    if (!user) return;
    loadRequests();
  }, [user]);

  async function loadRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (error) toast("שגיאה בטעינה", "error");
    setRequests((data || []) as KanbanRequest[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !user) return;
    setSubmitting(true);

    const uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("attachments").upload(path, file);
        if (!error) {
          const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
          uploadedUrls.push(urlData.publicUrl);
        } else {
          uploadedUrls.push(file.name);
        }
      }
    }

    const newReq: KanbanRequest = {
      id: generateId(), user_id: user.id, title, details,
      priority: priority as "high" | "medium" | "low",
      status: "new", files: uploadedUrls, comments: [],
      created_at: new Date().toISOString(),
    };

    setRequests((prev) => [newReq, ...prev]);
    setTitle(""); setDetails(""); setPriority("medium"); setFiles(null); setFormOpen(false);
    setSubmitting(false);

    const { error } = await supabase.from("requests").insert({
      id: newReq.id, user_id: user.id, title, details,
      priority, status: "new", files: JSON.stringify(uploadedUrls),
      comments: JSON.stringify([]),
    });
    if (error) {
      setRequests((prev) => prev.filter((r) => r.id !== newReq.id));
      toast("שגיאה בשמירה", "error");
    } else {
      toast("הבקשה נשלחה", "success");
    }
  }

  async function changeStatus(id: string, newStatus: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus as KanbanRequest["status"] } : r));
    const { error } = await supabase.from("requests").update({ status: newStatus }).eq("id", id);
    if (error) toast("שגיאה בעדכון", "error");
  }

  async function changePriority(id: string, newPriority: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, priority: newPriority as KanbanRequest["priority"] } : r));
    const { error } = await supabase.from("requests").update({ priority: newPriority }).eq("id", id);
    if (error) toast("שגיאה בעדכון", "error");
  }

  async function addComment() {
    if (!viewId || !chatInput.trim() || !user) return;
    const comment: Comment = {
      id: generateId(),
      author: user.email || "משתמש",
      text: chatInput,
      created_at: Date.now(),
    };
    const req = requests.find((r) => r.id === viewId);
    if (!req) return;
    const newComments = [...(req.comments || []), comment];
    setRequests((prev) => prev.map((r) => r.id === viewId ? { ...r, comments: newComments } : r));
    setChatInput("");
    await supabase.from("requests").update({ comments: JSON.stringify(newComments) }).eq("id", viewId);
  }

  async function deleteRequest(id: string) {
    if (!confirm("האם למחוק בקשה זו?")) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setViewId(null);
    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (error) { toast("שגיאה במחיקה", "error"); loadRequests(); }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
  }

  function onDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) changeStatus(id, status);
  }

  const viewing = requests.find((r) => r.id === viewId);

  const grouped = COLUMNS.reduce<Record<string, KanbanRequest[]>>((acc, col) => {
    acc[col.key] = requests.filter((r) => r.status === col.key);
    const w = { high: 3, medium: 2, low: 1 };
    acc[col.key].sort((a, b) => (w[b.priority] || 0) - (w[a.priority] || 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Layers size={24} className="text-blue-600" /> מעקב בקשות לקוח
        </h1>
        <Button onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? <ChevronUp size={14} /> : <Plus size={14} />} בקשה חדשה
        </Button>
      </div>

      {formOpen && (
        <Card className="p-4 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="כותרת הבקשה *" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="לדוגמה: הוספת כפתור ייצוא לאקסל" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">פירוט הבקשה</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="תאר כאן את הבקשה במלואה..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="עדיפות" value={priority} onChange={(e) => setPriority(e.target.value)} options={[
                { value: "high", label: "חסם מכירות" },
                { value: "medium", label: "חשוב" },
                { value: "low", label: "נחמד שיהיה" },
              ]} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">קבצים מצורפים</label>
                <input type="file" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={submitting}><Send size={14} /> שלח בקשה</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.key}
              className={`${col.color} rounded-xl p-4 flex flex-col border min-h-0`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col.key)}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <Icon size={16} />
                  {col.label}
                  <Badge variant="gray">{grouped[col.key].length}</Badge>
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {grouped[col.key].length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                    אין בקשות
                  </div>
                ) : (
                  grouped[col.key].map((req) => (
                    <div
                      key={req.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, req.id)}
                      onClick={() => setViewId(req.id)}
                      className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <h4 className="font-semibold text-sm mb-2">{req.title}</h4>
                      {req.details && (
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2 whitespace-pre-wrap">{req.details}</p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-auto">
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(req.created_at.split("T")[0])}
                        </div>
                        {(req.comments?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                            <MessageCircle size={10} />
                            {req.comments.length}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t flex gap-2">
                        <select
                          className="flex-1 text-xs border rounded px-2 py-1.5 outline-none"
                          value={req.priority}
                          onChange={(e) => { e.stopPropagation(); changePriority(req.id, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="high">חסם מכירות</option>
                          <option value="medium">חשוב</option>
                          <option value="low">נחמד שיהיה</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Ticket Modal */}
      <Modal
        open={!!viewId}
        onClose={() => setViewId(null)}
        title={viewing?.title || ""}
        size="lg"
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{STATUS_LABELS[viewing.status]}</Badge>
              <Badge variant={viewing.priority === "high" ? "red" : viewing.priority === "medium" ? "yellow" : "blue"}>
                {PRIORITY_LABELS[viewing.priority]}
              </Badge>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} /> {formatDate(viewing.created_at.split("T")[0])}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border text-sm whitespace-pre-wrap min-h-[80px]">
              {viewing.details || "אין פירוט לבקשה זו."}
            </div>

            {(viewing.files?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Paperclip size={14} /> קבצים:</h4>
                <div className="flex flex-wrap gap-2">
                  {viewing.files.map((f, i) => (
                    <a key={i} href={f.startsWith("http") ? f : "#"} target="_blank" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">
                      {f.startsWith("http") ? decodeURIComponent(f.split("/").pop()?.split("?")[0] || "קובץ") : f}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">שיחה</h4>
              <div className="flex flex-col gap-2 mb-3 max-h-60 overflow-y-auto">
                {(viewing.comments?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">אין הודעות עדיין</p>
                ) : (
                  viewing.comments.map((c) => (
                    <div key={c.id} className="bg-blue-50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span className="font-medium text-slate-700">{c.author}</span>
                        <span>{new Date(c.created_at).toLocaleDateString("he-IL")}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addComment(); }} className="flex gap-2">
                <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="הקלד הודעה..." />
                <Button type="submit" size="sm"><Send size={14} /></Button>
              </form>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex gap-2">
                <select
                  className="text-xs border rounded px-2 py-1.5"
                  value={viewing.status}
                  onChange={(e) => changeStatus(viewing.id, e.target.value)}
                >
                  <option value="new">חדש</option>
                  <option value="in_progress">בביצוע</option>
                  <option value="done">הושלם</option>
                </select>
              </div>
              <Button variant="danger" size="sm" onClick={() => deleteRequest(viewing.id)}>מחק</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
