import { useEffect, useState, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  FlaskConical,
  Download,
  Calendar,
  Eye,
  AlertCircle,
  Search,
  Filter,
  MapPin,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LabFacility {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  latitude?: string;
  longitude?: string;
  labTechnicianUserId?: string;
}

interface LabTest {
  id: string;
  patientId?: string;
  patientName?: string;
  patientHealthId?: string;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialization?: string;
  labFacilityId?: string;
  labFacilityName?: string;
  labFacilityAddress?: string;
  labFacilityCity?: string;
  labFacilityLatitude?: string | null;
  labFacilityLongitude?: string | null;
  labFacilityPhone?: string | null;
  labFacilityEmail?: string | null;
  labTechnicianUserId?: string | null;
  labTechnicianName?: string;
  testType: string;
  testName: string;
  status: string;
  urgency: string;
  requestDate: string;
  approvedDate?: string;
  sampleCollectionDate?: string;
  testStartDate?: string;
  completionDate?: string;
  results?: string;
  resultFileUrl?: string;
  isAbnormal: boolean;
  notes?: string;
  technicianNotes?: string;
}

interface LabTestReport {
  id: string;
  fileName?: string | null;
  fileMime?: string | null;
  fileSize?: number | null;
  createdAt?: string;
  viewUrl: string;
  downloadUrl: string;
}

export default function LabResults() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSelectLabDialogOpen, setIsSelectLabDialogOpen] = useState(false);
  const [selectedLabFacilityId, setSelectedLabFacilityId] =
    useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [abnormalFilter, setAbnormalFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: labTests = [], isLoading: loadingTests } = useQuery<LabTest[]>({
    queryKey: ["/api/lab-tests/patient"],
    enabled: isAuthenticated && !!user && user.role === "patient",
  });

  const { data: reportFiles = [] } = useQuery<LabTestReport[]>({
    queryKey: [
      selectedTest?.id ? `/api/lab-tests/${selectedTest.id}/reports` : "",
    ],
    enabled:
      isDetailDialogOpen &&
      !!selectedTest?.id &&
      selectedTest.status === "completed",
  });

  const { data: labFacilities = [] } = useQuery<LabFacility[]>({
    queryKey: ["/api/lab-facilities/available"],
    enabled: isAuthenticated && !!user && user.role === "patient",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to view your lab results.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated || !user || user.role !== "patient") {
    return null;
  }

  // Filter lab tests
  const filteredTests = labTests.filter((test) => {
    const matchesStatus =
      statusFilter === "all" || test.status === statusFilter;
    const matchesUrgency =
      urgencyFilter === "all" || test.urgency === urgencyFilter;
    const matchesAbnormal =
      abnormalFilter === "all" ||
      (abnormalFilter === "abnormal" && test.isAbnormal) ||
      (abnormalFilter === "normal" && !test.isAbnormal);
    const matchesSearch =
      searchQuery === "" ||
      test.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.testType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (test.doctorName &&
        test.doctorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (test.labFacilityName &&
        test.labFacilityName.toLowerCase().includes(searchQuery.toLowerCase()));

    const testDate = new Date(test.requestDate);
    const matchesDateFrom = !dateFrom || testDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || testDate <= new Date(dateTo);

    return (
      matchesStatus &&
      matchesUrgency &&
      matchesAbnormal &&
      matchesSearch &&
      matchesDateFrom &&
      matchesDateTo
    );
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "approved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "normal":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "routine":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const openDetailDialog = (test: LabTest) => {
    setSelectedTest(test);
    setIsDetailDialogOpen(true);
  };

  const getStatusCounts = () => {
    return {
      all: labTests.length,
      pending: labTests.filter((t) => t.status === "pending").length,
      approved: labTests.filter((t) => t.status === "approved").length,
      in_progress: labTests.filter((t) => t.status === "in_progress").length,
      completed: labTests.filter((t) => t.status === "completed").length,
      abnormal: labTests.filter((t) => t.isAbnormal).length,
      urgent: labTests.filter((t) => t.urgency === "urgent").length,
    };
  };

  const counts = getStatusCounts();

  const downloadPDF = (test: LabTest) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("MediVault", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Laboratory Test Report", pageWidth / 2, 32, { align: "center" });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    let yPos = 55;

    // Test Information
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Test Information", 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const testInfo = [
      ["Test Name:", test.testName],
      ["Test Type:", test.testType],
      ["Status:", test.status.toUpperCase()],
      ["Urgency:", test.urgency.toUpperCase()],
      ["Request Date:", format(new Date(test.requestDate), "MMMM dd, yyyy")],
    ];

    if (test.approvedDate) {
      testInfo.push([
        "Approved Date:",
        format(new Date(test.approvedDate), "MMMM dd, yyyy"),
      ]);
    }
    if (test.sampleCollectionDate) {
      testInfo.push([
        "Sample Collection:",
        format(new Date(test.sampleCollectionDate), "MMMM dd, yyyy"),
      ]);
    }
    if (test.testStartDate) {
      testInfo.push([
        "Test Started:",
        format(new Date(test.testStartDate), "MMMM dd, yyyy"),
      ]);
    }
    if (test.completionDate) {
      testInfo.push([
        "Completed Date:",
        format(new Date(test.completionDate), "MMMM dd, yyyy"),
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      body: testInfo,
      theme: "plain",
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: 120 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Doctor Information
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Prescribed By", 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const doctorInfo = [
      ["Doctor:", test.doctorName || "N/A"],
      ["Specialization:", test.doctorSpecialization || "N/A"],
    ];

    autoTable(doc, {
      startY: yPos,
      body: doctorInfo,
      theme: "plain",
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: 120 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Lab Facility Information
    if (test.labFacilityName) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Laboratory Facility", 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const labInfo = [
        ["Lab Name:", test.labFacilityName],
        ["Address:", test.labFacilityAddress || "N/A"],
        ["City:", test.labFacilityCity || "N/A"],
      ];

      if (test.labTechnicianName) {
        labInfo.push(["Technician:", test.labTechnicianName]);
      }

      autoTable(doc, {
        startY: yPos,
        body: labInfo,
        theme: "plain",
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 50 },
          1: { cellWidth: 120 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Results
    if (test.results || test.status === "completed") {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Test Results", 14, yPos);
      yPos += 10;

      if (test.isAbnormal) {
        doc.setFillColor(254, 226, 226);
        doc.rect(14, yPos - 5, pageWidth - 28, 15, "F");
        doc.setTextColor(220, 38, 38);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("ABNORMAL RESULTS DETECTED", 18, yPos + 5);
        doc.setTextColor(0, 0, 0);
        yPos += 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      if (test.results) {
        const splitResults = doc.splitTextToSize(test.results, pageWidth - 28);
        doc.text(splitResults, 14, yPos);
        yPos += splitResults.length * 5 + 10;
      } else if (test.status === "completed" && !test.results) {
        doc.text(
          "Results are ready. Please check with the laboratory.",
          14,
          yPos
        );
        yPos += 10;
      }
    }

    // Notes
    if (test.notes) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Doctor's Notes", 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(test.notes, pageWidth - 28);
      doc.text(splitNotes, 14, yPos);
      yPos += splitNotes.length * 5 + 10;
    }

    if (test.technicianNotes) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Technician's Notes", 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const splitTechNotes = doc.splitTextToSize(
        test.technicianNotes,
        pageWidth - 28
      );
      doc.text(splitTechNotes, 14, yPos);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 30,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    // Save PDF
    const fileName = `Lab_Test_${test.testName.replace(/\s+/g, "_")}_${format(
      new Date(test.requestDate),
      "yyyy-MM-dd"
    )}.pdf`;
    doc.save(fileName);

    toast({
      title: "Success",
      description: "Lab test report downloaded successfully!",
    });
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setUrgencyFilter("all");
    setAbnormalFilter("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const openSelectLabDialog = (test: LabTest) => {
    setSelectedTest(test);
    setSelectedLabFacilityId(test.labFacilityId || "");
    setIsSelectLabDialogOpen(true);
  };

  const handleSelectLab = async () => {
    if (!selectedTest || !selectedLabFacilityId) {
      toast({
        title: "Error",
        description: "Please select a lab facility",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/lab-tests/${selectedTest.id}/select-lab`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ labFacilityId: selectedLabFacilityId }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Failed to select lab");
      }

      toast({
        title: "Success",
        description: "Lab facility selected! The lab will review your request.",
      });

      setIsSelectLabDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error selecting lab:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to select lab facility",
        variant: "destructive",
      });
    }
  };

  const openDirections = (facility: {
    address?: string;
    city?: string;
    latitude?: string;
    longitude?: string;
  }) => {
    const lat = facility.latitude?.trim();
    const lng = facility.longitude?.trim();
    const hasCoords = !!lat && !!lng;

    const destination = hasCoords
      ? `${lat},${lng}`
      : encodeURIComponent(
          `${facility.address || ""}${
            facility.city ? `, ${facility.city}` : ""
          }`.trim()
        );

    const url = hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          destination
        )}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const contactLab = (labTechnicianUserId?: string) => {
    if (!labTechnicianUserId) {
      toast({
        title: "Unavailable",
        description: "This lab does not have a technician contact yet.",
        variant: "destructive",
      });
      return;
    }

    window.location.href = `/messages?userId=${encodeURIComponent(
      labTechnicianUserId
    )}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Lab Results</h1>
          <p className="text-muted-foreground mt-1">
            View all your lab tests, find matching labs, and download reports
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <FlaskConical className="h-4 w-4 mr-2" />
          {labTests.length} Total Tests
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.all}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {counts.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {counts.approved}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {counts.in_progress}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {counts.completed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abnormal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              {counts.abnormal}
              {counts.abnormal > 0 && <AlertCircle className="h-5 w-5" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Urgent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {counts.urgent}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Urgency Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Urgency</label>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency Levels</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Abnormal Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Results</label>
              <Select value={abnormalFilter} onValueChange={setAbnormalFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="abnormal">Abnormal Only</SelectItem>
                  <SelectItem value="normal">Normal Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by test name, doctor, lab..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lab Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Test Results</CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing {filteredTests.length} of {labTests.length} tests
          </p>
        </CardHeader>
        <CardContent>
          {loadingTests ? (
            <p className="text-center py-8 text-muted-foreground">
              Loading lab tests...
            </p>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-12">
              <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {labTests.length === 0
                  ? "No lab tests found"
                  : "No tests match your filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Lab Facility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{test.testName}</span>
                          <Badge variant="secondary" className="w-fit mt-1">
                            {test.testType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {test.doctorName || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {test.labFacilityName ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {test.labFacilityName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {test.labFacilityCity}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Not assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(test.status)}>
                            {test.status.replace("_", " ")}
                          </Badge>
                          {test.isAbnormal && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getUrgencyColor(test.urgency)}>
                          {test.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(test.requestDate), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {test.completionDate ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            {format(
                              new Date(test.completionDate),
                              "MMM dd, yyyy"
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Pending
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {test.status === "pending" && !test.labFacilityId && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openSelectLabDialog(test)}
                            >
                              <Building2 className="h-4 w-4 mr-1" />
                              Select Lab
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailDialog(test)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadPDF(test)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Lab Facilities */}
      {labFacilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Available Lab Facilities
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Find matching labs for your tests
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {labFacilities.slice(0, 6).map((facility) => (
                <Card key={facility.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {facility.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {facility.address}, {facility.city}
                      </span>
                    </div>
                    {facility.phone && (
                      <div className="text-sm text-muted-foreground">
                        Phone: {facility.phone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Test Details</DialogTitle>
            <DialogDescription>
              Complete information about your lab test
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-4">
              {/* Test Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Test Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Test Name
                      </label>
                      <p className="mt-1 font-semibold">
                        {selectedTest.testName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Test Type
                      </label>
                      <p className="mt-1">
                        <Badge variant="secondary">
                          {selectedTest.testType}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Status
                      </label>
                      <p className="mt-1">
                        <Badge className={getStatusColor(selectedTest.status)}>
                          {selectedTest.status.replace("_", " ")}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Urgency Level
                      </label>
                      <p className="mt-1">
                        <Badge
                          className={getUrgencyColor(selectedTest.urgency)}
                        >
                          {selectedTest.urgency}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Results Status
                      </label>
                      <p className="mt-1">
                        {selectedTest.isAbnormal ? (
                          <Badge
                            variant="destructive"
                            className="flex items-center gap-1 w-fit"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Abnormal - Requires Attention
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 w-fit"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Normal
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>

                  {selectedTest.isAbnormal && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Abnormal Results Detected:</strong> This test
                        has shown abnormal values. Please consult with your
                        doctor for proper interpretation and next steps.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Test Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Test Requested</p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(selectedTest.requestDate),
                            "MMMM dd, yyyy 'at' HH:mm"
                          )}
                        </p>
                      </div>
                    </div>
                    {selectedTest.approvedDate && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Approved by Lab</p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(selectedTest.approvedDate),
                              "MMMM dd, yyyy 'at' HH:mm"
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedTest.sampleCollectionDate && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Sample Collected
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(selectedTest.sampleCollectionDate),
                              "MMMM dd, yyyy 'at' HH:mm"
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedTest.testStartDate && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Testing Started</p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(selectedTest.testStartDate),
                              "MMMM dd, yyyy 'at' HH:mm"
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedTest.completionDate && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Results Ready</p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(selectedTest.completionDate),
                              "MMMM dd, yyyy 'at' HH:mm"
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Doctor Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Prescribed By</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Doctor Name
                    </label>
                    <p className="font-semibold">
                      {selectedTest.doctorName || "Unknown"}
                    </p>
                  </div>
                  {selectedTest.doctorSpecialization && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Specialization
                      </label>
                      <p>{selectedTest.doctorSpecialization}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lab Facility Information */}
              {selectedTest.labFacilityName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Laboratory Facility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Lab Name
                      </label>
                      <p className="font-semibold">
                        {selectedTest.labFacilityName}
                      </p>
                    </div>
                    {selectedTest.labFacilityAddress && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Address
                        </label>
                        <p>
                          {selectedTest.labFacilityAddress},{" "}
                          {selectedTest.labFacilityCity}
                        </p>
                      </div>
                    )}

                    {(() => {
                      const facility = selectedTest.labFacilityId
                        ? labFacilities.find(
                            (f) => f.id === selectedTest.labFacilityId
                          )
                        : undefined;
                      const phone =
                        facility?.phone ||
                        selectedTest.labFacilityPhone ||
                        undefined;

                      return phone ? (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Phone
                          </label>
                          <p>{phone}</p>
                        </div>
                      ) : null;
                    })()}

                    {(() => {
                      const facility = selectedTest.labFacilityId
                        ? labFacilities.find(
                            (f) => f.id === selectedTest.labFacilityId
                          )
                        : undefined;
                      const email =
                        facility?.email ||
                        selectedTest.labFacilityEmail ||
                        undefined;

                      return email ? (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Email
                          </label>
                          <p>{email}</p>
                        </div>
                      ) : null;
                    })()}
                    {selectedTest.labTechnicianName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Lab Technician
                        </label>
                        <p>{selectedTest.labTechnicianName}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const facility = selectedTest.labFacilityId
                            ? labFacilities.find(
                                (f) => f.id === selectedTest.labFacilityId
                              )
                            : undefined;
                          openDirections(
                            facility || {
                              address: selectedTest.labFacilityAddress,
                              city: selectedTest.labFacilityCity,
                              latitude:
                                selectedTest.labFacilityLatitude || undefined,
                              longitude:
                                selectedTest.labFacilityLongitude || undefined,
                            }
                          );
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Directions
                      </Button>

                      <Button
                        type="button"
                        variant="default"
                        className="flex-1"
                        onClick={() => {
                          contactLab(
                            selectedTest.labTechnicianUserId ||
                              (selectedTest.labFacilityId
                                ? labFacilities.find(
                                    (f) => f.id === selectedTest.labFacilityId
                                  )?.labTechnicianUserId
                                : undefined)
                          );
                        }}
                        disabled={
                          !(
                            selectedTest.labTechnicianUserId ||
                            (selectedTest.labFacilityId
                              ? labFacilities.find(
                                  (f) => f.id === selectedTest.labFacilityId
                                )?.labTechnicianUserId
                              : undefined)
                          )
                        }
                      >
                        <User className="h-4 w-4 mr-2" />
                        Contact Lab
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Results */}
              {selectedTest.results && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="whitespace-pre-wrap">
                        {selectedTest.results}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Doctor's Notes */}
              {selectedTest.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Doctor's Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="whitespace-pre-wrap">
                        {selectedTest.notes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Technician's Notes */}
              {selectedTest.technicianNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Lab Technician's Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="whitespace-pre-wrap">
                        {selectedTest.technicianNotes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => downloadPDF(selectedTest)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Lab Test Details
                </Button>

                {reportFiles.length > 0 ? (
                  <div className="space-y-2">
                    {reportFiles.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 rounded-md border p-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            {r.fileName || "Report file"}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={r.viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          </Button>
                          <Button size="sm" variant="default" asChild>
                            <a
                              href={r.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                            >
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedTest.resultFileUrl ? (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <a
                        href={selectedTest.resultFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View
                      </a>
                    </Button>
                    <Button variant="default" className="flex-1" asChild>
                      <a
                        href={`${selectedTest.resultFileUrl}?download=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Select Lab Facility Dialog */}
      <Dialog
        open={isSelectLabDialogOpen}
        onOpenChange={setIsSelectLabDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Lab Facility</DialogTitle>
            <DialogDescription>
              Choose a lab facility to conduct your test:{" "}
              {selectedTest?.testName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                Select a convenient lab facility. The lab technician will review
                and approve your request with an appointment time.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Choose Lab Facility</label>
              <Select
                value={selectedLabFacilityId}
                onValueChange={setSelectedLabFacilityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lab facility..." />
                </SelectTrigger>
                <SelectContent>
                  {labFacilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{facility.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {facility.address}, {facility.city}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLabFacilityId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Selected Lab Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const facility = labFacilities.find(
                      (f) => f.id === selectedLabFacilityId
                    );
                    return facility ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Name
                          </label>
                          <p className="font-semibold">{facility.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Address
                          </label>
                          <p>
                            {facility.address}, {facility.city}
                          </p>
                        </div>
                        {facility.phone && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Phone
                            </label>
                            <p>{facility.phone}</p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => openDirections(facility)}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            Directions
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            className="flex-1"
                            onClick={() =>
                              contactLab(facility.labTechnicianUserId)
                            }
                            disabled={!facility.labTechnicianUserId}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Contact Lab
                          </Button>
                        </div>
                      </>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsSelectLabDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleSelectLab}
                disabled={!selectedLabFacilityId}
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
