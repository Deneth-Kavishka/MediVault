import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isWebSerialSupported, scanRfidOnce } from "@/lib/rfid-serial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Scan, Upload, User } from "lucide-react";

type VerifiedPatient = {
  id: string;
  userId: string;
  nic: string;
  healthId?: string;
  rfid?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function normalizeDocType(value: string): string {
  return String(value || "other").trim() || "other";
}

function extFromName(name: string): string {
  const parts = String(name || "").split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}

export default function UploadMedicalDocumentDialog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const [healthId, setHealthId] = useState("");
  const [nic, setNic] = useState("");
  const [rfid, setRfid] = useState("");
  const [isRfidScanning, setIsRfidScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [patient, setPatient] = useState<VerifiedPatient | null>(null);

  const [documentType, setDocumentType] = useState<string>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const patientName = useMemo(() => {
    if (!patient) return "";
    const full = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
    return full || patient.email || patient.id;
  }, [patient]);

  const reset = () => {
    setHealthId("");
    setNic("");
    setRfid("");
    setIsRfidScanning(false);
    setVerifying(false);
    setPatient(null);
    setDocumentType("other");
    setTitle("");
    setDescription("");
    setFile(null);
    setUploading(false);
  };

  const handleVerify = async () => {
    try {
      const h = healthId.trim();
      const n = nic.trim();
      const r = rfid.trim();

      if (!h && !n && !r) {
        toast({
          title: "Missing Identifier",
          description: "Enter Health ID, NIC, or RFID.",
          variant: "destructive",
        });
        return;
      }

      setVerifying(true);
      const response = await fetch("/api/patients/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId: h || undefined,
          nic: n || undefined,
          rfid: r || undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Verification failed");
      }

      if (!data?.patient?.id) {
        throw new Error("Verification failed");
      }

      setPatient(data.patient);
      toast({
        title: "Verified",
        description: "Patient verified successfully.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setPatient(null);
      toast({
        title: "Verification Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleScanRFID = () => {
    if (isRfidScanning || verifying || uploading) return;

    if (!isWebSerialSupported()) {
      toast({
        title: "RFID Scanner Not Supported",
        description: "Use Chrome or Edge to scan RFID via USB (Web Serial).",
        variant: "destructive",
      });
      return;
    }

    setIsRfidScanning(true);
    toast({
      title: "RFID Scanner",
      description: "Select the NodeMCU serial port, then tap the RFID card.",
    });

    scanRfidOnce()
      .then((uid) => {
        setRfid(uid);
        toast({ title: "RFID Scanned", description: `UID captured: ${uid}` });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Scan failed";
        toast({
          title: "RFID Scan Failed",
          description: message,
          variant: "destructive",
        });
      })
      .finally(() => setIsRfidScanning(false));
  };

  const handleUpload = async () => {
    try {
      if (!patient?.id) {
        toast({
          title: "Not Verified",
          description: "Verify the patient first.",
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
      form.append("patientId", patient.id);
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
          patientId: patient.id,
          documentType: normalizeDocType(documentType),
          title: title.trim(),
          description: description.trim() || null,
          fileUrl,
          fileName,
          fileType,
          fileSize,
          isPublic: true,
        }),
      });

      const createJson = await createRes.json().catch(() => null);
      if (!createRes.ok) {
        throw new Error(createJson?.message || "Failed to save document");
      }

      toast({
        title: "Uploaded",
        description: "Document uploaded successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/medical-documents/doctor/mine"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/medical-records/doctor/mine"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/prescriptions/doctor/mine"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/lab-tests/doctor/mine"],
      });

      setOpen(false);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Error", description: message, variant: "destructive" });
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
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Medical Document
          </DialogTitle>
          <DialogDescription>
            Verify the patient by Health ID, NIC, or RFID, then upload any
            medical document.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            Uploads are logged for audit compliance.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Health ID</Label>
              <Input
                placeholder="e.g., MV-H-001"
                value={healthId}
                onChange={(e) => setHealthId(e.target.value)}
                disabled={verifying || uploading}
              />
            </div>
            <div className="space-y-2">
              <Label>NIC</Label>
              <Input
                placeholder="e.g., 200012345678"
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                disabled={verifying || uploading}
              />
            </div>
            <div className="space-y-2">
              <Label>RFID</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter or Scan RFID"
                  value={rfid}
                  onChange={(e) => setRfid(e.target.value)}
                  disabled={verifying || uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleScanRFID}
                  disabled={verifying || uploading || isRfidScanning}
                  title="Scan RFID"
                >
                  <Scan className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleVerify} disabled={verifying || uploading}>
              {verifying ? "Verifying..." : "Verify Patient"}
            </Button>
            {patient && (
              <Badge variant="outline" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {patientName}
              </Badge>
            )}
          </div>

          <Separator />

          {!patient ? (
            <div className="text-sm text-muted-foreground">
              Verify a patient to enable document upload.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab_report">Lab Report</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="diagnosis">Diagnosis</SelectItem>
                      <SelectItem value="consultation_note">
                        Consultation Note
                      </SelectItem>
                      <SelectItem value="medical_image">
                        Medical Image
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                    disabled={uploading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes/description"
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
                {file && (
                  <div className="text-xs text-muted-foreground">
                    Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                  </div>
                )}
              </div>

              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
