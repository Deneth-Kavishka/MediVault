import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Pill,
  Download,
  QrCode,
  User,
  Calendar,
  Eye,
  Stethoscope,
  Building2,
  Search,
  Filter,
  X,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import QRCodeLib from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  doctorSpecialty?: string;
  status: string;
  issuedDate: string;
  validUntil?: string;
  notes?: string;
  qrCode?: string;
  scannedCount?: number;
  lastScannedAt?: string;
  dispensedAt?: string;
  dispensedBy?: string;
  items: PrescriptionItem[];
}

export default function Prescriptions() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrDialogPrescription, setQrDialogPrescription] =
    useState<Prescription | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const qrDialogCanvasRef = useRef<HTMLCanvasElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDoctor, setFilterDoctor] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [generatingQrForId, setGeneratingQrForId] = useState<string | null>(
    null
  );

  // Determine which endpoint to use based on role
  const endpoint =
    user?.role === "doctor"
      ? "/api/prescriptions/doctor/mine"
      : user?.role === "pharmacist"
      ? "/api/prescriptions/pharmacist/recent"
      : "/api/prescriptions";

  const { data: prescriptions = [], isLoading: loadingPrescriptions } =
    useQuery<Prescription[]>({
      queryKey: [endpoint],
      enabled: isAuthenticated && !!user,
      select: (data: any) => {
        if (!Array.isArray(data)) return [] as any;
        if (user?.role !== "pharmacist") return data;

        // The pharmacist endpoint returns `expiryDate` instead of `validUntil`.
        return data.map((p: any) => ({
          ...p,
          validUntil: p.validUntil ?? p.expiryDate ?? null,
        }));
      },
    });

  const generateQrCode = async (prescriptionId: string) => {
    try {
      setGeneratingQrForId(prescriptionId);
      const response = await fetch(
        `/api/prescriptions/${encodeURIComponent(prescriptionId)}/generate-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to generate QR code");
      }

      await response.json();
      await queryClient.invalidateQueries({ queryKey: [endpoint] });

      toast({
        title: "QR Code Generated",
        description: "You can now view and download the QR code.",
      });
    } catch (error: any) {
      console.error("Generate QR error:", error);
      toast({
        title: "QR Generation Failed",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setGeneratingQrForId(null);
    }
  };

  // Debug: Log prescriptions data to check QR codes
  useEffect(() => {
    if (prescriptions.length > 0) {
      console.log("Prescriptions loaded:", prescriptions.length);
      console.log("First prescription QR code:", prescriptions[0]?.qrCode);
      console.log("Sample prescription data:", prescriptions[0]);
    }
  }, [prescriptions]);

  // Generate QR code when prescription is selected
  useEffect(() => {
    if (selectedPrescription?.qrCode && isDetailDialogOpen) {
      // Use setTimeout to ensure canvas is mounted in DOM
      setTimeout(() => {
        const canvas = qrCanvasRef.current;
        if (canvas) {
          QRCodeLib.toCanvas(
            canvas,
            selectedPrescription.qrCode,
            { width: 256, margin: 2 },
            (error) => {
              if (error) {
                console.error("QR Code generation error:", error);
              } else {
                console.log("QR code generated successfully in detail dialog");
              }
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
        } else {
          console.error("Detail dialog canvas ref not found");
        }
      }, 100);
    }
  }, [selectedPrescription, isDetailDialogOpen]);

  // Generate QR code in dialog when opened
  useEffect(() => {
    if (qrDialogPrescription?.qrCode && isQrDialogOpen) {
      // Use setTimeout to ensure canvas is mounted in DOM
      setTimeout(() => {
        const canvas = qrDialogCanvasRef.current;
        if (canvas) {
          QRCodeLib.toCanvas(
            canvas,
            qrDialogPrescription.qrCode,
            { width: 256, margin: 2 },
            (error) => {
              if (error) {
                console.error("QR Dialog generation error:", error);
              } else {
                console.log("QR code generated successfully in dialog");
              }
            }
          );
        } else {
          console.error("Canvas ref not found");
        }
      }, 100);
    }
  }, [qrDialogPrescription, isQrDialogOpen]);

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
  const isPharmacist = user.role === "pharmacist";

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

  // Check if prescription is expired and return actual status
  const getActualStatus = (prescription: Prescription) => {
    if (prescription.status === "expired") return "expired";
    if (prescription.validUntil) {
      const now = new Date();
      const expiryDate = new Date(prescription.validUntil);
      if (expiryDate < now) {
        return "expired";
      }
    }
    return prescription.status;
  };

  const openDetailDialog = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDetailDialogOpen(true);
  };

  // Filter prescriptions
  const filteredPrescriptions = prescriptions.filter((prescription) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      prescription.doctorName?.toLowerCase().includes(searchLower) ||
      prescription.doctorSpecialty?.toLowerCase().includes(searchLower) ||
      prescription.patientName?.toLowerCase().includes(searchLower) ||
      prescription.notes?.toLowerCase().includes(searchLower) ||
      prescription.items?.some((item) =>
        item.medicineName.toLowerCase().includes(searchLower)
      );

    // Status filter
    const matchesStatus =
      filterStatus === "all" ||
      prescription.status.toLowerCase() === filterStatus.toLowerCase();

    // Doctor filter (for patients)
    const matchesDoctor =
      filterDoctor === "all" || prescription.doctorName === filterDoctor;

    // Date range filter
    const prescriptionDate = new Date(prescription.issuedDate);
    const now = new Date();
    let matchesDate = true;

    if (dateRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = prescriptionDate >= weekAgo;
    } else if (dateRange === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = prescriptionDate >= monthAgo;
    } else if (dateRange === "3months") {
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      matchesDate = prescriptionDate >= threeMonthsAgo;
    } else if (dateRange === "year") {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      matchesDate = prescriptionDate >= yearAgo;
    }

    return matchesSearch && matchesStatus && matchesDoctor && matchesDate;
  });

  // Get unique doctors and statuses for filters
  const uniqueDoctors = Array.from(
    new Set(prescriptions.map((p) => p.doctorName).filter(Boolean))
  );
  const uniqueStatuses = Array.from(
    new Set(prescriptions.map((p) => p.status))
  );

  const downloadPrescriptionPDF = async (prescription: Prescription) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header with organization info
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PRESCRIPTION", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("MediVault Healthcare System", pageWidth / 2, 28, {
        align: "center",
      });
      doc.text("Digital Prescription - Verified & Secure", pageWidth / 2, 34, {
        align: "center",
      });

      // Prescription Info Box
      let yPos = 55;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos - 5, pageWidth - 30, 35, "F");

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Prescription ID:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(prescription.id, 70, yPos);

      yPos += 7;
      doc.setFont("helvetica", "bold");
      doc.text("Issue Date:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(
        format(new Date(prescription.issuedDate), "MMMM dd, yyyy"),
        70,
        yPos
      );

      yPos += 7;
      doc.setFont("helvetica", "bold");
      doc.text("Valid Until:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(
        prescription.validUntil
          ? format(new Date(prescription.validUntil), "MMMM dd, yyyy")
          : "No expiry",
        70,
        yPos
      );

      yPos += 7;
      doc.setFont("helvetica", "bold");
      doc.text("Status:", 20, yPos);
      doc.setFont("helvetica", "normal");

      // Status with color
      const statusColors: Record<string, [number, number, number]> = {
        active: [34, 197, 94],
        dispensed: [59, 130, 246],
        expired: [239, 68, 68],
        cancelled: [156, 163, 175],
      };
      const statusColor = statusColors[
        getActualStatus(prescription).toLowerCase()
      ] || [0, 0, 0];
      doc.setTextColor(...statusColor);
      doc.setFont("helvetica", "bold");
      doc.text(getActualStatus(prescription).toUpperCase(), 70, yPos);
      doc.setTextColor(0, 0, 0);

      // Patient Information
      yPos += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Information", 15, yPos);

      yPos += 8;
      doc.setFontSize(10);
      const patientInfo = [
        ["Patient Name:", user?.firstName + " " + user?.lastName || "N/A"],
        ["Health ID:", prescription.patientHealthId || "N/A"],
      ];

      patientInfo.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, 70, yPos);
        yPos += 6;
      });

      // Doctor Information
      yPos += 5;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Prescribed By", 15, yPos);

      yPos += 8;
      doc.setFontSize(10);
      const doctorInfo = [
        ["Doctor Name:", prescription.doctorName || "Unknown"],
        ["Specialty:", prescription.doctorSpecialty || "N/A"],
      ];

      doctorInfo.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, 70, yPos);
        yPos += 6;
      });

      // Medicines Table
      yPos += 8;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Prescribed Medicines", 15, yPos);
      yPos += 5;

      const medicinesData = prescription.items.map((item) => [
        item.medicineName,
        item.dosage,
        item.frequency,
        item.duration,
        item.quantity.toString(),
        item.instructions || "-",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            "Medicine",
            "Dosage",
            "Frequency",
            "Duration",
            "Qty",
            "Instructions",
          ],
        ],
        body: medicinesData,
        theme: "grid",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 15 },
          5: { cellWidth: "auto" },
        },
        margin: { left: 15, right: 15 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Notes
      if (prescription.notes) {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Doctor's Notes", 15, yPos);

        yPos += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const notesLines = doc.splitTextToSize(
          prescription.notes,
          pageWidth - 30
        );
        doc.text(notesLines, 15, yPos);
        yPos += notesLines.length * 6 + 5;
      }

      // Dispensing Information
      if (prescription.dispensedAt || prescription.scannedCount) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Dispensing Information", 15, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        if (prescription.scannedCount) {
          doc.setFont("helvetica", "bold");
          doc.text("Times Scanned:", 20, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(prescription.scannedCount.toString(), 70, yPos);
          yPos += 6;
        }

        if (prescription.lastScannedAt) {
          doc.setFont("helvetica", "bold");
          doc.text("Last Scanned:", 20, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(
            format(
              new Date(prescription.lastScannedAt),
              "MMM dd, yyyy hh:mm a"
            ),
            70,
            yPos
          );
          yPos += 6;
        }

        if (prescription.dispensedAt) {
          doc.setFont("helvetica", "bold");
          doc.text("Dispensed On:", 20, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(
            format(new Date(prescription.dispensedAt), "MMM dd, yyyy hh:mm a"),
            70,
            yPos
          );
          yPos += 6;
        }

        if (prescription.dispensedBy) {
          doc.setFont("helvetica", "bold");
          doc.text("Dispensed By:", 20, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(prescription.dispensedBy, 70, yPos);
        }
      }

      // QR Code Section - CRITICAL for pharmacist verification
      if (prescription.qrCode) {
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 20;
        } else {
          yPos += 10;
        }

        doc.setFillColor(220, 252, 231); // Light green background
        doc.rect(15, yPos - 5, pageWidth - 30, 55, "F");
        doc.setDrawColor(34, 197, 94); // Green border
        doc.setLineWidth(0.5);
        doc.rect(15, yPos - 5, pageWidth - 30, 55, "S");

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 101, 52); // Dark green
        doc.text("QR CODE FOR PHARMACY VERIFICATION", pageWidth / 2, yPos, {
          align: "center",
        });

        yPos += 7;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(21, 128, 61);
        doc.text(
          "Pharmacist: Scan this code to verify authenticity and dispense medicine",
          pageWidth / 2,
          yPos,
          { align: "center" }
        );

        // Generate QR code as image and add to PDF
        yPos += 5;
        try {
          const qrDataUrl = await QRCodeLib.toDataURL(prescription.qrCode, {
            width: 400,
            margin: 1,
          });
          const qrSize = 35;
          const qrX = (pageWidth - qrSize) / 2;
          doc.addImage(qrDataUrl, "PNG", qrX, yPos, qrSize, qrSize);

          yPos += qrSize + 3;
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text("Prescription Code:", pageWidth / 2, yPos, {
            align: "center",
          });
          yPos += 4;
          doc.setFont("courier", "normal");
          doc.text(prescription.qrCode, pageWidth / 2, yPos, {
            align: "center",
          });
        } catch (qrError) {
          console.error("Error adding QR to PDF:", qrError);
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(
            `Prescription Code: ${prescription.qrCode}`,
            pageWidth / 2,
            yPos + 10,
            { align: "center" }
          );
        }

        yPos += 10;
      }

      // Important Notice
      if (yPos > pageHeight - 35) {
        doc.addPage();
        yPos = 20;
      } else {
        yPos = pageHeight - 30;
      }

      doc.setFillColor(255, 243, 205);
      doc.rect(15, yPos - 5, pageWidth - 30, 20, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(146, 64, 14);
      doc.text("IMPORTANT:", 20, yPos);
      doc.setFont("helvetica", "normal");
      const importantText = doc.splitTextToSize(
        "This is a valid digital prescription. Please follow the prescribed dosage and consult your doctor if you experience any side effects. Do not share this prescription with others.",
        pageWidth - 40
      );
      doc.text(importantText, 20, yPos + 5);

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generated on ${format(
            new Date(),
            "MMMM dd, yyyy hh:mm a"
          )} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        doc.text(
          "This is a confidential medical document",
          pageWidth / 2,
          pageHeight - 5,
          { align: "center" }
        );
      }

      doc.save(
        `Prescription-${prescription.id}-${format(
          new Date(),
          "yyyy-MM-dd"
        )}.pdf`
      );

      toast({
        title: "PDF Downloaded",
        description: "Prescription has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isDoctor
              ? "My Issued Prescriptions"
              : isPharmacist
              ? "Scanned Prescriptions"
              : "My Prescriptions"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isDoctor
              ? "View all prescriptions you've issued to patients"
              : isPharmacist
              ? "View prescriptions you've scanned (read-only)"
              : "View all your prescriptions with complete details - read-only access"}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Pill className="h-4 w-4 mr-2" />
          {prescriptions.length} Prescriptions
        </Badge>
      </div>

      {/* Filters */}
      {prescriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search doctor, medicine, notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isDoctor && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Doctor</label>
                  <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      {uniqueDoctors.map((doctor) => (
                        <SelectItem key={doctor} value={doctor as string}>
                          {doctor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(searchTerm ||
              filterStatus !== "all" ||
              filterDoctor !== "all" ||
              dateRange !== "all") && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredPrescriptions.length} of{" "}
                  {prescriptions.length} prescriptions
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setFilterDoctor("all");
                    setDateRange("all");
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loadingPrescriptions ? (
        <Card>
          <CardContent className="p-12">
            <p className="text-center text-muted-foreground">
              Loading prescriptions...
            </p>
          </CardContent>
        </Card>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-3">
              <Pill className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg">
                No prescriptions found
              </p>
              <p className="text-sm text-muted-foreground">
                {isDoctor
                  ? "Prescriptions you issue will appear here"
                  : isPharmacist
                  ? "Prescriptions you scan will appear here"
                  : "Your prescriptions from doctors will appear here"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-3">
              <Search className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg">
                No prescriptions match your filters
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                  setFilterDoctor("all");
                  setDateRange("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Prescriptions List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {isDoctor ? (
                    <>
                      <TableHead>Patient</TableHead>
                      <TableHead>Health ID</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialty</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Medicines</TableHead>
                  {!isDoctor && !isPharmacist && <TableHead>QR Code</TableHead>}
                  {!isPharmacist && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.map((prescription) => (
                  <TableRow
                    key={prescription.id}
                    className={isPharmacist ? "cursor-pointer" : undefined}
                    onClick={() => {
                      if (isPharmacist) openDetailDialog(prescription);
                    }}
                  >
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
                      <>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            {prescription.doctorName || "Unknown Doctor"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {prescription.doctorSpecialty || "N/A"}
                          </span>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Badge
                        className={getStatusColor(
                          getActualStatus(prescription)
                        )}
                      >
                        {getActualStatus(prescription).toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            {format(
                              new Date(prescription.issuedDate),
                              "MMM dd, yyyy"
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Issued
                          </div>
                        </div>
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
                    {!isDoctor && !isPharmacist && (
                      <TableCell>
                        {prescription.qrCode ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setQrDialogPrescription(prescription);
                                setIsQrDialogOpen(true);
                              }}
                              title="View QR Code"
                            >
                              <Eye className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={async () => {
                                try {
                                  const qrDataUrl = await QRCodeLib.toDataURL(
                                    prescription.qrCode!,
                                    { width: 512, margin: 2 }
                                  );
                                  const link = document.createElement("a");
                                  link.href = qrDataUrl;
                                  link.download = `prescription-qr-${prescription.qrCode}.png`;
                                  link.click();
                                  toast({
                                    title: "QR Code Downloaded",
                                    description:
                                      "Show this to pharmacy for dispensing",
                                  });
                                } catch (error) {
                                  console.error("QR download error:", error);
                                  toast({
                                    title: "Download Failed",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              title="Download QR Code"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                              <span>No QR Code</span>
                            </div>
                            {!isPharmacist && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                disabled={generatingQrForId === prescription.id}
                                onClick={() => generateQrCode(prescription.id)}
                                title="Generate QR Code"
                              >
                                {generatingQrForId === prescription.id
                                  ? "Generating..."
                                  : "Generate"}
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                    {!isPharmacist && (
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              downloadPrescriptionPDF(prescription)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Prescription Detail Dialog - READ-ONLY */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Prescription Details (Read-Only)
            </DialogTitle>
            <DialogDescription>
              {isDoctor
                ? `Prescription for ${selectedPrescription?.patientName}`
                : `Prescribed by ${selectedPrescription?.doctorName}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-6">
              {/* Prescription Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Prescription Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Prescription ID
                    </label>
                    <p className="font-mono text-sm mt-1">
                      {selectedPrescription.id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <p className="mt-1">
                      <Badge
                        className={getStatusColor(
                          getActualStatus(selectedPrescription)
                        )}
                      >
                        {getActualStatus(selectedPrescription).toUpperCase()}
                      </Badge>
                      {getActualStatus(selectedPrescription) === "expired" &&
                        selectedPrescription.status !== "expired" && (
                          <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                            (Automatically expired)
                          </span>
                        )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Issued Date
                    </label>
                    <p className="mt-1 font-semibold text-base">
                      {format(
                        new Date(selectedPrescription.issuedDate),
                        "MMMM dd, yyyy 'at' hh:mm a"
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
                  {selectedPrescription.dispensedBy && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Dispensed By (Pharmacy)
                      </label>
                      <p className="mt-1 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {selectedPrescription.dispensedBy}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Patient/Doctor Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isDoctor ? "Patient Information" : "Doctor Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  {isDoctor ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Patient Name
                        </label>
                        <p className="font-semibold mt-1">
                          {selectedPrescription.patientName || "Unknown"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Health ID
                        </label>
                        <p className="mt-1">
                          <Badge variant="outline">
                            {selectedPrescription.patientHealthId || "N/A"}
                          </Badge>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Doctor Name
                        </label>
                        <p className="font-semibold mt-1">
                          {selectedPrescription.doctorName || "Unknown"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Specialty
                        </label>
                        <p className="mt-1">
                          {selectedPrescription.doctorSpecialty || "N/A"}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Scan Tracking Info */}
              {selectedPrescription.scannedCount !== undefined &&
                selectedPrescription.scannedCount > 0 && (
                  <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                      <CardTitle className="text-base text-blue-900 dark:text-blue-100">
                        Pharmacy Scan History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Times Scanned
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
                    </CardContent>
                  </Card>
                )}

              {/* Medicines - READ-ONLY TABLE */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Prescribed Medicines (Read-Only)
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
                        <TableHead>Instructions</TableHead>
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
                          <TableCell>
                            <Badge variant="secondary">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.instructions || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {selectedPrescription.notes && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                      <label className="text-sm font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Doctor's Notes
                      </label>
                      <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                        {selectedPrescription.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QR Code for Patients */}
              {!isDoctor && selectedPrescription.qrCode && (
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                  <CardHeader>
                    <CardTitle className="text-base text-green-900 dark:text-green-100">
                      QR Code for Pharmacy Verification
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Present this QR code to the pharmacist to dispense your
                      prescription
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-white rounded-lg border-2 border-green-300 dark:border-green-700 shadow-sm">
                      <canvas
                        ref={qrCanvasRef}
                        width={256}
                        height={256}
                        className="block"
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Prescription Code</p>
                      <p className="text-xs font-mono bg-muted px-3 py-2 rounded border">
                        {selectedPrescription.qrCode}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        The pharmacist will scan this code to verify
                        authenticity and update the dispensing status
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => downloadPrescriptionPDF(selectedPrescription)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download as PDF
                </Button>
                {!isDoctor && selectedPrescription.qrCode && qrCodeUrl && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = qrCodeUrl;
                      link.download = `prescription-qr-${selectedPrescription.qrCode}.png`;
                      link.click();
                      toast({
                        title: "QR Code Downloaded",
                        description:
                          "Show this to the pharmacy to dispense your prescription",
                      });
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Download QR
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  Close
                </Button>
              </div>

              {/* Read-Only Notice */}
              <div className="p-3 bg-muted rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">
                  This is a read-only view. Patients cannot modify prescription
                  details.
                  {!isDoctor && " All changes must be made by your doctor."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Popup Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-600" />
              Prescription QR Code
            </DialogTitle>
            <DialogDescription>
              Show this QR code to the pharmacist for verification and
              dispensing
            </DialogDescription>
          </DialogHeader>

          {qrDialogPrescription && (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="flex flex-col items-center gap-4 p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-300 dark:border-green-700">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <canvas
                    ref={qrDialogCanvasRef}
                    width={256}
                    height={256}
                    className="block"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Prescription Code
                  </p>
                  <p className="text-xs font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                    {qrDialogPrescription.qrCode}
                  </p>
                </div>
              </div>

              {/* Prescription Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor:</span>
                  <span className="font-medium">
                    {qrDialogPrescription.doctorName || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued:</span>
                  <span className="font-medium">
                    {format(
                      new Date(qrDialogPrescription.issuedDate),
                      "MMM dd, yyyy"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    className={getStatusColor(
                      getActualStatus(qrDialogPrescription)
                    )}
                  >
                    {getActualStatus(qrDialogPrescription).toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Medicines:</span>
                  <span className="font-medium">
                    {qrDialogPrescription.items?.length || 0} items
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const qrDataUrl = await QRCodeLib.toDataURL(
                        qrDialogPrescription.qrCode!,
                        { width: 512, margin: 2 }
                      );
                      const link = document.createElement("a");
                      link.href = qrDataUrl;
                      link.download = `prescription-qr-${qrDialogPrescription.qrCode}.png`;
                      link.click();
                      toast({
                        title: "QR Code Downloaded",
                        description: "Show this to pharmacy for dispensing",
                      });
                    } catch (error) {
                      console.error("QR download error:", error);
                      toast({
                        title: "Download Failed",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsQrDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
