import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

function normalizeDocType(value: string): string {
  return String(value || "other").trim() || "other";
}

function extFromName(name: string): string {
  const parts = String(name || "").split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}

type Props = {
  patientId?: string;
  patientDocumentsUrl?: string | null;
  disabled?: boolean;
};

export default function UploadMyMedicalDocumentDialog({
  patientId,
  patientDocumentsUrl,
  disabled,
}: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const [documentType, setDocumentType] = useState<string>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const isDisabled = Boolean(disabled) || !patientId || uploading;

  const reset = () => {
    setDocumentType("other");
    setTitle("");
    setDescription("");
    setFile(null);
    setUploading(false);
  };

  const canSubmit = useMemo(() => {
    return Boolean(patientId && file && title.trim() && !uploading);
  }, [patientId, file, title, uploading]);

  const handleUpload = async () => {
    try {
      if (!patientId) {
        toast({
          title: "Missing Patient",
          description: "Patient profile not found.",
          variant: "destructive",
        });
        return;
      }

      if (!file) {
        toast({
          title: "Missing File",
          description: "Choose a file to upload.",
          variant: "destructive",
        });
        return;
      }

      if (!title.trim()) {
        toast({
          title: "Missing Title",
          description: "Title is required.",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      // 1) Upload binary file
      const form = new FormData();
      form.append("patientId", patientId);
      form.append("file", file);

      const uploadRes = await fetch("/api/medical-documents/upload-file", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const uploadJson = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok) {
        throw new Error(uploadJson?.message || "File upload failed");
      }

      const fileUrl: string = String(uploadJson?.fileUrl || "");
      const fileName: string = String(uploadJson?.fileName || file.name);
      const fileType: string = String(
        uploadJson?.fileType || extFromName(fileName) || ""
      );
      const fileSize: number | undefined =
        typeof uploadJson?.fileSize === "number"
          ? uploadJson.fileSize
          : file.size || undefined;

      if (!fileUrl) {
        throw new Error("File upload failed: missing fileUrl");
      }

      // 2) Create document record
      const createRes = await fetch("/api/medical-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          documentType: normalizeDocType(documentType),
          title: title.trim(),
          description: description.trim() || null,
          fileUrl,
          fileName,
          fileType,
          fileSize,
          // isPublic is forced to false on the server for patient uploads
        }),
      });

      const createJson = await createRes.json().catch(() => null);
      if (!createRes.ok) {
        throw new Error(createJson?.message || "Failed to save document");
      }

      toast({
        title: "Uploaded",
        description: "Your medical document was uploaded successfully.",
      });

      const key = patientDocumentsUrl || (patientId ? `/api/medical-documents/patient/${patientId}` : "");
      if (key) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }

      setOpen(false);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload Failed", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isDisabled}>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Medical Document
          </DialogTitle>
          <DialogDescription>
            Add your past medical reports and history documents to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab_report">Lab Report</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
                <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g., MRI Report - 2024-10-12"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="Any notes about this document..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label>File</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Allowed: PDF, PNG, JPG, DOC, DOCX (max 25MB)
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!canSubmit}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
