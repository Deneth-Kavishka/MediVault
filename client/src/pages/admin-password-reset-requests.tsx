import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Shield,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

type PasswordResetRequest = {
  id: string;
  userId: string;
  email: string;
  username: string;
  fullName: string | null;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  adminNotes: string | null;
};

export default function AdminPasswordResetRequestsPage() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] =
    useState<PasswordResetRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");

  const { data: requests, isLoading } = useQuery<PasswordResetRequest[]>({
    queryKey: ["/api/password-reset/requests", statusFilter],
    queryFn: async () => {
      const url =
        statusFilter === "all"
          ? "/api/password-reset/requests"
          : `/api/password-reset/requests?status=${statusFilter}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch password reset requests");
      }
      return response.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(
        `/api/password-reset/requests/${requestId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/password-reset/requests"],
      });
      setShowApproveDialog(false);
      setSelectedRequest(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (payload: { requestId: string; adminNotes: string }) => {
      const response = await fetch(
        `/api/password-reset/requests/${payload.requestId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ adminNotes: payload.adminNotes }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/password-reset/requests"],
      });
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
    },
  });

  const handleApprove = (request: PasswordResetRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const handleReject = (request: PasswordResetRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const confirmReject = () => {
    if (selectedRequest && adminNotes.trim()) {
      rejectMutation.mutate({
        requestId: selectedRequest.id,
        adminNotes: adminNotes.trim(),
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">
              Loading password reset requests...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Password Reset Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve password reset requests from users
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Requests</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
              >
                <Clock className="w-4 h-4 mr-1" />
                Pending (
                {requests?.filter((r) => r.status === "pending").length || 0})
              </Button>
              <Button
                variant={statusFilter === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("approved")}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approved
              </Button>
              <Button
                variant={statusFilter === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("rejected")}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejected
              </Button>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No password reset requests found
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {request.fullName || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {request.username}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{request.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(request.requestedAt), "PPp")}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      {request.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                            onClick={() => handleApprove(request)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleReject(request)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : request.status === "approved" ? (
                        <span className="text-sm text-muted-foreground">
                          Processed{" "}
                          {request.processedAt &&
                            format(new Date(request.processedAt), "PP")}
                        </span>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {request.adminNotes && (
                            <div
                              className="max-w-xs truncate"
                              title={request.adminNotes}
                            >
                              {request.adminNotes}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Password Reset Request</DialogTitle>
            <DialogDescription>
              This will generate a temporary password and send it to the user's
              email. The user will be required to change their password after
              logging in.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {selectedRequest.fullName || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{selectedRequest.email}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  Username:{" "}
                </span>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {selectedRequest.username}
                </code>
              </div>
            </div>
          )}

          {approveMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {approveMutation.error?.message || "Failed to approve request"}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending
                ? "Approving..."
                : "Approve & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Password Reset Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this password reset request.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {selectedRequest.fullName || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{selectedRequest.email}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adminNotes">Reason for Rejection *</Label>
            <Textarea
              id="adminNotes"
              placeholder="Enter reason for rejection..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={rejectMutation.isPending}
              rows={4}
            />
          </div>

          {rejectMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {rejectMutation.error?.message || "Failed to reject request"}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setAdminNotes("");
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !adminNotes.trim()}
              variant="destructive"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
