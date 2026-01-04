import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  FlaskConical,
  Pill,
  Search,
  Filter,
  Calendar,
  User,
  Eye,
  Download,
  AlertCircle,
  Scan,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isWebSerialSupported, scanRfidOnce } from "@/lib/rfid-serial";
import UploadMedicalDocumentDialog from "@/components/upload-medical-document-dialog";

type RecordType =
  | "all"
  | "medical_records"
  | "lab_tests"
  | "prescriptions"
  | "documents";
type StatusFilter = "all" | "pending" | "completed" | "cancelled";

interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientHealthId: string;
  diagnosis: string;
  symptoms: string;
  notes: string;
  vitalSigns: string;
  createdAt: string;
  appointmentId?: string;
}

interface LabTest {
  id: string;
  patientId: string;
  patientName: string;
  patientHealthId: string;
  testType: string;
  testName: string;
  status: string;
  requestDate: string;
  completionDate?: string;
  results?: string;
  resultFileUrl?: string;
  isAbnormal: boolean;
  notes?: string;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientHealthId: string;
  status: string;
  issuedDate: string;
  validUntil?: string;
  notes?: string;
  items: PrescriptionItem[];
}

interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

interface MedicalDocument {
  id: string;
  patientId: string;
  patientName: string;
  patientHealthId: string;
  documentType: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadedByRole: string;
  createdAt: string;
}

