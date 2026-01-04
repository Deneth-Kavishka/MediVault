import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Activity,
  Stethoscope,
  ClipboardList,
  Search,
  Filter,
  X,
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadMyMedicalDocumentDialog from "@/components/upload-my-medical-document-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MedicalRecord {
  id: string;
  patientId: string;
  patientName?: string;
  patientHealthId?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  appointmentId?: string;
  diagnosis: string;
  symptoms?: string;
  notes?: string;
  vitalSigns?: string;
  createdAt: string;
  updatedAt?: string;
}

interface PatientProfile {
  id: string;
  userId: string;
  nic?: string;
  healthId?: string;
}

interface MedicalDocument {
  id: string;
  patientId: string;
  doctorId?: string | null;
  appointmentId?: string | null;
  medicalRecordId?: string | null;
  documentType: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number | null;
  uploadedBy: string;
  uploadedByRole: string;
  isPublic?: boolean | null;
  createdAt: string;
  updatedAt?: string;
}

export default function MedicalRecords() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(
    null
  );
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDoctor, setFilterDoctor] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: medicalRecords = [], isLoading: loadingRecords } = useQuery<
    MedicalRecord[]
  >({
    queryKey: ["/api/medical-records"],
    enabled: isAuthenticated && !!user && user.role === "patient",
  });

  const { data: patientProfile } = useQuery<PatientProfile | null>({
    queryKey: ["/api/patients/me"],
    enabled: isAuthenticated && !!user && user.role === "patient",
    retry: false,
  });

  const patientDocumentsUrl = patientProfile?.id
    ? `/api/medical-documents/patient/${patientProfile.id}`
    : null;

  const { data: patientDocumentsRaw = [], isLoading: loadingDocuments } =
    useQuery<MedicalDocument[]>({
      queryKey: [patientDocumentsUrl || ""],
      enabled:
        isAuthenticated &&
        !!user &&
        user.role === "patient" &&
        !!patientDocumentsUrl,
      retry: false,
    });

  const patientDocuments = patientDocumentsRaw || [];

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

  const parseVitalSigns = (vitalSignsStr?: string) => {
    if (!vitalSignsStr) return null;
    try {
      return JSON.parse(vitalSignsStr);
    } catch {
      return null;
    }
  };

  const openDetailDialog = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setIsDetailDialogOpen(true);
  };

  const parseDateInput = (value: string): Date | null => {
    const v = String(value || "").trim();
    if (!v) return null;
    const [y, m, d] = v.split("-").map((n) => Number(n));
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  // Filter medical records
  const filteredRecords = [...medicalRecords]
    .filter((record) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        record.diagnosis.toLowerCase().includes(searchLower) ||
        record.symptoms?.toLowerCase().includes(searchLower) ||
        record.doctorName?.toLowerCase().includes(searchLower) ||
        record.doctorSpecialty?.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower);

      // Doctor filter
      const matchesDoctor =
        filterDoctor === "all" || record.doctorName === filterDoctor;

      // Date range filter (From/To)
      const recordDate = new Date(record.createdAt);
      const from = parseDateInput(dateFrom);
      const to = parseDateInput(dateTo);

      let matchesDate = true;
      if (from) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && recordDate >= start;
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && recordDate <= end;
      }

      return matchesSearch && matchesDoctor && matchesDate;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  // Get unique doctors for filter
  const uniqueDoctors = Array.from(
    new Set(medicalRecords.map((r) => r.doctorName).filter(Boolean))
  );

  const downloadRecordPDF = async (record: MedicalRecord) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header with organization info
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 35, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Medical Record", pageWidth / 2, 15, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("MediVault Healthcare System", pageWidth / 2, 25, {
        align: "center",
      });

      // Patient Information
      let yPos = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Information", 15, yPos);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const patientInfo = [
        ["Patient Name:", user.firstName + " " + user.lastName],
        ["Record ID:", record.id],
        ["Date:", format(new Date(record.createdAt), "MMMM dd, yyyy, hh:mm a")],
      ];

      patientInfo.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 15, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, 70, yPos);
        yPos += 6;
      });

      // Doctor Information
      yPos += 5;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Doctor Information", 15, yPos);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const doctorInfo = [
        ["Doctor Name:", record.doctorName || "N/A"],
        ["Specialty:", record.doctorSpecialty || "N/A"],
      ];

      doctorInfo.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 15, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, 70, yPos);
        yPos += 6;
      });

      // Diagnosis
      yPos += 5;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Diagnosis", 15, yPos);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const diagnosisLines = doc.splitTextToSize(
        record.diagnosis,
        pageWidth - 30
      );
      doc.text(diagnosisLines, 15, yPos);
      yPos += diagnosisLines.length * 6 + 5;

      // Symptoms
      if (record.symptoms) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Symptoms", 15, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const symptomsLines = doc.splitTextToSize(
          record.symptoms,
          pageWidth - 30
        );
        doc.text(symptomsLines, 15, yPos);
        yPos += symptomsLines.length * 6 + 5;
      }

      // Vital Signs
      const vitalSigns = parseVitalSigns(record.vitalSigns);
      if (vitalSigns && Object.keys(vitalSigns).length > 0) {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Vital Signs", 15, yPos);
        yPos += 8;

        const vitalSignsData = Object.entries(vitalSigns).map(
          ([key, value]) => [
            key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase()),
            String(value),
          ]
        );

        autoTable(doc, {
          startY: yPos,
          head: [["Parameter", "Value"]],
          body: vitalSignsData,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
          margin: { left: 15, right: 15 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Notes
      if (record.notes) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Clinical Notes", 15, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const notesLines = doc.splitTextToSize(record.notes, pageWidth - 30);
        doc.text(notesLines, 15, yPos);
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generated on ${format(
            new Date(),
            "MMMM dd, yyyy"
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
        `Medical-Record-${record.id}-${format(new Date(), "yyyy-MM-dd")}.pdf`
      );

      toast({
        title: "PDF Downloaded",
        description: "Medical record has been downloaded successfully",
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Medical Records
          </h1>
          <p className="text-muted-foreground mt-1">
            Your complete medical history and consultation records
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <FileText className="w-4 h-4 mr-2" />
          {medicalRecords.length} Records
        </Badge>
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="documents">Medical Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          {/* Filters */}
          {medicalRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search diagnosis, symptoms, doctor..."
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
                    <label className="text-sm font-medium">Doctor</label>
                    <Select
                      value={filterDoctor}
                      onValueChange={setFilterDoctor}
                    >
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {(searchTerm ||
                  filterDoctor !== "all" ||
                  dateFrom ||
                  dateTo) && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredRecords.length} of{" "}
                      {medicalRecords.length} records
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterDoctor("all");
                        setDateFrom("");
                        setDateTo("");
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

          {loadingRecords ? (
            <Card>
              <CardContent className="p-12">
                <p className="text-center text-muted-foreground">
                  Loading medical records...
                </p>
              </CardContent>
            </Card>
          ) : medicalRecords.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center space-y-3">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-lg">
                    No medical records found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your medical records will appear here after consultations
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center space-y-3">
                  <Search className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-lg">
                    No records match your filters
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search criteria
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterDoctor("all");
                      setDateFrom("");
                      setDateTo("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                const vitalSigns = parseVitalSigns(record.vitalSigns);

                return (
                  <Card
                    key={record.id}
                    className="hover-elevate transition-all duration-200"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-xl">
                                {record.diagnosis}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <Stethoscope className="w-4 h-4" />
                                {record.doctorName || "Unknown Doctor"}
                                {record.doctorSpecialty &&
                                  ` - ${record.doctorSpecialty}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(
                                new Date(record.createdAt),
                                "MMMM dd, yyyy 'at' hh:mm a"
                              )}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Record #{record.id.slice(0, 8)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Separator />

                      {record.symptoms && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" />
                            Symptoms
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {record.symptoms}
                          </p>
                        </div>
                      )}

                      {vitalSigns && Object.keys(vitalSigns).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Vital Signs
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(vitalSigns).map(([key, value]) => (
                              <div
                                key={key}
                                className="p-3 rounded-lg bg-muted/50"
                              >
                                <p className="text-xs text-muted-foreground mb-1">
                                  {key
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (str) => str.toUpperCase())}
                                </p>
                                <p className="text-sm font-medium text-foreground">
                                  {String(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.notes && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">
                            Clinical Notes
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {record.notes}
                          </p>
                        </div>
                      )}

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailDialog(record)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Record
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadRecordPDF(record)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Medical Documents
                  </CardTitle>
                  <CardDescription>
                    Doctor uploads and your history uploads
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <UploadMyMedicalDocumentDialog
                    patientId={patientProfile?.id}
                    patientDocumentsUrl={patientDocumentsUrl}
                    disabled={!patientProfile?.id}
                  />
                  <Badge variant="secondary">{patientDocuments.length} Document(s)</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocuments ? (
                <p className="text-center py-6 text-muted-foreground">
                  Loading documents...
                </p>
              ) : patientDocuments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No medical documents yet
                </div>
              ) : (
                <div className="space-y-3">
                  {patientDocuments
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .slice(0, 10)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border rounded-lg bg-muted/20"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{doc.documentType}</Badge>
                            <p className="font-semibold truncate">
                              {doc.title}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {doc.fileName}
                            {doc.fileType
                              ? ` • ${doc.fileType.toUpperCase()}`
                              : ""}
                            {doc.createdAt
                              ? ` • ${format(
                                  new Date(doc.createdAt),
                                  "MMMM dd, yyyy"
                                )}`
                              : ""}
                          </p>
                          {doc.description ? (
                            <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap">
                              {doc.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex gap-2 md:justify-end">
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={`/api/medical-documents/${doc.id}/file`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={`/api/medical-documents/${doc.id}/file?download=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}

                  {patientDocuments.length > 10 ? (
                    <p className="text-sm text-muted-foreground text-center pt-1">
                      Showing latest 10 documents
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Complete Medical Record
            </DialogTitle>
            <DialogDescription>
              Full details of your medical consultation and diagnosis
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              {/* Record Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Record Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Record ID
                    </label>
                    <p className="font-mono text-sm">{selectedRecord.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Date & Time
                    </label>
                    <p>
                      {format(
                        new Date(selectedRecord.createdAt),
                        "MMMM dd, yyyy 'at' hh:mm a"
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Doctor
                    </label>
                    <p className="font-semibold">
                      {selectedRecord.doctorName || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Specialty
                    </label>
                    <p>{selectedRecord.doctorSpecialty || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnosis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Diagnosis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base">{selectedRecord.diagnosis}</p>
                </CardContent>
              </Card>

              {/* Symptoms */}
              {selectedRecord.symptoms && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Symptoms Reported
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{selectedRecord.symptoms}</p>
                  </CardContent>
                </Card>
              )}

              {/* Vital Signs */}
              {(() => {
                const vitalSigns = parseVitalSigns(selectedRecord.vitalSigns);
                return vitalSigns && Object.keys(vitalSigns).length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Vital Signs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {Object.entries(vitalSigns).map(([key, value]) => (
                          <div
                            key={key}
                            className="p-4 rounded-lg bg-muted/50 border"
                          >
                            <p className="text-sm text-muted-foreground mb-1">
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())}
                            </p>
                            <p className="text-lg font-semibold">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              {/* Clinical Notes */}
              {selectedRecord.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Clinical Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">
                      {selectedRecord.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => downloadRecordPDF(selectedRecord)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download as PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailDialogOpen(false)}
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
