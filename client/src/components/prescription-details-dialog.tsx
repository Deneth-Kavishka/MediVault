import { useState } from "react";
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
} from "lucide-react";
import { format, isPast } from "date-fns";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: number;
  qrCode: string;
  patientName: string;
  doctorName: string;
  issuedDate: string;
  expiryDate: string;
  medications: Medication[];
  status: "issued" | "dispensed" | "expired" | "cancelled";
  diagnosis?: string;
  specialInstructions?: string;
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

  const dispenseMutation = useMutation({
    mutationFn: async (data: {
      prescriptionId: number;
      status: "dispensed" | "expired";
      pharmacistNotes: string;
      substitutedMedications: string;
      counselingNotes: string;
      quantityDispensed: string;
    }) => {
      const response = await fetch(
        `/api/prescriptions/${data.prescriptionId}/dispense`,
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

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
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

  const handleClose = () => {
    setPharmacistNotes("");
    setSubstitutedMedications("");
    setCounselingNotes("");
    setQuantityDispensed("");
    onClose();
  };

  if (!prescription) return null;

  const isExpired = isPast(new Date(prescription.expiryDate));
  const canDispense = prescription.status === "issued" && !isExpired;

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
                  : isExpired
                  ? "destructive"
                  : "secondary"
              }
            >
              {prescription.status === "dispensed" ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : null}
              {isExpired && prescription.status !== "expired" ? (
                <AlertCircle className="h-3 w-3 mr-1" />
              ) : null}
              {isExpired && prescription.status !== "expired"
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
                  isExpired ? "text-destructive" : ""
                }`}
              >
                <Calendar className="h-4 w-4" />
                Expiry Date
              </Label>
              <p
                className={`font-medium ${isExpired ? "text-destructive" : ""}`}
              >
                {format(new Date(prescription.expiryDate), "PPP")}
                {isExpired ? " (Expired)" : ""}
              </p>
            </div>
          </div>

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
              {prescription.medications.map((med, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-1">
                  <p className="font-semibold">{med.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <p>
                      Dosage:{" "}
                      <span className="text-foreground">{med.dosage}</span>
                    </p>
                    <p>
                      Frequency:{" "}
                      <span className="text-foreground">{med.frequency}</span>
                    </p>
                    <p>
                      Duration:{" "}
                      <span className="text-foreground">{med.duration}</span>
                    </p>
                  </div>
                </div>
              ))}
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

          <Separator />

          {/* Pharmacist Notes Section - Only show if prescription can be processed */}
          {(canDispense || prescription.status === "issued") && (
            <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold">Dispensing Details</h3>

              <div className="space-y-2">
                <Label htmlFor="pharmacistNotes">
                  Dispensing Instructions{" "}
                  {!canDispense && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="pharmacistNotes"
                  placeholder="Enter dispensing instructions, notes, or reason for expiry..."
                  value={pharmacistNotes}
                  onChange={(e) => setPharmacistNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {canDispense && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="quantityDispensed">
                      Quantity Dispensed
                    </Label>
                    <Input
                      id="quantityDispensed"
                      placeholder="e.g., 30 tablets, 1 bottle, etc."
                      value={quantityDispensed}
                      onChange={(e) => setQuantityDispensed(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="substitutedMedications">
                      Substituted Medications (if any)
                    </Label>
                    <Textarea
                      id="substitutedMedications"
                      placeholder="Enter details of any medication substitutions..."
                      value={substitutedMedications}
                      onChange={(e) =>
                        setSubstitutedMedications(e.target.value)
                      }
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="counselingNotes">Counseling Notes</Label>
                    <Textarea
                      id="counselingNotes"
                      placeholder="Enter patient counseling notes..."
                      value={counselingNotes}
                      onChange={(e) => setCounselingNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>

            {prescription.status === "issued" && (
              <>
                {!isExpired && (
                  <Button
                    onClick={handleDispense}
                    disabled={dispenseMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {dispenseMutation.isPending
                      ? "Processing..."
                      : "Mark as Dispensed"}
                  </Button>
                )}

                <Button
                  variant="destructive"
                  onClick={handleMarkExpired}
                  disabled={dispenseMutation.isPending}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {dispenseMutation.isPending
                    ? "Processing..."
                    : "Mark as Expired"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
