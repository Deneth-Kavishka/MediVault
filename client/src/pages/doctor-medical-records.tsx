import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [recordType, setRecordType] = useState<RecordType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

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

  // Filter data based on search and status
  const filteredMedicalRecords = medicalRecords.filter((record) => {
    const matchesSearch =
      searchQuery === "" ||
      record.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.patientHealthId
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      record.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredLabTests = labTests.filter((test) => {
    const matchesSearch =
      searchQuery === "" ||
      test.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.patientHealthId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.testName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || test.status === statusFilter;
    return matchesSearch && matchesStatus;
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
    return matchesSearch && matchesStatus;
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.patientHealthId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
        <Badge variant="outline" className="text-lg px-4 py-2">
          <FileText className="h-4 w-4 mr-2" />
          {getTotalCount()} Total Records
        </Badge>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-4">
              {/* Medical Records */}
              {filteredMedicalRecords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Medical Records ({filteredMedicalRecords.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                        {filteredMedicalRecords.slice(0, 5).map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {record.patientName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.patientHealthId}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.diagnosis}</TableCell>
                            <TableCell>
                              {new Date(record.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
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
                  </CardContent>
                </Card>
              )}

              {/* Lab Tests */}
              {filteredLabTests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FlaskConical className="h-5 w-5" />
                      Lab Tests ({filteredLabTests.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Test Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Request Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLabTests.slice(0, 5).map((test) => (
                          <TableRow key={test.id}>
                            <TableCell className="font-medium">
                              {test.patientName}
                            </TableCell>
                            <TableCell>{test.testName}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(test.status)}>
                                {test.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(test.requestDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  openDetailDialog(test, "lab_test")
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
              )}

              {/* Prescriptions */}
              {filteredPrescriptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5" />
                      Prescriptions ({filteredPrescriptions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issued Date</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPrescriptions
                          .slice(0, 5)
                          .map((prescription) => (
                            <TableRow key={prescription.id}>
                              <TableCell className="font-medium">
                                {prescription.patientName}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getStatusColor(
                                    prescription.status
                                  )}
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
                                {prescription.items?.length || 0} items
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    openDetailDialog(
                                      prescription,
                                      "prescription"
                                    )
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
              )}
            </div>
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
                      <TableHead>Symptoms</TableHead>
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
                        <TableCell className="max-w-xs truncate">
                          {record.symptoms || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(record.createdAt).toLocaleDateString()}
                          </div>
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
              <CardTitle>Medical Documents</CardTitle>
              <CardDescription>
                All medical documents you've uploaded
              </CardDescription>
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
                                href={doc.fileUrl}
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
