"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { logEvent } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown, MenuItem, MenuLabel } from "@/components/ui/dropdown";
import { generateId } from "@/components/shared/generate-id";
import { embeddedName } from "@/components/projects/project-types";
import { PREMADE_FOLDERS, projectFolderName } from "@/components/scans/folders";
import type { UserFolder } from "@/components/scans/folders";
import { ScanLine, Camera, Upload } from "lucide-react";

interface Business {
  id: string;
  name: string;
  vat_number: string | null;
}

interface OcrResult {
  title?: string;
  tags?: string[];
  docType?: string;
  dateOnDoc?: string;
  totalAmount?: number | null;
  folderSuggestion?: string;
  isInvestment?: boolean;
  businessName?: string;
  businessVat?: string;
  businessAddress?: string;
  businessPhone?: string;
}

interface OcrResponse {
  ok: boolean;
  data?: OcrResult;
  status?: number;
  bodyText?: string;
}

// סוג מסמך שהתקבל (סריקה). סוג המסמך קובע את מצב התשלום:
//  - tax_invoice / receipt / tax_invoice_receipt → שולם (הוצאה/הכנסה)
//  - credit_invoice → זיכוי (שלילי)
//  - transaction_account → תשלום עתידי (עדיין לא הוצאה)
//  - quotation / delivery_note / other → לא פיננסי
const DOC_TYPES = [
  { value: "tax_invoice", label: "חשבונית מס" },
  { value: "transaction_account", label: "חשבונית עסקה (תשלום עתידי)" },
  { value: "tax_invoice_receipt", label: "חשבונית מס/קבלה" },
  { value: "credit_invoice", label: "חשבונית מס זיכוי" },
  { value: "receipt", label: "קבלה" },
  { value: "quotation", label: "הצעת מחיר" },
  { value: "delivery_note", label: "תעודת משלוח" },
  { value: "other", label: "אחר" },
];

interface Props {
  onScanned?: () => void;
  primary?: boolean;
}

interface TempDoc {
  imageUrl: string;
  previewUrl: string;
  title: string;
  tags: string[];
  docType: string;
  dateOnDoc: string;
  totalAmount: string;
  folder: string;
  isInvestment: boolean;
  direction: string;
  projectId: string;
  businessId: string;
  businessVat: string;
  businessName: string;
  newBusinessName: string;
}

const EMPTY_TEMP: TempDoc = {
  imageUrl: "", previewUrl: "", title: "", tags: [], docType: "other",
  dateOnDoc: "", totalAmount: "", folder: "", isInvestment: false,
  direction: "expense", projectId: "", businessId: "", businessVat: "", businessName: "", newBusinessName: "",
};

