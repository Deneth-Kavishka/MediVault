import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  FlaskConical,
  Download,
  User,
  Calendar,
  Eye,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LabTest {
  id: string;
  patientId?: string;
  patientName?: string;
  patientHealthId?: string;
  doctorId?: string;
  doctorName?: string;
  testType: string;
  testName: string;
  status: string;
  requestDate: string;
  completionDate?: string;
  testStartDate?: string;
  approvedDate?: string;
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

export default function LabTests() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [completeResults, setCompleteResults] = useState("");
  const [completeTechnicianNotes, setCompleteTechnicianNotes] = useState("");
  const [completeIsAbnormal, setCompleteIsAbnormal] = useState(false);
  const [completeFiles, setCompleteFiles] = useState<File[]>([]);
  const completeFileInputRef = useRef<HTMLInputElement | null>(null);

  const isDoctor = user?.role === "doctor";
  const isLabTech = user?.role === "lab_technician";

  // Determine which endpoint to use based on role
  const endpoint = useMemo(() => {
    if (isDoctor) return "/api/lab-tests/doctor/mine";
    if (isLabTech) return "/api/lab-tests/technician";
    return "/api/lab-tests";
  }, [isDoctor, isLabTech]);

  const { data: labTests = [], isLoading: loadingTests } = useQuery<LabTest[]>({
    queryKey: [endpoint],
    enabled: isAuthenticated && !!user,
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

  const pageTitle = isLabTech
    ? "Lab Tests - Processing"
    : isDoctor
    ? "Lab Tests - My Requests"
    : "My Lab Tests";

  const pageDescription = isLabTech
    ? "Start approved tests, upload results, and complete reports"
    : isDoctor
    ? "View and track all lab tests you've requested"
    : "View your lab test results and reports";

  // Filter lab tests
  const filteredTests = labTests.filter((test) => {
    const matchesStatus =
      statusFilter === "all" || test.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      (test.patientName &&
        test.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (test.patientHealthId &&
        test.patientHealthId
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (test.doctorName &&
        test.doctorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      test.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.testType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "approved":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
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
    };
  };

  const counts = getStatusCounts();

  const startTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/lab-tests/${testId}/start`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Failed to start test");
      }

      return response.json().catch(() => null);
    },
    onSuccess: () => {
      toast({ title: "Started", description: "Test moved to In Progress" });
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeTestMutation = useMutation({
    mutationFn: async (payload: {
      testId: string;
      results: string;
      technicianNotes?: string;
      isAbnormal: boolean;
      files: File[];
    }) => {
      const form = new FormData();
      for (const file of payload.files) {
        form.append("files", file);
      }
      form.append("results", payload.results);
      form.append("isAbnormal", payload.isAbnormal ? "true" : "false");
      if (payload.technicianNotes) {
        form.append("technicianNotes", payload.technicianNotes);
      }

      const response = await fetch(
        `/api/lab-tests/${payload.testId}/complete`,
        {
          method: "POST",
          credentials: "include",
          body: form,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Failed to complete test");
      }

      return response.json().catch(() => null);
    },
    onSuccess: () => {
      toast({
        title: "Completed",
        description: "Report uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setIsCompleteDialogOpen(false);
      setCompleteResults("");
      setCompleteTechnicianNotes("");
      setCompleteIsAbnormal(false);
      setCompleteFiles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openCompleteDialog = (test: LabTest) => {
    setSelectedTest(test);
    setCompleteResults("");
    setCompleteTechnicianNotes("");
    setCompleteIsAbnormal(false);
    setCompleteFiles([]);
    setIsCompleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">{pageDescription}</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <FlaskConical className="h-4 w-4 mr-2" />
          {labTests.length} Tests
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.all}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isLabTech ? "Approved" : "Pending"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {isLabTech ? counts.approved : counts.pending}
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
            <div className="text-2xl font-bold text-blue-600">
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
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {isLabTech ? (
                    <SelectItem value="approved">Approved</SelectItem>
                  ) : (
                    <SelectItem value="pending">Pending</SelectItem>
                  )}
                  <SelectItem value="in_progress">In Progress</SelectItem>
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
                  placeholder={
                    isLabTech
                      ? "Search by patient, test name..."
                      : isDoctor
                      ? "Search by patient, test name..."
                      : "Search by doctor, test name..."
                  }
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
          <CardTitle>Lab Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTests ? (
            <p className="text-center py-8 text-muted-foreground">
              Loading lab tests...
            </p>
          ) : filteredTests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No lab tests found
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
                  ) : isLabTech ? (
                    <>
                      <TableHead>Patient</TableHead>
                      <TableHead>Health ID</TableHead>
                      <TableHead>Doctor</TableHead>
                    </>
                  ) : (
                    <TableHead>Doctor</TableHead>
                  )}
                  <TableHead>Test Name</TableHead>
                  <TableHead>Test Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => (
                  <TableRow key={test.id}>
                    {isDoctor ? (
                      <>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {test.patientName || "Unknown Patient"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {test.patientHealthId || "N/A"}
                          </Badge>
                        </TableCell>
                      </>
                    ) : isLabTech ? (
                      <>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {test.patientName || "Unknown Patient"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {test.patientHealthId || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {test.doctorName || "Unknown Doctor"}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell className="font-medium">
                        {test.doctorName || "Unknown Doctor"}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {test.testName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{test.testType}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                        {test.isAbnormal && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(test.requestDate), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {test.completionDate
                        ? format(new Date(test.completionDate), "MMM dd, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailDialog(test)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        {isLabTech && test.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => startTestMutation.mutate(test.id)}
                            disabled={startTestMutation.isPending}
                          >
                            Start
                          </Button>
                        )}

                        {isLabTech && test.status === "in_progress" && (
                          <Button
                            size="sm"
                            onClick={() => openCompleteDialog(test)}
                          >
                            Complete
                          </Button>
                        )}

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

      {/* Complete Test Dialog (Lab Technician) */}
      <Dialog
        open={isCompleteDialogOpen}
        onOpenChange={setIsCompleteDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Lab Test</DialogTitle>
            <DialogDescription>
              Upload report file and enter results for: {selectedTest?.testName}
            </DialogDescription>
          </DialogHeader>

          {!selectedTest ? (
            <div className="text-sm text-muted-foreground">
              No test selected.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Report File <span className="text-red-500">*</span>
                </label>
                <input
                  ref={completeFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  multiple
                  onChange={(e) => {
                    const newFiles = e.target.files
                      ? Array.from(e.target.files)
                      : [];

                    if (newFiles.length > 0) {
                      setCompleteFiles((prev) => [...prev, ...newFiles]);
                    }

                    // Allow selecting the same file again if needed
                    e.currentTarget.value = "";
                  }}
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => completeFileInputRef.current?.click()}
                  >
                    Choose Files
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {completeFiles.length > 0
                      ? `${completeFiles.length} file(s) selected`
                      : "No files selected"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Allowed: PDF, PNG, JPG, DOC, DOCX (you can upload multiple)
                </p>
                {completeFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Selected: {completeFiles.length} file(s)
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setCompleteFiles([])}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {completeFiles.map((f, idx) => (
                        <p
                          key={`${f.name}-${idx}`}
                          className="text-xs truncate"
                        >
                          {f.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Results Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={completeResults}
                  onChange={(e) => setCompleteResults(e.target.value)}
                  placeholder="Enter test results and notes..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={completeIsAbnormal}
                  onCheckedChange={(v) => setCompleteIsAbnormal(Boolean(v))}
                  id="abnormal"
                />
                <label htmlFor="abnormal" className="text-sm">
                  Mark as abnormal
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Technician Notes</label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={completeTechnicianNotes}
                  onChange={(e) => setCompleteTechnicianNotes(e.target.value)}
                  placeholder="Optional notes for the patient..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCompleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    completeTestMutation.isPending ||
                    completeFiles.length === 0 ||
                    !completeResults.trim()
                  }
                  onClick={() => {
                    if (completeFiles.length === 0) return;
                    completeTestMutation.mutate({
                      testId: selectedTest.id,
                      files: completeFiles,
                      results: completeResults.trim(),
                      technicianNotes:
                        completeTechnicianNotes.trim() || undefined,
                      isAbnormal: completeIsAbnormal,
                    });
                  }}
                >
                  {completeTestMutation.isPending ? "Uploading..." : "Complete"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Test Details</DialogTitle>
            <DialogDescription>
              {isDoctor
                ? `Test for ${selectedTest?.patientName}`
                : `Requested by ${selectedTest?.doctorName}`}
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (
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
                          {selectedTest.patientName || "Unknown"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Health ID
                        </label>
                        <p>
                          <Badge variant="outline">
                            {selectedTest.patientHealthId || "N/A"}
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
                        {selectedTest.doctorName || "Unknown"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                          {selectedTest.status}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Abnormal Results
                      </label>
                      <p className="mt-1">
                        {selectedTest.isAbnormal ? (
                          <Badge
                            variant="destructive"
                            className="flex items-center gap-1 w-fit"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Yes - Requires Attention
                          </Badge>
                        ) : (
                          <Badge variant="outline">Normal</Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Request Date
                      </label>
                      <p className="mt-1">
                        {format(
                          new Date(selectedTest.requestDate),
                          "MMMM dd, yyyy"
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Completion Date
                      </label>
                      <p className="mt-1">
                        {selectedTest.completionDate
                          ? format(
                              new Date(selectedTest.completionDate),
                              "MMMM dd, yyyy"
                            )
                          : "Not completed yet"}
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

                  {selectedTest.results && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Results
                      </label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="whitespace-pre-wrap">
                          {selectedTest.results}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedTest.notes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Notes
                      </label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="whitespace-pre-wrap">
                          {selectedTest.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {reportFiles.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Report Files</p>
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
                              <Download className="h-4 w-4 mr-2" />
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
                        <Download className="h-4 w-4 mr-2" />
                        View Report
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
                        Download Report
                      </a>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