export default function DoctorMedicalRecords() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [recordType, setRecordType] = useState<RecordType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Emergency workflow (no appointment)
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [verifyHealthId, setVerifyHealthId] = useState("");
  const [verifyNic, setVerifyNic] = useState("");
  const [verifyRfid, setVerifyRfid] = useState("");
  const [isRfidScanning, setIsRfidScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedPatient, setVerifiedPatient] = useState<any>(null);

  const [emergencyTab, setEmergencyTab] = useState<
    "medical_record" | "prescription" | "lab_test"
  >("medical_record");

  const [emrDiagnosis, setEmrDiagnosis] = useState("");
  const [emrSymptoms, setEmrSymptoms] = useState("");
  const [emrNotes, setEmrNotes] = useState("");
  const [emrVitalSigns, setEmrVitalSigns] = useState("");

  const [rxValidityDays, setRxValidityDays] = useState("90");
  const [rxNotes, setRxNotes] = useState("");
  const [rxItems, setRxItems] = useState<
    Array<{
      medicineName: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions?: string;
    }>
  >([
    {
      medicineName: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: 1,
      instructions: "",
    },
  ]);

  const [labTestName, setLabTestName] = useState("");
  const [labNotes, setLabNotes] = useState("");

  const resetEmergency = () => {
    setVerifyHealthId("");
    setVerifyNic("");
    setVerifyRfid("");
    setVerifiedPatient(null);
    setEmergencyTab("medical_record");
    setEmrDiagnosis("");
    setEmrSymptoms("");
    setEmrNotes("");
    setEmrVitalSigns("");
    setRxValidityDays("90");
    setRxNotes("");
    setRxItems([
      {
        medicineName: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: 1,
        instructions: "",
      },
    ]);
    setLabTestName("");
    setLabNotes("");
  };

  const handleVerifyPatient = async () => {
    try {
      const healthId = verifyHealthId.trim();
      const nic = verifyNic.trim();
      const rfid = verifyRfid.trim();

      if (!healthId && !nic && !rfid) {
        toast({
          title: "Missing Identifier",
          description: "Enter Health ID, NIC, or RFID.",
          variant: "destructive",
        });
        return;
      }

      setVerifying(true);
      const res = await fetch("/api/patients/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: healthId || undefined, // server treats this as Health ID
          nic: nic || undefined,
          rfid: rfid || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to verify patient");
      }

      setVerifiedPatient(data?.patient || null);
      toast({
        title: "Patient Verified",
        description: "You can now create records without an appointment.",
      });
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
      setVerifiedPatient(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleScanRFID = () => {
    if (isRfidScanning || verifying) return;

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
        setVerifyRfid(uid);
        toast({
          title: "RFID Scanned",
          description: `UID captured: ${uid}`,
        });
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

  const requireVerifiedPatient = () => {
    if (!verifiedPatient?.id) {
      toast({
        title: "Patient Not Verified",
        description: "Verify a patient first.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const createEmergencyMedicalRecord = async () => {
    if (!requireVerifiedPatient()) return;
    if (!emrDiagnosis.trim()) {
      toast({
        title: "Validation Error",
        description: "Diagnosis is required.",
        variant: "destructive",
      });
      return;
    }

    const res = await fetch("/api/medical-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: verifiedPatient.id,
        diagnosis: emrDiagnosis.trim(),
        symptoms: emrSymptoms.trim() || undefined,
        notes: emrNotes.trim() || undefined,
        vitalSigns: emrVitalSigns.trim() || undefined,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || "Failed to create medical record");
    }

    await queryClient.invalidateQueries({
      queryKey: ["/api/medical-records/doctor/mine"],
    });
    toast({ title: "Medical Record Created" });
    setEmrDiagnosis("");
    setEmrSymptoms("");
    setEmrNotes("");
    setEmrVitalSigns("");
  };

  const createEmergencyPrescription = async () => {
    if (!requireVerifiedPatient()) return;

    const cleanedItems = rxItems
      .map((i) => ({
        ...i,
        medicineName: i.medicineName.trim(),
        dosage: i.dosage.trim(),
        frequency: i.frequency.trim(),
        duration: i.duration.trim(),
        instructions: i.instructions?.trim() || undefined,
        quantity: Number(i.quantity) || 1,
      }))
      .filter((i) => i.medicineName && i.dosage && i.frequency && i.duration);

    if (cleanedItems.length === 0) {
      toast({
        title: "Validation Error",
        description:
          "Add at least one medicine with name, dosage, frequency, and duration.",
        variant: "destructive",
      });
      return;
    }

    const validityDays = Math.max(1, Number(rxValidityDays) || 90);

    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: verifiedPatient.id,
        validityDays,
        notes: rxNotes.trim() || undefined,
        items: cleanedItems,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || "Failed to create prescription");
    }

    await queryClient.invalidateQueries({
      queryKey: ["/api/prescriptions/doctor/mine"],
    });
    toast({ title: "Prescription Created" });
    setRxNotes("");
    setRxValidityDays("90");
    setRxItems([
      {
        medicineName: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: 1,
        instructions: "",
      },
    ]);
  };

  const createEmergencyLabTest = async () => {
    if (!requireVerifiedPatient()) return;
    if (!labTestName.trim()) {
      toast({
        title: "Validation Error",
        description: "Test name is required.",
        variant: "destructive",
      });
      return;
    }

    const res = await fetch("/api/lab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: verifiedPatient.id,
        testType: "Laboratory Test",
        testName: labTestName.trim(),
        notes: labNotes.trim() || undefined,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || "Failed to create lab test");
    }

    await queryClient.invalidateQueries({
      queryKey: ["/api/lab-tests/doctor/mine"],
    });
    toast({ title: "Lab Test Requested" });
    setLabTestName("");
    setLabNotes("");
  };

  // Fetch medical records
  const { data: medicalRecords = [], isLoading: loadingRecords } = useQuery<
    MedicalRecord[]
  >({
    queryKey: ["/api/medical-records/doctor/mine"],
    enabled: recordType === "all" || recordType === "medical_records",
  });

  // Fetch lab tests
  const { data: labTests = [], isLoading: loadingLabTests } = useQuery<
    LabTest[]
  >({
    queryKey: ["/api/lab-tests/doctor/mine"],
    enabled: recordType === "all" || recordType === "lab_tests",
  });

  // Fetch prescriptions
  const { data: prescriptions = [], isLoading: loadingPrescriptions } =
    useQuery<Prescription[]>({
      queryKey: ["/api/prescriptions/doctor/mine"],
      enabled: recordType === "all" || recordType === "prescriptions",
    });

  // Fetch medical documents
  const { data: documents = [], isLoading: loadingDocuments } = useQuery<
    MedicalDocument[]
  >({
    queryKey: ["/api/medical-documents/doctor/mine"],
    enabled: recordType === "all" || recordType === "documents",
  });

  const isLoading =
    loadingRecords ||
    loadingLabTests ||
    loadingPrescriptions ||
    loadingDocuments;

  const isWithinDateRange = (value?: string | null) => {
    if (!value) return true;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return true;

    if (dateFrom) {
      const start = new Date(dateFrom);
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }

    return true;
  };

  // Filter data based on search and status
  const filteredMedicalRecords = medicalRecords.filter((record) => {
    const matchesSearch =
      searchQuery === "" ||
      record.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.patientHealthId
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      record.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && isWithinDateRange(record.createdAt);
  });

  const filteredLabTests = labTests.filter((test) => {
    const matchesSearch =
      searchQuery === "" ||
      test.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.patientHealthId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.testName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || test.status === statusFilter;
    return (
      matchesSearch && matchesStatus && isWithinDateRange(test.requestDate)
    );
  });

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch =
      searchQuery === "" ||
      prescription.patientName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      prescription.patientHealthId
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || prescription.status === statusFilter;
    return (
      matchesSearch &&
      matchesStatus &&
      isWithinDateRange(prescription.issuedDate)
    );
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.patientHealthId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && isWithinDateRange(doc.createdAt);
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "expired":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const openDetailDialog = (record: any, type: string) => {
    setSelectedRecord({ ...record, recordType: type });
    setIsDetailDialogOpen(true);
  };

  const getTotalCount = () => {
    switch (recordType) {
      case "medical_records":
        return filteredMedicalRecords.length;
      case "lab_tests":
        return filteredLabTests.length;
      case "prescriptions":
        return filteredPrescriptions.length;
      case "documents":
        return filteredDocuments.length;
      default:
        return (
          medicalRecords.length +
          labTests.length +
          prescriptions.length +
          documents.length
        );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Medical Records</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all records, tests, and prescriptions you've issued
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setEmergencyOpen(true)}>
            Emergency (No Appointment)
          </Button>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <FileText className="h-4 w-4 mr-2" />
            {getTotalCount()} Total Records
          </Badge>
        </div>
      </div>

      {/* Emergency Dialog */}
      <Dialog
        open={emergencyOpen}
        onOpenChange={(open) => {
          setEmergencyOpen(open);
          if (!open) resetEmergency();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emergency Record Creation</DialogTitle>
            <DialogDescription>
              Create records for a patient without an appointment by verifying
              them using Health ID, NIC, or RFID.
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Verify Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Health ID</label>
                  <Input
                    value={verifyHealthId}
                    onChange={(e) => setVerifyHealthId(e.target.value)}
                    placeholder="Enter Health ID"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">NIC</label>
                  <Input
                    value={verifyNic}
                    onChange={(e) => setVerifyNic(e.target.value)}
                    placeholder="Enter NIC"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">RFID</label>
                  <div className="flex gap-2">
                    <Input
                      value={verifyRfid}
                      onChange={(e) => setVerifyRfid(e.target.value)}
                      placeholder="Scan or enter RFID"
                      disabled={verifying || isRfidScanning}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleScanRFID}
                      disabled={verifying || isRfidScanning}
                      title="Scan RFID"
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button onClick={handleVerifyPatient} disabled={verifying}>
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
                {verifiedPatient && (
                  <div className="text-sm text-muted-foreground">
                    Verified:{" "}
                    <span className="font-medium text-foreground">
                      {verifiedPatient.firstName} {verifiedPatient.lastName}
                    </span>
                    {verifiedPatient.healthId ? (
                      <span className="ml-2">
                        (Health ID: {verifiedPatient.healthId})
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs
            value={emergencyTab}
            onValueChange={(v) => setEmergencyTab(v as any)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="medical_record">Medical Record</TabsTrigger>
              <TabsTrigger value="prescription">Prescription</TabsTrigger>
              <TabsTrigger value="lab_test">Lab Test</TabsTrigger>
            </TabsList>

            <TabsContent value="medical_record" className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Create Medical Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Diagnosis *</label>
                    <Input
                      value={emrDiagnosis}
                      onChange={(e) => setEmrDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Symptoms</label>
                    <Textarea
                      value={emrSymptoms}
                      onChange={(e) => setEmrSymptoms(e.target.value)}
                      placeholder="Symptoms (optional)"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={emrNotes}
                      onChange={(e) => setEmrNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Vital Signs</label>
                    <Textarea
                      value={emrVitalSigns}
                      onChange={(e) => setEmrVitalSigns(e.target.value)}
                      placeholder="Vital signs (optional)"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={() =>
                      createEmergencyMedicalRecord().catch((err) =>
                        toast({
                          title: "Create Failed",
                          description: err?.message || "Please try again",
                          variant: "destructive",
                        })
                      )
                    }
                    disabled={!verifiedPatient || verifying}
                  >
                    Create Medical Record
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prescription" className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Create Prescription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        Validity (days)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={rxValidityDays}
                        onChange={(e) => setRxValidityDays(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Notes</label>
                      <Input
                        value={rxNotes}
                        onChange={(e) => setRxNotes(e.target.value)}
                        placeholder="Notes (optional)"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Medicines</label>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() =>
                          setRxItems((prev) => [
                            ...prev,
                            {
                              medicineName: "",
                              dosage: "",
                              frequency: "",
                              duration: "",
                              quantity: 1,
                              instructions: "",
                            },
                          ])
                        }
                      >
                        Add Medicine
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {rxItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Medicine {idx + 1}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setRxItems((prev) =>
                                  prev.length === 1
                                    ? prev
                                    : prev.filter((_, i) => i !== idx)
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Input
                              placeholder="Medicine name *"
                              value={item.medicineName}
                              onChange={(e) =>
                                setRxItems((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    medicineName: e.target.value,
                                  };
                                  return next;
                                })
                              }
                            />
                            <Input
                              placeholder="Dosage * (e.g., 500mg)"
                              value={item.dosage}
                              onChange={(e) =>
                                setRxItems((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    dosage: e.target.value,
                                  };
                                  return next;
                                })
                              }
                            />
                            <Input
                              placeholder="Frequency * (e.g., 3 times daily)"
                              value={item.frequency}
                              onChange={(e) =>
                                setRxItems((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    frequency: e.target.value,
                                  };
                                  return next;
                                })
                              }
                            />
                            <Input
                              placeholder="Duration * (e.g., 7 days)"
                              value={item.duration}
                              onChange={(e) =>
                                setRxItems((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    duration: e.target.value,
                                  };
                                  return next;
                                })
                              }
                            />
                            <Input
                              type="number"
                              min={1}
                              placeholder="Quantity"
                              value={item.quantity}
                              onChange={(e) =>
                                setRxItems((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    quantity: Number(e.target.value) || 1,
                                  };
                                  return next;
                                })
                              }
                            />
                            <Input
                              placeholder="Instructions (optional)"
                              value={item.instructions || ""}
                              onChange={(e) =>
                                setRxItems((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    instructions: e.target.value,
                                  };
                                  return next;
                                })
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() =>
                      createEmergencyPrescription().catch((err) =>
                        toast({
                          title: "Create Failed",
                          description: err?.message || "Please try again",
                          variant: "destructive",
                        })
                      )
                    }
                    disabled={!verifiedPatient || verifying}
                  >
                    Create Prescription
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lab_test" className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Request Lab Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Test Name *</label>
                    <Input
                      value={labTestName}
                      onChange={(e) => setLabTestName(e.target.value)}
                      placeholder="e.g., Full Blood Count"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={labNotes}
                      onChange={(e) => setLabNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() =>
                      createEmergencyLabTest().catch((err) =>
                        toast({
                          title: "Create Failed",
                          description: err?.message || "Please try again",
                          variant: "destructive",
                        })
                      )
                    }
                    disabled={!verifiedPatient || verifying}
                  >
                    Request Lab Test
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Record Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Record Type</label>
              <Select
                value={recordType}
                onValueChange={(value: RecordType) => setRecordType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="medical_records">
                    Medical Records
                  </SelectItem>
                  <SelectItem value="lab_tests">Lab Tests</SelectItem>
                  <SelectItem value="prescriptions">Prescriptions</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value: StatusFilter) => setStatusFilter(value)}
                disabled={
                  recordType === "medical_records" || recordType === "documents"
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name, ID, or diagnosis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Display */}
      <Tabs
        value={recordType}
        onValueChange={(value) => setRecordType(value as RecordType)}
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="medical_records">
            <FileText className="h-4 w-4 mr-2" />
            Records
          </TabsTrigger>
          <TabsTrigger value="lab_tests">
            <FlaskConical className="h-4 w-4 mr-2" />
            Lab Tests
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <Pill className="h-4 w-4 mr-2" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* All Records Tab */}
        <TabsContent value="all" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Showing all your issued medical records, lab tests, prescriptions,
              and documents. Use filters above to narrow down results.
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading records...</p>
              </CardContent>
            </Card>
          ) : (
            (() => {
              const combined = [
                ...filteredMedicalRecords.map((r) => ({
                  id: r.id,
                  type: "Medical Record" as const,
                  patientName: r.patientName,
                  patientHealthId: r.patientHealthId,
                  summary: r.diagnosis,
                  status: "—",
                  date: r.createdAt,
                  raw: r,
                  rawType: "medical_record" as const,
                })),
                ...filteredLabTests.map((t) => ({
                  id: t.id,
                  type: "Lab Test" as const,
                  patientName: t.patientName,
                  patientHealthId: t.patientHealthId,
                  summary: t.testName,
                  status: t.status,
                  date: t.requestDate,
                  raw: t,
                  rawType: "lab_test" as const,
                })),
                ...filteredPrescriptions.map((p) => ({
                  id: p.id,
                  type: "Prescription" as const,
                  patientName: p.patientName,
                  patientHealthId: p.patientHealthId,
                  summary: `${p.items?.length || 0} item(s)`,
                  status: p.status,
                  date: p.issuedDate,
                  raw: p,
                  rawType: "prescription" as const,
                })),
                ...filteredDocuments.map((d) => ({
                  id: d.id,
                  type: "Document" as const,
                  patientName: d.patientName,
                  patientHealthId: d.patientHealthId,
                  summary: d.title,
                  status: d.documentType,
                  date: d.createdAt,
                  raw: d,
                  rawType: "document" as const,
                })),
              ].sort((a, b) => {
                const da = new Date(a.date).getTime();
                const db = new Date(b.date).getTime();
                return (
                  (Number.isFinite(db) ? db : 0) -
                  (Number.isFinite(da) ? da : 0)
                );
              });

              if (combined.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        No records found. Try adjusting your filters.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      All Records ({combined.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Health ID</TableHead>
                          <TableHead>Summary</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {combined.map((row) => (
                          <TableRow key={`${row.rawType}-${row.id}`}>
                            <TableCell>
                              <Badge variant="outline">{row.type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {row.patientName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {row.patientHealthId}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {row.summary}
                            </TableCell>
                            <TableCell>
                              {row.status === "—" ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <Badge className={getStatusColor(row.status)}>
                                  {row.status}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(row.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  openDetailDialog(row.raw, row.rawType)
                                }
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })()
          )}
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="medical_records">
          <Card>
            <CardHeader>
              <CardTitle>Medical Records</CardTitle>
              <CardDescription>
                All medical records you've created for patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRecords ? (
                <p className="text-center py-8 text-muted-foreground">
                  Loading...
                </p>
              ) : filteredMedicalRecords.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No medical records found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Health ID</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedicalRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {record.patientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.patientHealthId}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.diagnosis}
                        </TableCell>
                        <TableCell>
                          {new Date(record.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openDetailDialog(record, "medical_record")
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Tests Tab */}
        <TabsContent value="lab_tests">
          <Card>
            <CardHeader>
              <CardTitle>Lab Tests</CardTitle>
              <CardDescription>
                All lab tests you've requested for patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLabTests ? (
                <p className="text-center py-8 text-muted-foreground">
                  Loading...
                </p>
              ) : filteredLabTests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No lab tests found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Health ID</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Completion Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLabTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {test.patientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {test.patientHealthId}
                          </Badge>
                        </TableCell>
                        <TableCell>{test.testName}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(test.status)}>
                            {test.status}
                            {test.isAbnormal && (
                              <AlertCircle className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(test.requestDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {test.completionDate
                            ? new Date(test.completionDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailDialog(test, "lab_test")}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {test.resultFileUrl && (
                              <Button size="sm" variant="ghost" asChild>
                                <a
                                  href={test.resultFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <CardTitle>Prescriptions</CardTitle>
              <CardDescription>
                All prescriptions you've issued to patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPrescriptions ? (
                <p className="text-center py-8 text-muted-foreground">
                  Loading...
                </p>
              ) : filteredPrescriptions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No prescriptions found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Health ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrescriptions.map((prescription) => (
                      <TableRow key={prescription.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {prescription.patientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {prescription.patientHealthId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getStatusColor(prescription.status)}
                          >
                            {prescription.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(
                            prescription.issuedDate
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {prescription.validUntil
                            ? new Date(
                                prescription.validUntil
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {prescription.items?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openDetailDialog(prescription, "prescription")
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Medical Documents</CardTitle>
                  <CardDescription>
                    All medical documents you've uploaded
                  </CardDescription>
                </div>
                <UploadMedicalDocumentDialog />
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocuments ? (
                <p className="text-center py-8 text-muted-foreground">
                  Loading...
                </p>
              ) : filteredDocuments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No documents found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>File Type</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {doc.patientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.documentType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {doc.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {doc.fileType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailDialog(doc, "document")}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="ghost" asChild>
                              <a
                                href={`/api/medical-documents/${doc.id}/file?download=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord?.recordType === "medical_record" &&
                "Medical Record Details"}
              {selectedRecord?.recordType === "lab_test" && "Lab Test Details"}
              {selectedRecord?.recordType === "prescription" &&
                "Prescription Details"}
              {selectedRecord?.recordType === "document" && "Document Details"}
            </DialogTitle>
            <DialogDescription>
              Full details for {selectedRecord?.patientName}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              {/* Patient Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Patient Name
                    </label>
                    <p className="font-semibold">
                      {selectedRecord.patientName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Health ID
                    </label>
                    <p>
                      <Badge variant="outline">
                        {selectedRecord.patientHealthId}
                      </Badge>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Record Details */}
              {selectedRecord.recordType === "medical_record" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Record Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Diagnosis
                      </label>
                      <p className="mt-1">{selectedRecord.diagnosis}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Symptoms
                      </label>
                      <p className="mt-1">{selectedRecord.symptoms || "—"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Notes
                      </label>
                      <p className="mt-1">{selectedRecord.notes || "—"}</p>
                    </div>
                    {selectedRecord.vitalSigns && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Vital Signs
                        </label>
                        <p className="mt-1 font-mono text-sm">
                          {selectedRecord.vitalSigns}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Date Created
                      </label>
                      <p className="mt-1">
                        {new Date(selectedRecord.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lab Test Details */}
              {selectedRecord.recordType === "lab_test" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Test Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Test Type
                        </label>
                        <p className="mt-1">{selectedRecord.testType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Test Name
                        </label>
                        <p className="mt-1">{selectedRecord.testName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Status
                        </label>
                        <p className="mt-1">
                          <Badge
                            className={getStatusColor(selectedRecord.status)}
                          >
                            {selectedRecord.status}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Abnormal Results
                        </label>
                        <p className="mt-1">
                          {selectedRecord.isAbnormal ? (
                            <Badge variant="destructive">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    {selectedRecord.results && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Results
                        </label>
                        <p className="mt-1 whitespace-pre-wrap">
                          {selectedRecord.results}
                        </p>
                      </div>
                    )}
                    {selectedRecord.notes && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Notes
                        </label>
                        <p className="mt-1">{selectedRecord.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Prescription Details */}
              {selectedRecord.recordType === "prescription" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Prescription Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead>
                          <TableHead>Dosage</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRecord.items?.map((item: PrescriptionItem) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.medicineName}
                            </TableCell>
                            <TableCell>{item.dosage}</TableCell>
                            <TableCell>{item.frequency}</TableCell>
                            <TableCell>{item.duration}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {selectedRecord.notes && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-muted-foreground">
                          Notes
                        </label>
                        <p className="mt-1">{selectedRecord.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Document Details */}
              {selectedRecord.recordType === "document" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Document Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Document Type
                        </label>
                        <p className="mt-1">
                          <Badge variant="outline">
                            {selectedRecord.documentType}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          File Type
                        </label>
                        <p className="mt-1">
                          <Badge variant="secondary">
                            {selectedRecord.fileType.toUpperCase()}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Title
                      </label>
                      <p className="mt-1 font-semibold">
                        {selectedRecord.title}
                      </p>
                    </div>
                    {selectedRecord.description && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Description
                        </label>
                        <p className="mt-1">{selectedRecord.description}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        File Name
                      </label>
                      <p className="mt-1 font-mono text-sm">
                        {selectedRecord.fileName}
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button asChild className="w-full">
                        <a
                          href={selectedRecord.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Document
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
