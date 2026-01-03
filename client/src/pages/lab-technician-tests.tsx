import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FlaskConical,
  CheckCircle,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LabTest {
  id: string;
  patientId: string;
  patientName?: string;
  patientHealthId?: string;
  doctorName?: string;
  testType: string;
  testName: string;
  status: string;
  urgency: string;
  requestDate: string;
  approvedDate?: string;
  sampleCollectionDate?: string;
  notes?: string;
  technicianNotes?: string;
  labFacilityName?: string;
}

export default function LabTechnicianTests() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approvalDate, setApprovalDate] = useState("");
  const [approvalTime, setApprovalTime] = useState("");
  const [sampleCollectionDate, setSampleCollectionDate] = useState("");
  const [sampleCollectionTime, setSampleCollectionTime] = useState("");
  const [technicianNotes, setTechnicianNotes] = useState("");

  const { data: labTests = [], isLoading: loadingTests } = useQuery<LabTest[]>({
    queryKey: ["/api/lab-tests/technician/pending"],
    enabled: isAuthenticated && !!user && user.role === "lab_technician",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in as a lab technician.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (
    isLoading ||
    !isAuthenticated ||
    !user ||
    user.role !== "lab_technician"
  ) {
    return null;
  }

  const approveMutation = useMutation({
    mutationFn: async (data: {
      testId: string;
      approvedDate: string;
      sampleCollectionDate?: string;
      technicianNotes?: string;
    }) => {
      const response = await fetch(`/api/lab-tests/${data.testId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          approvedDate: data.approvedDate,
          sampleCollectionDate: data.sampleCollectionDate,
          technicianNotes: data.technicianNotes,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let message = "Failed to approve test";

        if (contentType.includes("application/json")) {
          const error = await response.json().catch(() => null);
          message = error?.message || message;
        } else {
          const text = await response.text().catch(() => "");
          message = text?.trim() ? text.trim() : message;
        }

        throw new Error(message);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return response.json().catch(() => null);
      }

      // Some environments may return an empty body; treat as success.
      return null;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description:
          "Lab test approved successfully! Patient has been notified.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/lab-tests/technician/pending"],
      });
      setIsApproveDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openApproveDialog = (test: LabTest) => {
    setSelectedTest(test);
    // Set default approval date to now
    const now = new Date();
    setApprovalDate(format(now, "yyyy-MM-dd"));
    setApprovalTime(format(now, "HH:mm"));
    setIsApproveDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedTest(null);
    setApprovalDate("");
    setApprovalTime("");
    setSampleCollectionDate("");
    setSampleCollectionTime("");
    setTechnicianNotes("");
  };

  const handleApprove = () => {
    if (!selectedTest || !approvalDate || !approvalTime) {
      toast({
        title: "Error",
        description: "Please fill in the approval date and time",
        variant: "destructive",
      });
      return;
    }

    const approvedDateTime = `${approvalDate}T${approvalTime}:00`;
    let sampleDateTime = undefined;

    if (sampleCollectionDate && sampleCollectionTime) {
      sampleDateTime = `${sampleCollectionDate}T${sampleCollectionTime}:00`;
    }

    approveMutation.mutate({
      testId: selectedTest.id,
      approvedDate: approvedDateTime,
      sampleCollectionDate: sampleDateTime,
      technicianNotes: technicianNotes || undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "approved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
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

  const pendingTests = labTests.filter((t) => t.status === "pending");
  const approvedTests = labTests.filter((t) => t.status === "approved");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lab Test Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve patient lab test requests
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <FlaskConical className="h-4 w-4 mr-2" />
          {pendingTests.length} Pending Requests
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labTests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingTests.length}
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
              {approvedTests.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Test Requests</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tests waiting for your approval
          </p>
        </CardHeader>
        <CardContent>
          {loadingTests ? (
            <p className="text-center py-8 text-muted-foreground">
              Loading test requests...
            </p>
          ) : pendingTests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending test requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test Details</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {test.patientName || "Unknown Patient"}
                            </span>
                          </div>
                          <Badge variant="outline" className="w-fit mt-1">
                            {test.patientHealthId || "N/A"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{test.testName}</span>
                          <Badge variant="secondary" className="w-fit mt-1">
                            {test.testType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getUrgencyColor(test.urgency)}>
                          {test.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {test.doctorName || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(test.requestDate), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openApproveDialog(test)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Test Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Lab Test Request</DialogTitle>
            <DialogDescription>
              Set appointment details for: {selectedTest?.testName}
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-4">
              {/* Patient Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">
                      Patient Name
                    </Label>
                    <p className="font-semibold">
                      {selectedTest.patientName || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Health ID</Label>
                    <p>
                      <Badge variant="outline">
                        {selectedTest.patientHealthId || "N/A"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Test Name</Label>
                    <p className="font-semibold">{selectedTest.testName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Urgency</Label>
                    <p>
                      <Badge className={getUrgencyColor(selectedTest.urgency)}>
                        {selectedTest.urgency}
                      </Badge>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {selectedTest.notes && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Doctor's Notes:</strong> {selectedTest.notes}
                  </AlertDescription>
                </Alert>
              )}

              {/* Approval Details Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="approvalDate">
                      Approval Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="approvalDate"
                      type="date"
                      value={approvalDate}
                      onChange={(e) => setApprovalDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvalTime">
                      Approval Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="approvalTime"
                      type="time"
                      value={approvalTime}
                      onChange={(e) => setApprovalTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sampleDate">
                      Sample Collection Date (Optional)
                    </Label>
                    <Input
                      id="sampleDate"
                      type="date"
                      value={sampleCollectionDate}
                      onChange={(e) => setSampleCollectionDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sampleTime">
                      Sample Collection Time (Optional)
                    </Label>
                    <Input
                      id="sampleTime"
                      type="time"
                      value={sampleCollectionTime}
                      onChange={(e) => setSampleCollectionTime(e.target.value)}
                      disabled={!sampleCollectionDate}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Special Notes for Patient</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special instructions or notes for the patient..."
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  The patient will receive a notification with the appointment
                  details once you approve this request.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsApproveDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Test Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
