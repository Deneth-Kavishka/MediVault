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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  FileText,
  FlaskConical,
  Pill,
  Scan,
  User,
} from "lucide-react";

type EmergencyTab = "medical_record" | "prescription" | "lab_test";

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

function pickExt(fileName: string): string {
  const parts = String(fileName || "").split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}

export function EmergencyNoAppointmentDialogButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const [verifyHealthId, setVerifyHealthId] = useState("");
  const [verifyNic, setVerifyNic] = useState("");
  const [verifyRfid, setVerifyRfid] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedPatient, setVerifiedPatient] =
    useState<VerifiedPatient | null>(null);

  const [isRfidScanning, setIsRfidScanning] = useState(false);

  const [tab, setTab] = useState<EmergencyTab>("medical_record");

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

  const patientDisplayName = useMemo(() => {
    if (!verifiedPatient) return "";
    const full = `${verifiedPatient.firstName || ""} ${
      verifiedPatient.lastName || ""
    }`.trim();
    return full || verifiedPatient.email || verifiedPatient.id;
  }, [verifiedPatient]);

  const resetAll = () => {
    setVerifyHealthId("");
    setVerifyNic("");
    setVerifyRfid("");
    setVerifiedPatient(null);
    setTab("medical_record");

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
      const response = await fetch("/api/patients/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId: healthId || undefined,
          nic: nic || undefined,
          rfid: rfid || undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Verification failed");
      }

      if (!data?.patient?.id) {
        throw new Error("Verification failed");
      }

      setVerifiedPatient(data.patient);
      toast({
        title: "Verified",
        description: "Patient verified successfully.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setVerifiedPatient(null);
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

  const invalidateDoctorData = () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/medical-records/doctor/mine"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/prescriptions/doctor/mine"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/lab-tests/doctor/mine"] });
    queryClient.invalidateQueries({
      queryKey: ["/api/medical-documents/doctor/mine"],
    });
  };

  const createMedicalRecord = async () => {
    if (!verifiedPatient?.id) return;
    if (!emrDiagnosis.trim()) {
      toast({
        title: "Missing Diagnosis",
        description: "Diagnosis is required.",
        variant: "destructive",
      });
      return;
    }

    const response = await fetch("/api/medical-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        patientId: verifiedPatient.id,
        diagnosis: emrDiagnosis.trim(),
        symptoms: emrSymptoms.trim() || null,
        notes: emrNotes.trim() || null,
        vitalSigns: emrVitalSigns.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(data?.message || "Failed to create record");
  };

  const createPrescription = async () => {
    if (!verifiedPatient?.id) return;

    const items = rxItems
      .map((i) => ({
        ...i,
        medicineName: i.medicineName.trim(),
        dosage: i.dosage.trim(),
        frequency: i.frequency.trim(),
        duration: i.duration.trim(),
        instructions: i.instructions?.trim() || undefined,
        quantity: Number(i.quantity || 0),
      }))
      .filter(
        (i) =>
          i.medicineName &&
          i.dosage &&
          i.frequency &&
          i.duration &&
          i.quantity > 0
      );

    if (items.length === 0) {
      toast({
        title: "Missing Items",
        description: "Add at least one valid prescription item.",
        variant: "destructive",
      });
      return;
    }

    const validityDays = Number(rxValidityDays || 90);

    const response = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        patientId: verifiedPatient.id,
        notes: rxNotes.trim() || null,
        validityDays: Number.isFinite(validityDays) ? validityDays : 90,
        items,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(data?.message || "Failed to create prescription");
  };

  const createLabTest = async () => {
    if (!verifiedPatient?.id) return;
    if (!labTestName.trim()) {
      toast({
        title: "Missing Test Name",
        description: "Test name is required.",
        variant: "destructive",
      });
      return;
    }

    const response = await fetch("/api/lab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        patientId: verifiedPatient.id,
        testType: "general",
        testName: labTestName.trim(),
        notes: labNotes.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(data?.message || "Failed to create lab test");
  };

  const handleCreate = async () => {
    try {
      if (!verifiedPatient?.id) {
        toast({
          title: "Not Verified",
          description: "Verify the patient first.",
          variant: "destructive",
        });
        return;
      }

      if (tab === "medical_record") {
        await createMedicalRecord();
        toast({ title: "Created", description: "Medical record created." });
      } else if (tab === "prescription") {
        await createPrescription();
        toast({ title: "Created", description: "Prescription created." });
      } else {
        await createLabTest();
        toast({ title: "Created", description: "Lab test request created." });
      }

      invalidateDoctorData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Create failed";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetAll();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <AlertCircle className="h-4 w-4 mr-2" />
          Emergency (No Appointment)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Emergency Record Creation
          </DialogTitle>
          <DialogDescription>
            Verify the patient by Health ID, NIC, or RFID, then create records
            without an appointment.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            Only create emergency records when necessary. Access is logged.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Health ID</Label>
              <Input
                placeholder="e.g., MV-H-001"
                value={verifyHealthId}
                onChange={(e) => setVerifyHealthId(e.target.value)}
                disabled={verifying}
              />
            </div>
            <div className="space-y-2">
              <Label>NIC</Label>
              <Input
                placeholder="e.g., 200012345678"
                value={verifyNic}
                onChange={(e) => setVerifyNic(e.target.value)}
                disabled={verifying}
              />
            </div>
            <div className="space-y-2">
              <Label>RFID</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter or Scan RFID"
                  value={verifyRfid}
                  onChange={(e) => setVerifyRfid(e.target.value)}
                  disabled={verifying}
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

          <div className="flex items-center gap-2">
            <Button onClick={handleVerifyPatient} disabled={verifying}>
              {verifying ? "Verifying..." : "Verify Patient"}
            </Button>
            {verifiedPatient && (
              <Badge variant="outline" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {patientDisplayName}
              </Badge>
            )}
          </div>

          <Separator />

          {!verifiedPatient ? (
            <div className="text-sm text-muted-foreground">
              Verify a patient to enable emergency record creation.
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as EmergencyTab)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="medical_record">
                  <FileText className="h-4 w-4 mr-2" />
                  Medical Record
                </TabsTrigger>
                <TabsTrigger value="prescription">
                  <Pill className="h-4 w-4 mr-2" />
                  Prescription
                </TabsTrigger>
                <TabsTrigger value="lab_test">
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Lab Test
                </TabsTrigger>
              </TabsList>

              <TabsContent value="medical_record" className="space-y-3">
                <div className="space-y-2">
                  <Label>Diagnosis</Label>
                  <Input
                    value={emrDiagnosis}
                    onChange={(e) => setEmrDiagnosis(e.target.value)}
                    placeholder="Diagnosis"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Symptoms</Label>
                  <Textarea
                    value={emrSymptoms}
                    onChange={(e) => setEmrSymptoms(e.target.value)}
                    placeholder="Symptoms"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vital Signs</Label>
                  <Input
                    value={emrVitalSigns}
                    onChange={(e) => setEmrVitalSigns(e.target.value)}
                    placeholder="BP, temp, pulse..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={emrNotes}
                    onChange={(e) => setEmrNotes(e.target.value)}
                    placeholder="Notes"
                  />
                </div>
              </TabsContent>

              <TabsContent value="prescription" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Validity (days)</Label>
                    <Input
                      type="number"
                      value={rxValidityDays}
                      onChange={(e) => setRxValidityDays(e.target.value)}
                      min={1}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={rxNotes}
                      onChange={(e) => setRxNotes(e.target.value)}
                      placeholder="Notes"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Items</div>
                  {rxItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-6 gap-2"
                    >
                      <Input
                        className="md:col-span-2"
                        placeholder="Medicine"
                        value={item.medicineName}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx] = {
                            ...next[idx],
                            medicineName: e.target.value,
                          };
                          setRxItems(next);
                        }}
                      />
                      <Input
                        placeholder="Dosage"
                        value={item.dosage}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx] = { ...next[idx], dosage: e.target.value };
                          setRxItems(next);
                        }}
                      />
                      <Input
                        placeholder="Frequency"
                        value={item.frequency}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx] = {
                            ...next[idx],
                            frequency: e.target.value,
                          };
                          setRxItems(next);
                        }}
                      />
                      <Input
                        placeholder="Duration"
                        value={item.duration}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx] = {
                            ...next[idx],
                            duration: e.target.value,
                          };
                          setRxItems(next);
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={String(item.quantity)}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx] = {
                            ...next[idx],
                            quantity: Math.max(1, Number(e.target.value || 1)),
                          };
                          setRxItems(next);
                        }}
                        min={1}
                      />

                      <Input
                        className="md:col-span-6"
                        placeholder="Instructions (optional)"
                        value={item.instructions || ""}
                        onChange={(e) => {
                          const next = [...rxItems];
                          next[idx] = {
                            ...next[idx],
                            instructions: e.target.value,
                          };
                          setRxItems(next);
                        }}
                      />

                      <div className="md:col-span-6 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
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
                            ]);
                          }}
                        >
                          Add Item
                        </Button>
                        {rxItems.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              setRxItems((prev) =>
                                prev.filter((_, i) => i !== idx)
                              );
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="lab_test" className="space-y-3">
                <div className="space-y-2">
                  <Label>Test Name</Label>
                  <Input
                    value={labTestName}
                    onChange={(e) => setLabTestName(e.target.value)}
                    placeholder="e.g., CBC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={labNotes}
                    onChange={(e) => setLabNotes(e.target.value)}
                    placeholder="Notes"
                  />
                </div>
              </TabsContent>

              <div className="pt-2">
                <Button onClick={handleCreate} className="w-full">
                  Create
                </Button>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EmergencyNoAppointmentDialogButton;