export function DocumentScanner({ onScanned, primary = false }: Props) {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [tempDoc, setTempDoc] = useState<TempDoc>(EMPTY_TEMP);

  useEffect(() => {
    if (!user) return;
    loadBusinesses();
    loadFolders();
    loadProjects();
  }, [user]);

  async function loadFolders() {
    const { data } = await supabase.from("folders").select("id, name").eq("user_id", user!.id).order("created_at");
    setUserFolders(data || []);
  }

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("id, location, customers(name)").eq("user_id", user!.id).order("created_at", { ascending: false });
    setProjects((data || []).map((p) => ({ id: p.id, name: (embeddedName(p.customers) || "ללא לקוח") + (p.location ? " - " + p.location : "") })));
  }

  async function loadBusinesses() {
    const { data } = await supabase.from("businesses").select("id, name, vat_number").eq("user_id", user!.id);
    setBusinesses(data || []);
  }

  // Finds an existing supplier matching the OCR data (by VAT first, then by
  // name), fills in any missing details on it, or creates a new one.
  async function upsertSupplier(name: string, vat: string, address?: string | null, phone?: string | null): Promise<string> {
    if (!user || (!name && !vat)) return "";

    let existing: { id: string; name: string | null; vat_number: string | null; address: string | null; phone: string | null } | null = null;
    if (vat) {
      const res = await supabase.from("businesses").select("id, name, vat_number, address, phone")
        .eq("user_id", user.id).eq("vat_number", vat).maybeSingle();
      existing = res.data;
    }
    if (!existing && name) {
      const res = await supabase.from("businesses").select("id, name, vat_number, address, phone")
        .eq("user_id", user.id).ilike("name", name).maybeSingle();
      existing = res.data;
    }

    if (existing) {
      const patch: Record<string, string> = {};
      if (name && !existing.name) patch.name = name;
      if (vat && !existing.vat_number) patch.vat_number = vat;
      if (address && !existing.address) patch.address = address;
      if (phone && !existing.phone) patch.phone = phone;
      if (Object.keys(patch).length) {
        await supabase.from("businesses").update(patch).eq("id", existing.id);
        await loadBusinesses();
      }
      return existing.id;
    }

    const newBizId = generateId();
    const { error } = await supabase.from("businesses").insert({
      id: newBizId, user_id: user.id, name: name || "עסק",
      vat_number: vat || null, address: address || null, phone: phone || null,
    });
    if (error) return "";
    await loadBusinesses();
    return newBizId;
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function tryOCR(payload: { imageUrl?: string; imageBase64?: string; mimeType?: string; requestId?: string }): Promise<OcrResponse> {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ocr-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify(payload),
      });
      const bodyText = await res.text();
      let data: OcrResult | undefined;
      try {
        data = bodyText ? JSON.parse(bodyText) : undefined;
      } catch {}
      return { ok: res.ok, data, status: res.status, bodyText };
    } catch (e) {
      return { ok: false, status: 0, bodyText: (e as Error)?.message || "network error" };
    }
  }

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setProcessing(true);

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;

    try {
      // Storage keys must be ASCII — use our own generated name instead of the
      // user's file name (the doc title comes from OCR, not the file name).
      const ext = file.name.match(/\.[A-Za-z0-9]+$/)?.[0] || "";
      const path = `${user.id}/${Date.now()}_scan${ext}`;
      logEvent("info", "scan_upload_start", { requestId, fileName: file.name, fileSizeKb: Math.round(file.size / 1024), fileType: file.type || null, path });

      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) {
        logEvent("error", "scan_upload_error", { requestId, path, message: uploadError.message });
        toast("שגיאה בהעלאת הקובץ", "error");
        setProcessing(false);
        resetInputs();
        return;
      }
      const { data: signedData, error: signedError } = await supabase.storage.from("documents").createSignedUrl(path, 604800);
      if (signedError) logEvent("error", "scan_signed_url_error", { requestId, path, message: signedError.message });
      const signedUrl = signedData?.signedUrl || "";

      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      logEvent("info", "scan_ocr_start", { requestId, mode: isPdf ? "base64" : "url", mimeType: file.type || (isPdf ? "application/pdf" : null) });
      let ocrResult: OcrResponse;
      if (isPdf) {
        const base64 = await fileToBase64(file);
        ocrResult = await tryOCR({ imageBase64: base64, mimeType: file.type || "application/pdf", requestId });
      } else {
        ocrResult = await tryOCR({ imageUrl: signedUrl, requestId });
      }

      let ocr: OcrResult;
      if (!ocrResult.ok) {
        logEvent("error", "scan_ocr_error", { requestId, status: ocrResult.status, body: ocrResult.bodyText });
        toast("סריקת המסמך נכשלה", "error");
        ocr = { title: file.name.replace(/\.[^.]+$/, ""), tags: ["כללי"], docType: "other", dateOnDoc: "", totalAmount: null, folderSuggestion: "", isInvestment: false };
      } else {
        ocr = ocrResult.data || {};
        const missing: string[] = [];
        if (!ocr.title) missing.push("title");
        if (!ocr.docType) missing.push("docType");
        if (missing.length) logEvent("warn", "scan_ocr_degraded", { requestId, fields: missing });
        logEvent("info", "scan_ocr_success", { requestId, docType: ocr.docType, totalAmount: ocr.totalAmount ?? null, hasBusinessName: Boolean(ocr.businessName), hasBusinessVat: Boolean(ocr.businessVat) });
      }

      // Immediately save the supplier identified by the OCR (create or update)
      const bizId = await upsertSupplier(ocr.businessName || "", ocr.businessVat || "", ocr.businessAddress || null, ocr.businessPhone || null);

      setTempDoc({
        imageUrl: path, previewUrl: signedUrl, title: ocr.title || file.name, tags: ocr.tags || ["כללי"],
        docType: ocr.docType || "other",
        dateOnDoc: ocr.dateOnDoc || "", totalAmount: ocr.totalAmount?.toString() || "",
        folder: ocr.folderSuggestion || "", isInvestment: ocr.isInvestment || false,
        direction: "expense",
        projectId: "", businessId: bizId, businessVat: ocr.businessVat || "", businessName: ocr.businessName || "", newBusinessName: "",
      });
      setConfirmOpen(true);
    } catch (e) {
      logEvent("error", "scan_upload_error", { requestId, message: (e as Error)?.message || "unknown" });
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
    const requestId = requestIdRef.current || "";

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
    } else if (!finalBusinessId && (tempDoc.businessVat || tempDoc.businessName)) {
      finalBusinessId = await upsertSupplier(
        tempDoc.businessName,
        tempDoc.businessVat,
        null,
        null,
      );
    }

    const { error: insertError } = await supabase.from("documents").insert({
      id: generateId(), user_id: user.id, title: tempDoc.title || "מסמך ללא שם",
      image_url: tempDoc.imageUrl, tags: tempDoc.tags,
      doc_type: tempDoc.docType,
      date_on_doc: tempDoc.dateOnDoc || null,
      total_amount: parseFloat(tempDoc.totalAmount) || null,
      project_id: tempDoc.projectId || null,
      // מסמך המשויך לפרויקט נשמר תחת תת-התיקייה של הפרויקט בתוך תיקיית "פרויקטים"
      folder: tempDoc.projectId
        ? projectFolderName(projects.find((p) => p.id === tempDoc.projectId)?.name || "פרויקט")
        : tempDoc.folder || null,
      is_investment: tempDoc.isInvestment,
      direction: tempDoc.direction,
      business_id: finalBusinessId || null,
    });

    if (insertError) {
      logEvent("error", "scan_save_error", { requestId, table: "documents", message: insertError.message });
      toast("שגיאה בשמירת המסמך", "error");
      return;
    }
    logEvent("info", "scan_saved", { requestId, title: tempDoc.title, docType: tempDoc.docType, totalAmount: tempDoc.totalAmount });

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
          <Button variant={primary ? "primary" : "secondary"} size="sm">
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
        dismissible={false}
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>ביטול</Button>
            <Button onClick={saveDocument}>שמור</Button>
          </div>
        }
      >
        <div className="flex flex-col md:flex-row gap-0 h-full">
          <div className="flex-1 space-y-4 min-w-0 overflow-y-auto p-1">
            <Select label="תיקייה" options={[
              { value: "", label: "ללא תיקייה" },
              ...PREMADE_FOLDERS.map((f) => ({ value: f.id, label: f.name })),
              ...userFolders.map((f) => ({ value: f.name, label: f.name })),
            ]} value={tempDoc.folder} onChange={(e) => setTempDoc({ ...tempDoc, folder: e.target.value })} />
            <Input label="כותרת המסמך" value={tempDoc.title} onChange={(e) => setTempDoc({ ...tempDoc, title: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="סוג מסמך" options={DOC_TYPES} value={tempDoc.docType} onChange={(e) => setTempDoc({ ...tempDoc, docType: e.target.value })} />
              <Input label="סכום (₪)" type="number" step="0.01" value={tempDoc.totalAmount} onChange={(e) => setTempDoc({ ...tempDoc, totalAmount: e.target.value })} />
            </div>
            <Input label="תאריך במסמך" type="date" value={tempDoc.dateOnDoc} onChange={(e) => setTempDoc({ ...tempDoc, dateOnDoc: e.target.value })} />
            <Select label="ספק" options={[
              { value: "", label: "ללא ספק" },
              ...businesses.map((b) => ({ value: b.id, label: b.name })),
              { value: "new", label: "+ הוסף ספק" },
            ]} value={tempDoc.businessId} onChange={(e) => setTempDoc({ ...tempDoc, businessId: e.target.value })} />
            {tempDoc.businessId === "new" && (
              <Input label="שם הספק" value={tempDoc.newBusinessName} onChange={(e) => setTempDoc({ ...tempDoc, newBusinessName: e.target.value })} />
            )}
            <Select label="פרויקט" options={[
              { value: "", label: "ללא פרויקט" },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]} value={tempDoc.projectId} onChange={(e) => setTempDoc({ ...tempDoc, projectId: e.target.value })} />
            <Select label="הוצאה / הכנסה" options={[
              { value: "expense", label: "הוצאה" },
              { value: "income", label: "הכנסה" },
              { value: "other", label: "אחר" },
            ]} value={tempDoc.direction} onChange={(e) => setTempDoc({ ...tempDoc, direction: e.target.value })} />
            <Checkbox label="השקעה בעסק (רכוש קבוע)" checked={tempDoc.isInvestment} onChange={(e) => setTempDoc({ ...tempDoc, isInvestment: e.target.checked })} />
            <Input label="תגיות (מופרדות בפסיק)" value={tempDoc.tags.join(", ")} onChange={(e) => setTempDoc({ ...tempDoc, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
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
