import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";

interface LabTestReport {
  id: string;
  fileName?: string | null;
  fileMime?: string | null;
  fileSize?: number | null;
  createdAt?: string;
  viewUrl: string;
  downloadUrl: string;
}

export default function TestResults() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [abnormalFilter, setAbnormalFilter] = useState("all");
  const [issuedFrom, setIssuedFrom] = useState("");
  const [issuedTo, setIssuedTo] = useState("");

  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);

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

  const isAllowed = user?.role === "lab_technician" || user?.role === "admin";
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAllowed) {
      toast({
        title: "Access denied",
        description: "You don't have permission to view test results.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 300);
    }
  }, [isAllowed, isAuthenticated, isLoading, toast]);

  const { data: labTests = [], isLoading: loadingTests } = useQuery<any[]>({
    queryKey: ["/api/lab-tests/technician"],
    enabled: isAuthenticated && isAllowed,
  });

  const {
    data: reportFiles = [],
    isLoading: reportsLoading,
    error: reportsError,
  } = useQuery<LabTestReport[]>({
    queryKey: [
      selectedTest?.id ? `/api/lab-tests/${selectedTest.id}/reports` : "",
    ],
    enabled: isReportsDialogOpen && !!selectedTest?.id,
  });

  const completedTests = useMemo(() => {
    const base = (labTests || []).filter((t: any) => t.status === "completed");

    const q = searchQuery.trim().toLowerCase();
    const fromDate = issuedFrom ? new Date(`${issuedFrom}T00:00:00`) : null;
    const toDate = issuedTo ? new Date(`${issuedTo}T23:59:59`) : null;

    return base
      .filter((t: any) => {
        if (abnormalFilter === "abnormal" && !t.isAbnormal) return false;
        if (abnormalFilter === "normal" && t.isAbnormal) return false;

        if (q) {
          const hay = [t.patientName, t.patientHealthId, t.testName, t.testType]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }

        const issued = t.completionDate ? new Date(t.completionDate) : null;
        if (fromDate && (!issued || issued < fromDate)) return false;
        if (toDate && (!issued || issued > toDate)) return false;

        return true;
      })
      .sort((a: any, b: any) => {
        const ad = a.completionDate ? new Date(a.completionDate).getTime() : 0;
        const bd = b.completionDate ? new Date(b.completionDate).getTime() : 0;
        return bd - ad;
      });
  }, [abnormalFilter, issuedFrom, issuedTo, labTests, searchQuery]);

  if (isLoading) return null;
  if (!isAuthenticated) return null;
  if (!isAllowed) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Results</h1>
        <p className="text-muted-foreground mt-1">
          Completed tests with patient and issued details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Patient / Health ID / Test"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Abnormal</label>
              <Select value={abnormalFilter} onValueChange={setAbnormalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="abnormal">Abnormal only</SelectItem>
                  <SelectItem value="normal">Normal only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Issued From</label>
              <Input
                type="date"
                value={issuedFrom}
                onChange={(e) => setIssuedFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Issued To</label>
              <Input
                type="date"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completed Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTests ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : completedTests.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No results match your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Health ID</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Abnormal</TableHead>
                  <TableHead className="text-right">Reports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedTests.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.patientName || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t.patientHealthId || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{t.testName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.testType}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.requestDate
                        ? new Date(t.requestDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {t.completionDate
                        ? new Date(t.completionDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {t.isAbnormal ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTest(t);
                          setIsReportsDialogOpen(true);
                        }}
                      >
                        View / Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isReportsDialogOpen} onOpenChange={setIsReportsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Test Reports</DialogTitle>
            <DialogDescription>
              {selectedTest
                ? `${selectedTest.patientName || "Patient"} • ${
                    selectedTest.testName
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {!selectedTest ? (
            <div className="text-sm text-muted-foreground">
              No test selected.
            </div>
          ) : reportsLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading reports...
            </div>
          ) : reportsError ? (
            <div className="space-y-1">
              <div className="text-sm text-destructive">
                Failed to load reports.
              </div>
              <div className="text-xs text-muted-foreground">
                {reportsError instanceof Error
                  ? reportsError.message
                  : String(reportsError)}
              </div>
            </div>
          ) : reportFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No reports found.
            </div>
          ) : (
            <div className="space-y-2">
              {reportFiles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.fileName || "Report file"}
                    </p>
                    {r.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {new Date(r.createdAt).toLocaleString()}
                      </p>
                    )}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
