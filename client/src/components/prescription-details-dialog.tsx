import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  User,
  FileText,
  Pill,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { format, isPast } from "date-fns";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  dispensed?: boolean;
}

interface Prescription {
  id: number | string;
  qrCode: string;
  patientName: string;
  doctorName: string;
  issuedDate: string;
  expiryDate: string;
  medications: Medication[];
  items?: PrescriptionItem[];
  status:
    | "issued"
    | "active"
    | "dispensed"
    | "expired"
    | "not_dispensed"
    | "cancelled";
  diagnosis?: string;
  specialInstructions?: string;
  lastScannedAt?: string;
  dispensedAt?: string;
  dispensedBy?: string;
  dispensedByName?: string;
  pharmacistNotes?: string;
  substitutedMedications?: string;
  counselingNotes?: string;
}

interface PrescriptionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  prescription: Prescription | null;
}

export default function PrescriptionDetailsDialog({
  open,
  onClose,
  prescription,
}: PrescriptionDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pharmacistNotes, setPharmacistNotes] = useState("");
  const [substitutedMedications, setSubstitutedMedications] = useState("");
  const [counselingNotes, setCounselingNotes] = useState("");
  const [quantityDispensed, setQuantityDispensed] = useState("");
  const [itemDispenseState, setItemDispenseState] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!open || !prescription) return;

    setPharmacistNotes((prescription as any).pharmacistNotes || "");
    setSubstitutedMedications(
      (prescription as any).substitutedMedications || ""
    );
    setCounselingNotes((prescription as any).counselingNotes || "");

    const nextItemState: Record<string, boolean> = {};
    const items = Array.isArray((prescription as any).items)
      ? ((prescription as any).items as PrescriptionItem[])
      : [];
    for (const item of items) {
      if (item?.id) nextItemState[String(item.id)] = !!(item as any).dispensed;
    }
    setItemDispenseState(nextItemState);
  }, [open, prescription?.id]);

  const dispenseMutation = useMutation({
    mutationFn: async (data: {
      prescriptionId: number | string;
      status: "dispensed" | "expired" | "not_dispensed";
      pharmacistNotes: string;
      substitutedMedications: string;
      counselingNotes: string;
      quantityDispensed: string;
    }) => {
      const encodedId = encodeURIComponent(String(data.prescriptionId));
      const response = await fetch(`/api/prescriptions/${encodedId}/dispense`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/prescriptions/pharmacist/recent"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/prescriptions/pharmacist/stats"],
      });
      toast({
        title: "Success",
        description: "Prescription updated successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dispenseItemsMutation = useMutation({
    mutationFn: async (data: {
      prescriptionId: number | string;
      items: Array<{ id: string; dispensed: boolean }>;
      pharmacistNotes?: string;
      substitutedMedications?: string;
      counselingNotes?: string;
    }) => {
      const encodedId = encodeURIComponent(String(data.prescriptionId));
      const response = await fetch(
        `/api/prescriptions/${encodedId}/dispense-items`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/prescriptions/pharmacist/recent"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/prescriptions/pharmacist/stats"],
      });
      toast({
        title: "Success",
        description: "Dispense details saved",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDispense = () => {
    if (!prescription) return;

    // Check if prescription is expired
    if (isPast(new Date(prescription.expiryDate))) {
      toast({
        title: "Prescription Expired",
        description:
          "This prescription has expired. Please mark as expired with notes.",
        variant: "destructive",
      });
      return;
    }

    dispenseMutation.mutate({
      prescriptionId: prescription.id,
      status: "dispensed",
      pharmacistNotes,
      substitutedMedications,
      counselingNotes,
      quantityDispensed,
    });
  };

  const handleMarkExpired = () => {
    if (!prescription) return;

    if (!pharmacistNotes.trim()) {
      toast({
        title: "Notes Required",
        description:
          "Please provide notes explaining why the prescription is expired.",
        variant: "destructive",
      });
      return;
    }

    dispenseMutation.mutate({
      prescriptionId: prescription.id,
      status: "expired",
      pharmacistNotes,
      substitutedMedications: "",
      counselingNotes: "",
      quantityDispensed: "",
    });
  };

  const handleNotDispensedBecauseExpired = () => {
    if (!prescription) return;

    dispenseMutation.mutate({
      prescriptionId: prescription.id,
      status: "not_dispensed",
      pharmacistNotes,
      substitutedMedications: "",
      counselingNotes: "",
      quantityDispensed: "",
    });
  };

  const handleClose = () => {
    setPharmacistNotes("");
    setSubstitutedMedications("");
    setCounselingNotes("");
    setQuantityDispensed("");
    setItemDispenseState({});
    onClose();
  };

  if (!prescription) return null;

  const isFinalized =
    prescription.status === "dispensed" ||
    prescription.status === "expired" ||
    prescription.status === "not_dispensed" ||
    prescription.status === "cancelled" ||
    !!prescription.dispensedAt;

  const isExpiredByDate = isPast(new Date(prescription.expiryDate));
  // Only treat as expired-by-date if it hasn't already been finalized
  const isExpired = isExpiredByDate && !isFinalized;
  const isActiveLike =
    prescription.status === "issued" || prescription.status === "active";
  const canDispense = isActiveLike && !isExpired;
  // Allow pharmacists to add notes for any prescription that hasn't been dispensed yet
  const canUpdateStatus =
    prescription.status !== "dispensed" &&
    prescription.status !== "not_dispensed" &&
    prescription.status !== "cancelled" &&
    !prescription.dispensedAt;

  const effectiveItems: PrescriptionItem[] =
    Array.isArray((prescription as any).items) && (prescription as any).items
      ? ((prescription as any).items as PrescriptionItem[])
      : (prescription.medications || []).map((m, idx) => ({
          id: `med-${idx}`,
          medicineName: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          dispensed: false,
        }));

  const handleDonePerItem = () => {
    const payloadItems = effectiveItems
      .filter((i) => i.id && !String(i.id).startsWith("med-"))
      .map((i) => ({
        id: String(i.id),
        dispensed: itemDispenseState[String(i.id)] ?? !!i.dispensed,
      }));

    const willAllBeDispensed =
      payloadItems.length > 0 &&
      payloadItems.every((i) => i.dispensed === true);

    if (!willAllBeDispensed && !pharmacistNotes.trim()) {
      toast({
        title: "Notes Required",
        description:
          "Please add notes when one or more medicines are not dispensed (e.g., out of stock).",
        variant: "destructive",
      });
      return;
    }

    if (payloadItems.length === 0) {
      toast({
        title: "Cannot Save Item Status",
        description:
          "This prescription does not include item IDs. Please refresh and scan again.",
        variant: "destructive",
      });
      return;
    }

    dispenseItemsMutation.mutate({
      prescriptionId: prescription.id,
      items: payloadItems,
      pharmacistNotes: pharmacistNotes || undefined,
      substitutedMedications: substitutedMedications || undefined,
      counselingNotes: counselingNotes || undefined,
    });
  };

  const handleNotDispensedPerItem = () => {
    const payloadItems = effectiveItems
      .filter((i) => i.id && !String(i.id).startsWith("med-"))
      .map((i) => ({
        id: String(i.id),
        dispensed: itemDispenseState[String(i.id)] ?? !!i.dispensed,
      }));

    if (payloadItems.length === 0) {
      toast({
        title: "Cannot Save Item Status",
        description:
          "This prescription does not include item IDs. Please refresh and scan again.",
        variant: "destructive",
      });
      return;
    }

    const willAllBeDispensed = payloadItems.every((i) => i.dispensed === true);
    if (willAllBeDispensed) {
      toast({
        title: "All Items Dispensed",
        description:
          "All medicines are marked as dispensed. Use 'Done' to complete, or uncheck missing items.",
        variant: "destructive",
      });
      return;
    }

    if (!pharmacistNotes.trim()) {
      toast({
        title: "Notes Required",
        description:
          "Please add notes for not dispensed medicines (e.g., out of stock).",
        variant: "destructive",
      });
      return;
    }

    dispenseItemsMutation.mutate({
      prescriptionId: prescription.id,
      items: payloadItems,
      pharmacistNotes: pharmacistNotes || undefined,
      substitutedMedications: substitutedMedications || undefined,
      counselingNotes: counselingNotes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prescription Details
          </DialogTitle>
          <DialogDescription>QR Code: {prescription.qrCode}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant={
                prescription.status === "dispensed"
                  ? "default"
                  : prescription.status === "expired"
                  ? "destructive"
                  : prescription.status === "not_dispensed"
                  ? "destructive"
                  : isExpired
                  ? "destructive"
                  : "secondary"
              }
            >
              {prescription.status === "dispensed" ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : null}
              {isExpired ? <AlertCircle className="h-3 w-3 mr-1" /> : null}
              {prescription.status === "dispensed"
                ? "DISPENSED"
                : prescription.status === "expired"
                ? "EXPIRED"
                : prescription.status === "not_dispensed"
                ? "NOT DISPENSED"
                : isExpired
                ? "EXPIRED"
                : prescription.status.toUpperCase()}
            </Badge>
          </div>

          {/* Patient & Doctor Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                Patient
              </Label>
              <p className="font-medium">{prescription.patientName}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                Doctor
              </Label>
              <p className="font-medium">{prescription.doctorName}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Issued Date
              </Label>
              <p className="font-medium">
                {format(new Date(prescription.issuedDate), "PPP")}
              </p>
            </div>
            <div className="space-y-2">
              <Label
                className={`text-muted-foreground flex items-center gap-1 ${
                  isExpired || prescription.status === "expired"
                    ? "text-destructive"
                    : ""
                }`}
              >
                <Calendar className="h-4 w-4" />
                Expiry Date
              </Label>
              <p
                className={`font-medium ${
                  isExpired || prescription.status === "expired"
                    ? "text-destructive"
                    : ""
                }`}
              >
                {format(new Date(prescription.expiryDate), "PPP")}
                {(prescription.status === "expired" || isExpired) &&
                  " (Expired)"}
              </p>
            </div>
          </div>

          {/* Scan & Dispense Timestamps */}
          {((prescription as any).lastScannedAt ||
            (prescription as any).dispensedAt) && (
            <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">
                Tracking Information
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {(prescription as any).lastScannedAt && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium">Last Scanned</span>
                    </div>
                    <p className="text-sm font-medium">
                      {format(
                        new Date((prescription as any).lastScannedAt),
                        "PPP 'at' p"
                      )}
                    </p>
                  </div>
                )}
                {(prescription as any).dispensedAt && (
                  <div className="space-y-1">
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        prescription.status === "dispensed"
                          ? "text-green-600 dark:text-green-400"
                          : prescription.status === "not_dispensed" ||
                            prescription.status === "expired"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {prescription.status === "dispensed"
                          ? "Dispensed"
                          : prescription.status === "not_dispensed"
                          ? "Not Dispensed"
                          : prescription.status === "expired"
                          ? "Expired"
                          : "Processed"}
                      </span>
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        prescription.status === "dispensed"
                          ? "text-green-600 dark:text-green-400"
                          : prescription.status === "not_dispensed" ||
                            prescription.status === "expired"
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      {format(
                        new Date((prescription as any).dispensedAt),
                        "PPP 'at' p"
                      )}
                    </p>
                    {((prescription as any).dispensedByName ||
                      (prescription as any).dispensedBy) && (
                      <p className="text-xs text-muted-foreground">
                        By:{" "}
                        {(prescription as any).dispensedByName || "Pharmacist"}
                        {(prescription as any).dispensedByLicenseNumber
                          ? ` (License No: ${
                              (prescription as any).dispensedByLicenseNumber
                            })`
                          : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Diagnosis */}
          {prescription.diagnosis && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Diagnosis</Label>
              <p className="text-sm bg-muted p-3 rounded-md">
                {prescription.diagnosis}
              </p>
            </div>
          )}

          {/* Medications */}
          <div className="space-y-3">
            <Label className="text-muted-foreground flex items-center gap-1">
              <Pill className="h-4 w-4" />
              Medications
            </Label>
            <div className="space-y-2">
              {effectiveItems.map((item, index) => {
                const itemId = String(item.id || index);
                const checked = itemDispenseState[itemId] ?? !!item.dispensed;

                return (
                  <div key={itemId} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{item.medicineName}</p>
                        <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mt-1">
                          <p>
                            Dosage:{" "}
                            <span className="text-foreground">
                              {item.dosage}
                            </span>
                          </p>
                          <p>
                            Frequency:{" "}
                            <span className="text-foreground">
                              {item.frequency}
                            </span>
                          </p>
                          <p>
                            Duration:{" "}
                            <span className="text-foreground">
                              {item.duration}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          Dispensed
                        </span>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          disabled={prescription.status === "dispensed"}
                          onChange={(e) =>
                            setItemDispenseState((prev) => ({
                              ...prev,
                              [itemId]: e.target.checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Instructions */}
          {prescription.specialInstructions && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Special Instructions
              </Label>
              <p className="text-sm bg-amber-50 dark:bg-amber-950 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                {prescription.specialInstructions}
              </p>
            </div>
          )}

          {/* Recorded Dispensing Details */}
          {isFinalized &&
            (((prescription as any).pharmacistNotes &&
              String((prescription as any).pharmacistNotes).trim()) ||
              ((prescription as any).substitutedMedications &&
                String((prescription as any).substitutedMedications).trim()) ||
              ((prescription as any).counselingNotes &&
                String((prescription as any).counselingNotes).trim())) && (
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
                <Label className="text-sm font-medium text-muted-foreground">
                  Recorded Details
                </Label>
                {(prescription as any).pharmacistNotes && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Pharmacist Notes
                    </p>
                    <p className="text-sm">
                      {(prescription as any).pharmacistNotes}
                    </p>
                  </div>
                )}
                {(prescription as any).substitutedMedications && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Substitutions
                    </p>
                    <p className="text-sm">
                      {(prescription as any).substitutedMedications}
                    </p>
                  </div>
                )}
                {(prescription as any).counselingNotes && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Counseling Notes
                    </p>
                    <p className="text-sm">
                      {(prescription as any).counselingNotes}
                    </p>
                  </div>
                )}
              </div>
            )}

          <Separator />

          {/* Pharmacist Notes Section - Show for issued or expired prescriptions */}
          {canUpdateStatus && (
            <div className="space-y-4 bg-gradient-to-br from-muted/30 to-muted/50 p-5 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h3 className="font-semibold text-lg">Pharmacist Actions</h3>
              </div>

              <div className="space-y-4">
                {/* Status Update Notes - Required for both dispense and expire */}
                <div className="space-y-2">
                  <Label
                    htmlFor="pharmacistNotes"
                    className="text-base font-medium"
                  >
                    Pharmacist Notes
                    {isExpired && (
                      <>
                        <span className="text-destructive"> *</span>
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          (Required only for "Dispense Out of Patient Request")
                        </span>
                      </>
                    )}
                  </Label>
                  <Textarea
                    id="pharmacistNotes"
                    placeholder={
                      canDispense
                        ? "Enter dispensing instructions, patient counseling notes, or any important information..."
                        : "Explain the reason for marking as expired (e.g., prescription date passed, patient did not collect, etc.)"
                    }
                    value={pharmacistNotes}
                    onChange={(e) => setPharmacistNotes(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Show update button for expired or past expiry date prescriptions */}
                {isExpired &&
                  prescription.status !== "dispensed" &&
                  prescription.status !== "not_dispensed" &&
                  prescription.status !== "cancelled" &&
                  !prescription.dispensedAt && (
                    <div className="pt-4 space-y-3">
                      <Button
                        variant="destructive"
                        onClick={handleMarkExpired}
                        disabled={
                          dispenseMutation.isPending || !pharmacistNotes.trim()
                        }
                        className="w-full shadow-lg h-12"
                      >
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {dispenseMutation.isPending
                          ? "Processing..."
                          : "Update: Dispense Out of Patient Request"}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleNotDispensedBecauseExpired}
                        disabled={dispenseMutation.isPending}
                        className="w-full shadow-lg h-12"
                      >
                        {dispenseMutation.isPending
                          ? "Processing..."
                          : "NOT DISPENCE BECAUSE OF THE EXPIRED"}
                      </Button>
                    </div>
                  )}

                {canDispense && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="quantityDispensed"
                          className="font-medium"
                        >
                          Quantity Dispensed
                        </Label>
                        <Input
                          id="quantityDispensed"
                          placeholder="e.g., 30 tablets"
                          value={quantityDispensed}
                          onChange={(e) => setQuantityDispensed(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="substitutedMedications"
                          className="font-medium"
                        >
                          Substitutions (if any)
                        </Label>
                        <Input
                          id="substitutedMedications"
                          placeholder="Enter substituted meds"
                          value={substitutedMedications}
                          onChange={(e) =>
                            setSubstitutedMedications(e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="counselingNotes" className="font-medium">
                        Patient Counseling Notes
                      </Label>
                      <Textarea
                        id="counselingNotes"
                        placeholder="Enter patient counseling information, instructions, warnings, etc."
                        value={counselingNotes}
                        onChange={(e) => setCounselingNotes(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="min-w-[100px]"
            >
              {prescription.status === "issued" ? "Cancel" : "Close"}
            </Button>

            {isActiveLike && (
              <>
                {!isExpired ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleNotDispensedPerItem}
                      disabled={dispenseItemsMutation.isPending}
                      className="min-w-[160px] shadow-md"
                    >
                      {dispenseItemsMutation.isPending
                        ? "Saving..."
                        : "Not Dispensed"}
                    </Button>
                    <Button
                      onClick={handleDonePerItem}
                      disabled={dispenseItemsMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 min-w-[160px] shadow-md"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {dispenseItemsMutation.isPending ? "Saving..." : "Done"}
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 text-sm text-destructive">
                    ⚠️ Past expiry date - complete using buttons above
                  </div>
                )}
              </>
            )}

            {prescription.status === "expired" && (
              <div className="flex-1 text-center py-2">
                <p className="text-sm text-muted-foreground italic">
                  Use the button above to update this prescription
                </p>
              </div>
            )}

            {prescription.status === "dispensed" && (
              <div className="flex-1 text-center py-2">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ This prescription has already been dispensed
                </p>
              </div>
            )}

            {prescription.status === "not_dispensed" && (
              <div className="flex-1 text-center py-2">
                <p className="text-sm text-muted-foreground italic">
                  This prescription was finalized as not dispensed
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
