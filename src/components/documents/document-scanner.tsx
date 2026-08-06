"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown, MenuItem, MenuLabel } from "@/components/ui/dropdown";
import { generateId } from "@/components/shared/generate-id";
import { ScanLine, Camera, Upload } from "lucide-react";

interface Project {
  id: string;
  customer_name: string;
}

interface Business {
  id: string;
  name: string;
  vat_number: string | null;
}

const DOC_TYPES = [
  { value: "Invoice", label: "חשבונית מס" },
  { value: "Delivery Note", label: "תעודת משלוח" },
  { value: "Proforma Invoice", label: "חשבונית פרופורמה" },
  { value: "Other", label: "אחר" },
];

const FOLDERS = [
  { id: "Bank", name: "בנק" },
  { id: "VAT", name: 'מע"מ' },
  { id: "Income Tax", name: "מס הכנסה" },
  { id: "National Insurance", name: "ביטוח לאומי" },
  { id: "Accountant", name: "רואה חשבון" },
  { id: "Suppliers", name: "ספקים" },
  { id: "Employees", name: "עובדים" },
  { id: "Other", name: "אחר" },
];

interface Props {
  onScanned?: () => void;
}

interface TempDoc {
  imageUrl: string;
  previewUrl: string;
  title: string;
  tags: string[];
  extractedText: string;
  docType: string;
  dateOnDoc: string;
  totalAmount: string;
  folder: string;
  isInvestment: boolean;
  direction: string;
  projectId: string;
  newProjectName: string;
  businessId: string;
  businessVat: string;
  newBusinessName: string;
}

const EMPTY_TEMP: TempDoc = {
  imageUrl: "", previewUrl: "", title: "", tags: [], extractedText: "", docType: "Other",
  dateOnDoc: "", totalAmount: "", folder: "", isInvestment: false,
  direction: "expense", projectId: "", newProjectName: "",
  businessId: "", businessVat: "", newBusinessName: "",
};

