import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pill, Download, QrCode, User, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import QRCodeLib from "qrcode";

interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

interface Prescription {
  id: string;
  patientId?: string;
  patientName?: string;
  patientHealthId?: string;
  doctorId?: string;
  doctorName?: string;
  status: string;
  issuedDate: string;
  validUntil?: string;
  notes?: string;
  qrCode?: string;
  scannedCount?: number;
  lastScannedAt?: string;
  dispensedAt?: string;
  items: PrescriptionItem[];
}

export default function Prescriptions() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Determine which endpoint to use based on role
  const endpoint =
    user?.role === "doctor"
      ? "/api/prescriptions/doctor/mine"
      : "/api/prescriptions";

  const { data: prescriptions = [], isLoading: loadingPrescriptions } =
    useQuery<Prescription[]>({
      queryKey: [endpoint],
      enabled: isAuthenticated && !!user,
    });

  // Generate QR code when prescription is selected
  useEffect(() => {
    if (selectedPrescription?.qrCode && qrCanvasRef.current) {
      QRCodeLib.toCanvas(
        qrCanvasRef.current,
        selectedPrescription.qrCode,
        { width: 256, margin: 2 },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );

      // Also generate data URL for download
      QRCodeLib.toDataURL(
        selectedPrescription.qrCode,
        { width: 512, margin: 2 },
        (error, url) => {
          if (error) {
            console.error("QR Code data URL error:", error);
          } else {
            setQrCodeUrl(url);
          }
        }
      );
    }
  }, [selectedPrescription]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const isDoctor = user.role === "doctor";

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "dispensed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const openDetailDialog = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isDoctor ? "My Issued Prescriptions" : "My Prescriptions"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isDoctor
              ? "View all prescriptions you've issued to patients"
              : "View and manage your prescriptions"}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Pill className="h-4 w-4 mr-2" />
          {prescriptions.length} Prescriptions
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescriptions List</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPrescriptions ? (
            <p className="text-center py-8 text-muted-foreground">
              Loading prescriptions...
            </p>
          ) : prescriptions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No prescriptions found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isDoctor ? (
                    <>
                      <TableHead>Patient</TableHead>
                      <TableHead>Health ID</TableHead>
                    </>
                  ) : (
                    <TableHead>Doctor</TableHead>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Medicines</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    {isDoctor ? (
                      <>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {prescription.patientName || "Unknown Patient"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {prescription.patientHealthId || "N/A"}
                          </Badge>
                        </TableCell>
                      </>
                    ) : (
                      <TableCell className="font-medium">
                        {prescription.doctorName || "Unknown Doctor"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge className={getStatusColor(prescription.status)}>
                        {prescription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(
                          new Date(prescription.issuedDate),
                          "MMM dd, yyyy"
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {prescription.validUntil
                        ? format(
                            new Date(prescription.validUntil),
                            "MMM dd, yyyy"
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {prescription.items?.length || 0} items
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailDialog(prescription)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {!isDoctor && prescription.qrCode && (
                          <Button size="sm" variant="ghost">
                            <QrCode className="h-4 w-4" />
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

      {/* Prescription Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              {isDoctor
                ? `Prescription for ${selectedPrescription?.patientName}`
                : `Prescribed by ${selectedPrescription?.doctorName}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-4">
              {/* Patient/Doctor Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {isDoctor ? "Patient Information" : "Doctor Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {isDoctor ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Patient Name
                        </label>
                        <p className="font-semibold">
                          {selectedPrescription.patientName || "Unknown"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Health ID
                        </label>
                        <p>
                          <Badge variant="outline">
                            {selectedPrescription.patientHealthId || "N/A"}
                          </Badge>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Doctor Name
                      </label>
                      <p className="font-semibold">
                        {selectedPrescription.doctorName || "Unknown"}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <p className="mt-1">
                      <Badge
                        className={getStatusColor(selectedPrescription.status)}
                      >
                        {selectedPrescription.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Issued Date
                    </label>
                    <p className="mt-1">
                      {format(
                        new Date(selectedPrescription.issuedDate),
                        "MMMM dd, yyyy"
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Valid Until
                    </label>
                    <p className="mt-1">
                      {selectedPrescription.validUntil
                        ? format(
                            new Date(selectedPrescription.validUntil),
                            "MMMM dd, yyyy"
                          )
                        : "No expiry"}
                    </p>
                  </div>

                  {/* Scan Tracking Info */}
                  {selectedPrescription.scannedCount !== undefined &&
                    selectedPrescription.scannedCount > 0 && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Scanned Count
                          </label>
                          <p className="mt-1 font-semibold text-blue-600 dark:text-blue-400">
                            {selectedPrescription.scannedCount} time
                            {selectedPrescription.scannedCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {selectedPrescription.lastScannedAt && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Last Scanned
                            </label>
                            <p className="mt-1">
                              {format(
                                new Date(selectedPrescription.lastScannedAt),
                                "MMM dd, yyyy 'at' hh:mm a"
                              )}
                            </p>
                          </div>
                        )}
                        {selectedPrescription.dispensedAt && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              First Dispensed
                            </label>
                            <p className="mt-1">
                              {format(
                                new Date(selectedPrescription.dispensedAt),
                                "MMM dd, yyyy 'at' hh:mm a"
                              )}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                </CardContent>
              </Card>

              {/* Medicines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Prescribed Medicines
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
                      {selectedPrescription.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Pill className="h-4 w-4 text-primary" />
                              {item.medicineName}
                            </div>
                          </TableCell>
                          <TableCell>{item.dosage}</TableCell>
                          <TableCell>{item.frequency}</TableCell>
                          <TableCell>{item.duration}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {selectedPrescription.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <label className="text-sm font-medium text-muted-foreground">
                        Doctor's Notes
                      </label>
                      <p className="mt-1 text-sm">
                        {selectedPrescription.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QR Code for Patients */}
              {!isDoctor && selectedPrescription.qrCode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      QR Code for Pharmacy
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Present this QR code to the pharmacist to dispense your
                      prescription
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                      <canvas ref={qrCanvasRef} />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Prescription Code</p>
                      <p className="text-xs font-mono bg-muted px-3 py-2 rounded">
                        {selectedPrescription.qrCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pharmacist will scan this code to verify and update the
                        prescription status
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {!isDoctor && selectedPrescription.qrCode && qrCodeUrl && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = qrCodeUrl;
                      link.download = `prescription-qr-${selectedPrescription.qrCode}.png`;
                      link.click();
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Download QR
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
