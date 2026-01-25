import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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

import { User } from "lucide-react";

type ProfileFullResponse = {
  user: {
    id: string;
    username: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
    isActive: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  roleData: any | null;
};

type MyChangeRequest = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const { data, isLoading, isError, error } = useQuery<ProfileFullResponse>({
    queryKey: ["/api/profile/full"],
  });

  const profile = data;

  const myRequestsQuery = useQuery<{ requests: MyChangeRequest[] }>({
    queryKey: ["/api/profile/change-requests"],
    // Avoid constant polling against hosted DB.
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });

  const [isEditing, setIsEditing] = useState(false);

  const initial = useMemo(() => {
    const u = profile?.user;
    const r = profile?.roleData;
    return {
      firstName: String(u?.firstName || ""),
      lastName: String(u?.lastName || ""),
      email: String(u?.email || ""),
      // Patient
      contactInfo: String(r?.contactInfo || ""),
      address: String(r?.address || ""),
      // Doctor
      qualifications: String(r?.qualifications || ""),
      experience:
        r?.experience !== undefined && r?.experience !== null
          ? String(r.experience)
          : "",
      // Lab technician
      specialization: String(r?.specialization || ""),
    };
  }, [profile?.user, profile?.roleData]);

  const [form, setForm] = useState(initial);

  // Keep form in sync when data loads/refetches
  useEffect(() => {
    setForm(initial);
    setIsEditing(false);
  }, [initial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        roleData: {},
      };

      const role = String(profile?.user?.role || "");
      if (role === "patient") {
        payload.roleData = {
          contactInfo: form.contactInfo.trim(),
          address: form.address.trim(),
        };
      } else if (role === "doctor") {
        payload.roleData = {
          qualifications: form.qualifications.trim(),
          experience:
            form.experience.trim().length > 0
              ? Number(form.experience.trim())
              : null,
        };
      } else if (role === "lab_technician") {
        payload.roleData = {
          specialization: form.specialization.trim(),
        };
      } else {
        payload.roleData = null;
      }

      const res = await apiRequest("PATCH", "/api/profile/full", payload);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/profile/full"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated" });
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update profile",
        variant: "destructive",
      });
    },
  });

  const role = String(profile?.user?.role || authUser?.role || "");

  const requestableFields = useMemo(() => {
    const base = [{ value: "username", label: "Username" }];
    if (role === "patient") {
      return [
        ...base,
        { value: "nic", label: "NIC" },
        { value: "rfid", label: "RFID" },
        { value: "healthId", label: "Health ID" },
        { value: "gender", label: "Gender" },
        { value: "dateOfBirth", label: "Date of birth" },
        { value: "bloodType", label: "Blood Group" },
      ];
    }
    if (role === "doctor") {
      return [
        ...base,
        { value: "nic", label: "NIC" },
        { value: "gender", label: "Gender" },
        { value: "licenseNumber", label: "License number" },
      ];
    }
    if (role === "pharmacist") {
      return [...base, { value: "licenseNumber", label: "License number" }];
    }
    if (role === "lab_technician") {
      return [...base, { value: "licenseNumber", label: "License number" }];
    }
    // Admin and other roles can still request username change.
    return base;
  }, [role]);

  const [changeField, setChangeField] = useState<string>(
    requestableFields[0]?.value || ""
  );
  const [changeNewValue, setChangeNewValue] = useState<string>("");
  const [changeReason, setChangeReason] = useState<string>("");

  useEffect(() => {
    setChangeField(requestableFields[0]?.value || "");
  }, [requestableFields]);

  const changeRequestMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        field: changeField,
        newValue: changeNewValue,
        reason: changeReason,
      };
      const res = await apiRequest(
        "POST",
        "/api/profile/change-requests",
        payload
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "An admin will review your request.",
      });
      setChangeNewValue("");
      setChangeReason("");
      void queryClient.invalidateQueries({
        queryKey: ["/api/profile/change-requests"],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Request failed",
        description: err?.message || "Could not submit request",
        variant: "destructive",
      });
    },
  });

  const roleTitle =
    role === "lab_technician"
      ? "Lab Technician"
      : role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground">
            View your personal details and update basic information.
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              disabled={isLoading || !profile}
            >
              Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setForm(initial);
                  setIsEditing(false);
                }}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load your profile. {String((error as any)?.message || "")}
          </AlertDescription>
        </Alert>
      )}

      {role === "patient" &&
        !!profile &&
        !profile.roleData &&
        !isLoading &&
        !isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Patient record is missing for this account. Please ask an
              administrator to add your patient details.
            </AlertDescription>
          </Alert>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Basic, editable account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Role: {roleTitle}</Badge>
              {profile?.user?.isActive ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={String(profile?.user?.username || "")} disabled />
              </div>

              <div className="space-y-2">
                <Label>User ID</Label>
                <Input value={String(profile?.user?.id || "")} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>Created</Label>
                <Input value={formatDate(profile?.user?.createdAt)} disabled />
              </div>

              <div className="space-y-2">
                <Label>Last updated</Label>
                <Input value={formatDate(profile?.user?.updatedAt)} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{roleTitle} Details</CardTitle>
            <CardDescription>
              Role-specific information (sensitive fields are read-only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile ? (
              <div className="text-muted-foreground">
                {isLoading ? "Loading..." : isError ? "Failed to load." : "—"}
              </div>
            ) : role === "patient" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NIC</Label>
                  <Input
                    value={String(profile.roleData?.nic || "—")}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>RFID</Label>
                  <Input
                    value={String(profile.roleData?.rfid || "—")}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Health ID</Label>
                  <Input
                    value={String(profile.roleData?.healthId || "—")}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Input
                    value={formatDate(profile.roleData?.dateOfBirth)}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Input
                    value={String(profile.roleData?.gender || "—")}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Input
                    value={String(profile.roleData?.bloodType || "—")}
                    disabled
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contactInfo">Contact</Label>
                  <Input
                    id="contactInfo"
                    value={form.contactInfo}
                    onChange={(e) =>
                      setForm({ ...form, contactInfo: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Phone number"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Your address"
                  />
                </div>
              </div>
            ) : role === "doctor" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NIC</Label>
                  <Input
                    value={String(profile.roleData?.nic || "—")}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Input
                    value={String(profile.roleData?.gender || "—")}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input
                    value={String(profile.roleData?.specialization || "—")}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>License number</Label>
                  <Input
                    value={String(profile.roleData?.licenseNumber || "—")}
                    disabled
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Input
                    id="qualifications"
                    value={form.qualifications}
                    onChange={(e) =>
                      setForm({ ...form, qualifications: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Your qualifications"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience (years)</Label>
                  <Input
                    id="experience"
                    value={form.experience}
                    onChange={(e) =>
                      setForm({ ...form, experience: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            ) : role === "lab_technician" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>License number</Label>
                  <Input
                    value={String(profile.roleData?.licenseNumber || "—")}
                    disabled
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={form.specialization}
                    onChange={(e) =>
                      setForm({ ...form, specialization: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Your specialization"
                  />
                </div>
              </div>
            ) : role === "pharmacist" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>License number</Label>
                  <Input
                    value={String(profile.roleData?.licenseNumber || "—")}
                    disabled
                  />
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                No role-specific profile fields.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {requestableFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request Sensitive Field Change</CardTitle>
            <CardDescription>
              Sensitive fields are updated only after admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field</Label>
                <Select value={changeField} onValueChange={setChangeField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestableFields.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>New value</Label>
                <Input
                  value={changeNewValue}
                  onChange={(e) => setChangeNewValue(e.target.value)}
                  placeholder={
                    changeField === "healthId" || changeField === "rfid"
                      ? "Leave blank if admin should fill/generate"
                      : "Enter the new value"
                  }
                />
                {changeField === "healthId" || changeField === "rfid" ? (
                  <div className="text-xs text-muted-foreground">
                    You can leave this blank. Admin will fill/generate during
                    approval.
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Why do you need this change?"
                  className="min-h-[90px]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => changeRequestMutation.mutate()}
                disabled={
                  changeRequestMutation.isPending ||
                  !changeField ||
                  (changeField !== "healthId" &&
                    changeField !== "rfid" &&
                    changeNewValue.trim().length === 0)
                }
              >
                {changeRequestMutation.isPending
                  ? "Submitting..."
                  : "Submit request"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>
            Your sensitive-field change requests and their status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myRequestsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : myRequestsQuery.isError ? (
            <div className="text-muted-foreground">
              Could not load requests.
            </div>
          ) : (myRequestsQuery.data?.requests?.length ?? 0) === 0 ? (
            <div className="text-muted-foreground">No requests yet.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequestsQuery.data!.requests.map((r) => {
                    const fieldLabel =
                      r.field === "bloodType"
                        ? "Blood Group"
                        : r.field === "dateOfBirth"
                        ? "Date of birth"
                        : r.field;

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{fieldLabel}</TableCell>
                        <TableCell className="text-sm max-w-[260px] truncate">
                          {r.newValue || "—"}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {r.status}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