export function DocumentScanner({ onScanned }: Props) {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tempDoc, setTempDoc] = useState<TempDoc>(EMPTY_TEMP);

  useEffect(() => {
    if (!user) return;
    loadProjects();
    loadBusinesses();
  }, [user]);

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("id, customer_name").eq("user_id", user!.id);
    setProjects(data || []);
  }

  async function loadBusinesses() {
    const { data } = await supabase.from("businesses").select("id, name, vat_number").eq("user_id", user!.id);
    setBusinesses(data || []);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function tryOCR(payload: { imageUrl?: string; imageBase64?: string; mimeType?: string }) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ocr-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setProcessing(true);

    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) {
        toast("שגיאה בהעלאת הקובץ", "error");
        setProcessing(false);
        resetInputs();
        return;
      }
      const { data: signedData } = await supabase.storage.from("documents").createSignedUrl(path, 604800);
      const signedUrl = signedData?.signedUrl || "";

      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      let ocr;
      if (isPdf) {
        const base64 = await fileToBase64(file);
        ocr = await tryOCR({ imageBase64: base64, mimeType: file.type || "application/pdf" });
      } else {
        ocr = await tryOCR({ imageUrl: signedUrl });
      }
      if (!ocr) {
        ocr = { title: file.name.replace(/\.[^.]+$/, ""), tags: ["כללי"], extractedText: "", docType: "Other", dateOnDoc: "", totalAmount: null, folderSuggestion: "", isInvestment: false };
      }

      // Immediately save business if VAT detected and not already exists
      let bizId = "";
      const bizName = ocr.businessName || "";
      const bizVat = ocr.businessVat || "";
      if (bizVat) {
        const { data: existing } = await supabase.from("businesses")
          .select("id").eq("user_id", user.id).eq("vat_number", bizVat).maybeSingle();
        if (existing) {
          bizId = existing.id;
        } else {
          const newBizId = generateId();
          const { error: bizError } = await supabase.from("businesses").insert({
            id: newBizId, user_id: user.id, name: bizName || "עסק",
            vat_number: bizVat,
            address: ocr.businessAddress || null,
            phone: ocr.businessPhone || null,
          });
          if (!bizError) {
            bizId = newBizId;
            await loadBusinesses();
          }
        }
      }

      setTempDoc({
        imageUrl: path, previewUrl: signedUrl, title: ocr.title || file.name, tags: ocr.tags || ["כללי"],
        extractedText: ocr.extractedText || "", docType: ocr.docType || "Other",
        dateOnDoc: ocr.dateOnDoc || "", totalAmount: ocr.totalAmount?.toString() || "",
        folder: ocr.folderSuggestion || "", isInvestment: ocr.isInvestment || false,
        direction: "expense", projectId: "", newProjectName: "",
        businessId: bizId, businessVat: bizVat, newBusinessName: "",
      });
      setConfirmOpen(true);
    } catch {
      toast("שגיאה בהעלאת הקובץ", "error");
    } finally {
      setProcessing(false);
      resetInputs();
    }
  }

  function resetInputs() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function saveDocument() {
    if (!user) return;
    let finalProjectId = tempDoc.projectId;

    if (tempDoc.projectId === "new" && tempDoc.newProjectName.trim()) {
      const newId = generateId();
      const { error: projError } = await supabase.from("projects").insert({ id: newId, user_id: user.id, customer_name: tempDoc.newProjectName.trim() });
      if (projError) {
        toast("שגיאה ביצירת הפרויקט", "error");
        return;
      }
      finalProjectId = newId;
      loadProjects();
    }

    let finalBusinessId = tempDoc.businessId;
    if (tempDoc.businessId === "new" && tempDoc.newBusinessName.trim()) {
      const newBizId = generateId();
      const { error: bizError } = await supabase.from("businesses").insert({
        id: newBizId, user_id: user.id, name: tempDoc.newBusinessName.trim(), vat_number: tempDoc.businessVat || null,
      });
      if (!bizError) {
        finalBusinessId = newBizId;
        loadBusinesses();
      }
    } else if (!finalBusinessId && tempDoc.businessVat) {
      const { data: existing } = await supabase.from("businesses")
        .select("id").eq("user_id", user.id).eq("vat_number", tempDoc.businessVat).maybeSingle();
      if (existing) {
        finalBusinessId = existing.id;
      } else {
        const bizName = tempDoc.title || "עסק חדש";
        const newBizId = generateId();
        const { error: bizError } = await supabase.from("businesses").insert({
          id: newBizId, user_id: user.id, name: bizName, vat_number: tempDoc.businessVat,
        });
        if (!bizError) {
          finalBusinessId = newBizId;
          loadBusinesses();
        }
      }
    }

    const { error: insertError } = await supabase.from("documents").insert({
      id: generateId(), user_id: user.id, title: tempDoc.title || "מסמך ללא שם",
      image_url: tempDoc.imageUrl, tags: tempDoc.tags,
      extracted_text: tempDoc.extractedText, doc_type: tempDoc.docType,
      date_on_doc: tempDoc.dateOnDoc || null,
      total_amount: parseFloat(tempDoc.totalAmount) || null,
      project_id: finalProjectId || null,
      folder: tempDoc.folder || null,
      is_investment: tempDoc.isInvestment,
      direction: tempDoc.direction,
      is_paid: tempDoc.docType !== "Delivery Note",
      business_id: finalBusinessId || null,
    });

    if (insertError) {
      toast("שגיאה בשמירת המסמך", "error");
      return;
    }

    const total = parseFloat(tempDoc.totalAmount) || 0;
    if (total > 0) {
      if (tempDoc.direction === "income") {
        await supabase.from("incomes").insert({
          id: generateId(), user_id: user.id,
          date: tempDoc.dateOnDoc || new Date().toISOString().split("T")[0],
          amount: total, type: "שוטף",
          description: `הכנסה ממסמך: ${tempDoc.title}`,
        });
      } else if (tempDoc.direction !== "other" && tempDoc.docType !== "Proforma Invoice") {
        await supabase.from("expenses").insert({
          id: generateId(), user_id: user.id,
          date: tempDoc.dateOnDoc || new Date().toISOString().split("T")[0],
          amount: total, is_paid: true,
          category: tempDoc.folder || "כללי",
          description: `הוצאה ממסמך: ${tempDoc.title}`,
        });
      }
      if (finalProjectId) {
        const { data: proj } = await supabase.from("projects").select("expenses").eq("id", finalProjectId).single();
        if (proj) {
          await supabase.from("projects").update({ expenses: (proj.expenses || 0) + total }).eq("id", finalProjectId);
        }
      }
    }

    toast("המסמך נשמר", "success");
    setConfirmOpen(false);
    setTempDoc(EMPTY_TEMP);
    onScanned?.();
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={handleCapture}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />
      <Dropdown
        align="left"
        trigger={
          <Button variant="secondary" size="sm">
            <ScanLine size={14} />
            סרוק מסמך
          </Button>
        }
      >
        {(close) => (
          <div>
            <MenuLabel>סריקה</MenuLabel>
            <MenuItem
              icon={<Camera size={14} />}
              onClick={() => {
                cameraInputRef.current?.click();
                close();
              }}
            >
              מצלמה
            </MenuItem>
            <MenuItem
              icon={<Upload size={14} />}
              onClick={() => {
                fileInputRef.current?.click();
                close();
              }}
            >
              העלאת קובץ (PDF/תמונה)
            </MenuItem>
          </div>
        )}
      </Dropdown>

      {/* Processing overlay */}
      <Modal open={processing} onClose={() => {}} title="מנתח מסמך" size="sm">
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500 text-center">
            הבינה המלאכותית קוראת את הטקסט ומזהה את סוג המסמך
          </p>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="פרטי מסמך"
        size="full"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>ביטול</Button>
            <Button onClick={saveDocument}>שמור</Button>
          </div>
        }
      >
        <div className="flex flex-col md:flex-row gap-0 h-full">
          <div className="flex-1 space-y-4 min-w-0 overflow-y-auto p-1">
            <Select label="שיוך לפרויקט" options={[
              { value: "", label: "ללא פרויקט" },
              ...projects.map((p) => ({ value: p.id, label: p.customer_name })),
            ]} value={tempDoc.projectId} onChange={(e) => setTempDoc({ ...tempDoc, projectId: e.target.value })} />
            <Select label="ספק" options={[
              { value: "", label: "ללא ספק" },
              ...businesses.map((b) => ({ value: b.id, label: b.name })),
              { value: "new", label: "+ הוסף ספק" },
            ]} value={tempDoc.businessId} onChange={(e) => setTempDoc({ ...tempDoc, businessId: e.target.value })} />
            {tempDoc.businessId === "new" && (
              <Input label="שם הספק" value={tempDoc.newBusinessName} onChange={(e) => setTempDoc({ ...tempDoc, newBusinessName: e.target.value })} />
            )}
            <Input label="כותרת המסמך" value={tempDoc.title} onChange={(e) => setTempDoc({ ...tempDoc, title: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="סוג מסמך" options={DOC_TYPES} value={tempDoc.docType} onChange={(e) => setTempDoc({ ...tempDoc, docType: e.target.value })} />
              <Input label="סכום (₪)" type="number" step="0.01" value={tempDoc.totalAmount} onChange={(e) => setTempDoc({ ...tempDoc, totalAmount: e.target.value })} />
            </div>
            <Input label="תאריך במסמך" type="date" value={tempDoc.dateOnDoc} onChange={(e) => setTempDoc({ ...tempDoc, dateOnDoc: e.target.value })} />
            <Select label="תיקייה" options={[
              { value: "", label: "ללא תיקייה" },
              ...FOLDERS.map((f) => ({ value: f.id, label: f.name })),
            ]} value={tempDoc.folder} onChange={(e) => setTempDoc({ ...tempDoc, folder: e.target.value })} />
            <Select label="הוצאה / הכנסה" options={[
              { value: "expense", label: "הוצאה" },
              { value: "income", label: "הכנסה" },
              { value: "other", label: "אחר" },
            ]} value={tempDoc.direction} onChange={(e) => setTempDoc({ ...tempDoc, direction: e.target.value })} />
            <Checkbox label="השקעה בעסק (רכוש קבוע)" checked={tempDoc.isInvestment} onChange={(e) => setTempDoc({ ...tempDoc, isInvestment: e.target.checked })} />
            <Input label="תגיות (מופרדות בפסיק)" value={tempDoc.tags.join(", ")} onChange={(e) => setTempDoc({ ...tempDoc, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">טקסט שחולץ</label>
              <textarea rows={4} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm" value={tempDoc.extractedText} onChange={(e) => setTempDoc({ ...tempDoc, extractedText: e.target.value })} readOnly />
            </div>
          </div>
          {tempDoc.imageUrl && (
            <div className="md:w-1/2 shrink-0 bg-slate-100 border flex items-center justify-center h-64 md:h-full overflow-hidden">
              {/\.pdf$/i.test(tempDoc.imageUrl) ? (
                <iframe src={tempDoc.previewUrl} title="קובץ PDF" className="w-full h-full" />
              ) : (
                <img src={tempDoc.previewUrl} alt="" className="w-full h-full object-contain" />
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
