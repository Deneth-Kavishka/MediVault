import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  Users,
  UserX,
  RefreshCw,
  Scan,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastAction } from "@/components/ui/toast";
import { isWebSerialSupported, scanRfidOnce } from "@/lib/rfid-serial";

interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  deactivatedAt?: string;
  createdAt: string;
  updatedAt: string;
  roleData?: any; // Role-specific data (patient, doctor, etc.)
}

interface ProfileChangeRequest {
  id: string;
  requesterUserId: string;
  role: string;
  field: string;
  oldValue?: string | null;
  newValue: string;
  reason?: string | null;
  status: string;
  adminNotes?: string | null;
  createdAt?: string | null;
  requesterUsername?: string | null;
  requesterEmail?: string | null;
  requesterFirstName?: string | null;
  requesterLastName?: string | null;
}

const roleColors: Record<string, string> = {
  admin: "bg-red-500",
  doctor: "bg-blue-500",
  patient: "bg-green-500",
  pharmacist: "bg-purple-500",
  lab_technician: "bg-orange-500",
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddRfidScanning, setIsAddRfidScanning] = useState(false);
  const [isEditRfidScanning, setIsEditRfidScanning] = useState(false);

  const [adminActionByRequestId, setAdminActionByRequestId] = useState<
    Record<
      string,
      { newValue?: string; generate?: boolean; scanning?: boolean }
    >
  >({});

  const getAdminAction = (requestId: string) =>
    adminActionByRequestId[requestId] ?? {};

  const setAdminAction = (
    requestId: string,
    patch: Partial<{
      newValue?: string;
      generate?: boolean;
      scanning?: boolean;
    }>
  ) => {
    setAdminActionByRequestId((prev) => ({
      ...prev,
      [requestId]: { ...(prev[requestId] ?? {}), ...patch },
    }));
  };

  const buildUsernameFromName = (firstName: string, lastName: string) => {
    const base =
      `${firstName || ""}.${lastName || ""}`
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "")
        .replace(/\.+/g, ".")
        .replace(/^\.|\.$/g, "")
        .slice(0, 24) || "user";
    return base;
  };

  const [activeTab, setActiveTab] = useState<"active" | "deactivated">(
    "active"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [originalUserData, setOriginalUserData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [isAddUsernameManual, setIsAddUsernameManual] = useState(false);
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState<{
    userId: string;
    email?: string;
    username: string;
    temporaryPassword: string;
  } | null>(null);

  const [changeRequestsDialogOpen, setChangeRequestsDialogOpen] =
    useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedChangeRequest, setSelectedChangeRequest] =
    useState<ProfileChangeRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const resendCredentialsMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      temporaryPassword: string;
      email?: string;
    }) => {
      return await api.post(
        `/api/admin/users/${payload.userId}/send-credentials`,
        {
          temporaryPassword: payload.temporaryPassword,
          ...(payload.email ? { email: payload.email } : {}),
        }
      );
    },
    onSuccess: (data: any) => {
      toast({
        title: data?.emailSent === true ? "Email sent" : "Email not sent",
        description:
          data?.emailSent === true
            ? "Credentials email sent successfully."
            : `Failed to send credentials email. ${
                data?.emailError ? `Reason: ${data.emailError}` : ""
              }`,
        variant: data?.emailSent === true ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend credentials email",
        variant: "destructive",
      });
    },
  });

  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "patient",
    // Patient-specific fields
    nic: "",
    rfid: "",
    dateOfBirth: "",
    gender: "",
    contactInfo: "",
    address: "",
    bloodType: "",
    allergies: "",
    // Doctor-specific fields
    doctorNic: "",
    doctorGender: "",
    specialization: "",
    licenseNumber: "",
    qualifications: "",
    experience: "",
    // Pharmacist/Lab tech fields
    labTechSpecialization: "",
    labTechLicenseNumber: "",
  });

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    // Patient-specific fields
    nic: "",
    rfid: "",
    dateOfBirth: "",
    gender: "",
    contactInfo: "",
    address: "",
    bloodType: "",
    allergies: "",
    // Doctor-specific fields
    specialization: "",
    licenseNumber: "",
    qualifications: "",
    experience: "",
    consultationFee: "",
    // Pharmacist fields
    pharmacistLicenseNumber: "",
    // Lab tech fields
    labTechSpecialization: "",
    labTechLicenseNumber: "",
  });

  const scanIntoAddRfid = () => {
    if (isAddRfidScanning) return;

    if (!isWebSerialSupported()) {
      toast({
        title: "RFID Scanner Not Supported",
        description: "Use Chrome or Edge to scan RFID via USB (Web Serial).",
        variant: "destructive",
      });
      return;
    }

    setIsAddRfidScanning(true);
    toast({
      title: "RFID Scanner",
      description: "Select the NodeMCU serial port, then tap the RFID card.",
    });

    scanRfidOnce()
      .then((uid) => {
        setAddForm((prev) => ({ ...prev, rfid: uid }));
        toast({
          title: "RFID Scanned",
          description: `UID captured: ${uid}`,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Scan failed";
        toast({
          title: "RFID Scan Failed",
          description: message,
          variant: "destructive",
        });
      })
      .finally(() => setIsAddRfidScanning(false));
  };

  const scanIntoEditRfid = () => {
    if (isEditRfidScanning) return;

    if (!isWebSerialSupported()) {
      toast({
        title: "RFID Scanner Not Supported",
        description: "Use Chrome or Edge to scan RFID via USB (Web Serial).",
        variant: "destructive",
      });
      return;
    }

    setIsEditRfidScanning(true);
    toast({
      title: "RFID Scanner",
      description: "Select the NodeMCU serial port, then tap the RFID card.",
    });

    scanRfidOnce()
      .then((uid) => {
        setEditForm((prev) => ({ ...prev, rfid: uid }));
        toast({
          title: "RFID Scanned",
          description: `UID captured: ${uid}`,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Scan failed";
        toast({
          title: "RFID Scan Failed",
          description: message,
          variant: "destructive",
        });
      })
      .finally(() => setIsEditRfidScanning(false));
  };

  // Fetch active users
  const {
    data: users,
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ["admin-users", roleFilter],
    queryFn: async () => {
      const url =
        roleFilter !== "all"
          ? `/api/admin/users?role=${roleFilter}`
          : "/api/admin/users";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Fetch deactivated users
  const { data: deactivatedUsers, isLoading: isLoadingDeactivated } = useQuery<
    User[]
  >({
    queryKey: ["admin-users-deactivated"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users/deactivated", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch deactivated users: ${response.statusText}`
        );
      }
      return response.json();
    },
  });

  const {
    data: pendingChangeRequestsData,
    isLoading: isLoadingChangeRequests,
    refetch: refetchChangeRequests,
  } = useQuery<{ requests: ProfileChangeRequest[] }>({
    queryKey: ["admin-profile-change-requests", "pending"],
    queryFn: async () => {
      return await api.get("/api/admin/profile/change-requests?status=pending");
    },
    enabled: changeRequestsDialogOpen,
  });

  const pendingCountQuery = useQuery<{ count: number }>({
    queryKey: ["admin-profile-change-requests", "pending", "count"],
    queryFn: async () => {
      return await api.get(
        "/api/admin/profile/change-requests/count?status=pending"
      );
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  const pendingCount = Number(pendingCountQuery.data?.count ?? 0) || 0;
  const [lastNotifiedPendingCount, setLastNotifiedPendingCount] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (pendingCountQuery.isLoading) return;
    if (lastNotifiedPendingCount === null) {
      setLastNotifiedPendingCount(pendingCount);
      return;
    }
    if (pendingCount > lastNotifiedPendingCount) {
      toast({
        title: "New change request",
        description: `${pendingCount} pending request(s) in queue.`,
      });
      setLastNotifiedPendingCount(pendingCount);
      return;
    }
    if (pendingCount < lastNotifiedPendingCount) {
      setLastNotifiedPendingCount(pendingCount);
    }
  }, [
    pendingCount,
    pendingCountQuery.isLoading,
    lastNotifiedPendingCount,
    toast,
  ]);

  const pendingChangeRequests = pendingChangeRequestsData?.requests || [];

  const approveChangeRequestMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      newValue?: string;
      generate?: boolean;
    }) => {
      return await api.post(
        `/api/admin/profile/change-requests/${payload.id}/approve`,
        {
          adminNotes: "",
          ...(typeof payload.newValue === "string"
            ? { newValue: payload.newValue }
            : {}),
          ...(payload.generate === true ? { generate: true } : {}),
        }
      );
    },
    onSuccess: async (data: any) => {
      await refetchChangeRequests();
      toast({
        title: "Approved",
        description:
          data?.emailSent === true
            ? "Approved and email sent."
            : data?.emailSent === false
            ? `Approved, but email not sent. ${
                data?.emailError ? `Reason: ${data.emailError}` : ""
              }`
            : "Approved.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Approve failed",
        description: err?.message || "Could not approve request",
        variant: "destructive",
      });
    },
  });

  const scanRfidForRequest = async (requestId: string) => {
    if (!isWebSerialSupported()) {
      toast({
        title: "Web Serial not supported",
        description: "Use Chrome or Edge to scan RFID",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdminAction(requestId, { scanning: true });
      const uid = await scanRfidOnce({ timeoutMs: 15000 });
      setAdminAction(requestId, { newValue: uid, scanning: false });
      toast({ title: "RFID scanned", description: uid });
    } catch (err: any) {
      setAdminAction(requestId, { scanning: false });
      toast({
        title: "RFID scan failed",
        description: err?.message || "Could not read RFID tag",
        variant: "destructive",
      });
    }
  };

  const rejectChangeRequestMutation = useMutation({
    mutationFn: async (payload: { id: string; adminNotes: string }) => {
      return await api.post(
        `/api/admin/profile/change-requests/${payload.id}/reject`,
        {
          adminNotes: payload.adminNotes,
        }
      );
    },
    onSuccess: async (data: any) => {
      setRejectDialogOpen(false);
      setSelectedChangeRequest(null);
      setRejectNotes("");
      await refetchChangeRequests();
      toast({
        title: "Rejected",
        description:
          data?.emailSent === true
            ? "Rejected and email sent."
            : data?.emailSent === false
            ? `Rejected, but email not sent. ${
                data?.emailError ? `Reason: ${data.emailError}` : ""
              }`
            : "Rejected.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Reject failed",
        description: err?.message || "Could not reject request",
        variant: "destructive",
      });
    },
  });

  // Log any errors
  if (error) {
    console.error("Error fetching users:", error);
  }

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const payload: any = {
        ...(userData.username && String(userData.username).trim().length > 0
          ? { username: String(userData.username).trim() }
          : {}),
        ...(userData.password && String(userData.password).trim().length > 0
          ? { password: String(userData.password) }
          : {}),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      };

      // Add role-specific data
      if (userData.role === "patient") {
        payload.patientData = {
          nic: userData.nic,
          rfid: userData.rfid, // RFID is required
          dateOfBirth: userData.dateOfBirth,
          gender: userData.gender,
          contactInfo: userData.contactInfo,
          address: userData.address,
          bloodType: userData.bloodType,
          allergies: userData.allergies,
        };
      } else if (userData.role === "doctor") {
        payload.doctorData = {
          nic: userData.doctorNic,
          gender: userData.doctorGender,
          specialization: userData.specialization,
          licenseNumber: userData.licenseNumber,
          qualifications: userData.qualifications,
          experience: userData.experience
            ? parseInt(userData.experience)
            : undefined,
        };
      } else if (userData.role === "pharmacist") {
        payload.pharmacistData = {
          licenseNumber: userData.licenseNumber,
        };
      } else if (userData.role === "lab_technician") {
        payload.labTechData = {
          specialization: userData.labTechSpecialization,
          licenseNumber: userData.labTechLicenseNumber,
        };
      }

      return await api.post("/api/admin/users", payload);
    },
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      // Invalidate role-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });

      const temporaryPassword =
        typeof data?.temporaryPassword === "string" && data.temporaryPassword
          ? data.temporaryPassword
          : typeof variables?.password === "string"
          ? variables.password
          : "";

      if (data?.id && typeof data?.username === "string" && temporaryPassword) {
        setLastCreatedCredentials({
          userId: String(data.id),
          email: (data?.email || variables?.email) as any,
          username: String(data.username),
          temporaryPassword,
        });
      } else {
        setLastCreatedCredentials(null);
      }

      toast({
        title: "Success",
        description:
          data?.emailSent === true
            ? "User created successfully. Email sent."
            : data?.emailSent === false
            ? `User created successfully, but email was not sent. ${
                data?.emailError ? `Reason: ${data.emailError}` : ""
              }`
            : "User created successfully",
        action:
          data?.emailSent === false && temporaryPassword && data?.id ? (
            <ToastAction
              altText="Resend credentials email"
              onClick={() =>
                resendCredentialsMutation.mutate({
                  userId: String(data.id),
                  temporaryPassword,
                  email:
                    typeof (data?.email || variables?.email) === "string"
                      ? String(data?.email || variables?.email)
                      : undefined,
                })
              }
            >
              Resend email
            </ToastAction>
          ) : undefined,
      });
      setAddDialogOpen(false);
      setIsAddUsernameManual(false);
      // Reset form
      setAddForm({
        username: "",
        password: "",
        email: "",
        firstName: "",
        lastName: "",
        role: "patient",
        nic: "",
        rfid: "",
        dateOfBirth: "",
        gender: "",
        contactInfo: "",
        address: "",
        bloodType: "",
        allergies: "",
        doctorNic: "",
        doctorGender: "",
        specialization: "",
        licenseNumber: "",
        qualifications: "",
        experience: "",
        labTechSpecialization: "",
        labTechLicenseNumber: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return await api.patch(`/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      // Invalidate role-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Deactivate user mutation (soft delete)
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-deactivated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      // Invalidate role-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  // Reactivate user mutation
  const reactivateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.patch(`/api/admin/users/${id}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-deactivated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      // Invalidate role-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({
        title: "Success",
        description: "User reactivated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate user",
        variant: "destructive",
      });
    },
  });

  // Filter active users based on search and role
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Filter deactivated users based on search and role
  const filteredDeactivatedUsers = deactivatedUsers?.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleEditClick = async (user: User) => {
    setSelectedUser(user);
    setIsLoadingUserData(true);
    setEditDialogOpen(true);

    // Fetch full user data with role-specific details
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user details");

      const fullUserData = await response.json();
      console.log("Full user data received:", fullUserData);

      const roleData = fullUserData.roleData || {};
      console.log("Role data extracted:", roleData);
      console.log("User role:", fullUserData.role);

      // Store original data for display
      setOriginalUserData({ ...fullUserData, roleData });

      // Populate form with user data
      const formData: any = {
        firstName: fullUserData.firstName || "",
        lastName: fullUserData.lastName || "",
        email: fullUserData.email || "",
        role: fullUserData.role,
        // Initialize all fields with empty strings to avoid undefined
        nic: "",
        rfid: "",
        dateOfBirth: "",
        gender: "",
        contactInfo: "",
        address: "",
        bloodType: "",
        allergies: "",
        specialization: "",
        licenseNumber: "",
        qualifications: "",
        experience: "",
        consultationFee: "",
        pharmacistLicenseNumber: "",
        labTechSpecialization: "",
        labTechLicenseNumber: "",
      };

      // Add role-specific data
      if (fullUserData.role === "patient") {
        console.log("Loading patient data:", roleData);
        formData.nic = roleData.nic || "";
        formData.rfid = roleData.rfid || "";
        formData.dateOfBirth = roleData.dateOfBirth
          ? new Date(roleData.dateOfBirth).toISOString().split("T")[0]
          : "";
        formData.gender = roleData.gender || "";
        formData.contactInfo = roleData.contactInfo || "";
        formData.address = roleData.address || "";
        formData.bloodType = roleData.bloodType || "";
        formData.allergies = roleData.allergies || "";
      } else if (fullUserData.role === "doctor") {
        console.log("Loading doctor data:", roleData);
        formData.specialization = roleData.specialization || "";
        formData.licenseNumber = roleData.licenseNumber || "";
        formData.qualifications = roleData.qualifications || "";
        formData.experience = roleData.experience?.toString() || "";
        formData.consultationFee = roleData.consultationFee || "";
      } else if (fullUserData.role === "pharmacist") {
        console.log("Loading pharmacist data:", roleData);
        formData.pharmacistLicenseNumber = roleData.licenseNumber || "";
      } else if (fullUserData.role === "lab_technician") {
        console.log("Loading lab technician data:", roleData);
        formData.labTechSpecialization = roleData.specialization || "";
        formData.labTechLicenseNumber = roleData.licenseNumber || "";
      }

      console.log("Final form data:", formData);
      setEditForm(formData);
      setIsLoadingUserData(false);
    } catch (error) {
      console.error("Error loading user details:", error);
      setIsLoadingUserData(false);
      setEditDialogOpen(false);
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedUser) return;

    const payload: any = {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      role: editForm.role,
    };

    // Add role-specific data
    if (editForm.role === "patient") {
      payload.patientData = {
        nic: editForm.nic,
        rfid: editForm.rfid,
        dateOfBirth: editForm.dateOfBirth || null,
        gender: editForm.gender,
        contactInfo: editForm.contactInfo,
        address: editForm.address,
        bloodType: editForm.bloodType,
        allergies: editForm.allergies,
      };
    } else if (editForm.role === "doctor") {
      payload.doctorData = {
        specialization: editForm.specialization,
        licenseNumber: editForm.licenseNumber,
        qualifications: editForm.qualifications,
        experience: editForm.experience ? parseInt(editForm.experience) : null,
        consultationFee: editForm.consultationFee,
      };
    } else if (editForm.role === "pharmacist") {
      payload.pharmacistData = {
        licenseNumber: editForm.pharmacistLicenseNumber,
      };
    } else if (editForm.role === "lab_technician") {
      payload.labTechData = {
        specialization: editForm.labTechSpecialization,
        licenseNumber: editForm.labTechLicenseNumber,
      };
    }

    updateUserMutation.mutate({ id: selectedUser.id, data: payload });
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.id);
  };

  const handleAddSubmit = () => {
    // Validate required fields
    if (!addForm.role) {
      toast({
        title: "Validation Error",
        description: "Role is required",
        variant: "destructive",
      });
      return;
    }

    // Validate patient-specific fields
    if (addForm.role === "patient") {
      if (!addForm.nic || !addForm.rfid || !addForm.gender) {
        toast({
          title: "Validation Error",
          description: "NIC, Gender and RFID are required for patients",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate doctor-specific fields
    if (addForm.role === "doctor") {
      if (
        !addForm.doctorNic ||
        !addForm.doctorGender ||
        !addForm.specialization ||
        !addForm.licenseNumber
      ) {
        toast({
          title: "Validation Error",
          description:
            "NIC, Gender, specialization and license number are required for doctors",
          variant: "destructive",
        });
        return;
      }
    }

    if (addForm.role === "lab_technician") {
      if (!addForm.labTechLicenseNumber) {
        toast({
          title: "Validation Error",
          description: "License number is required for lab technicians",
          variant: "destructive",
        });
        return;
      }
    }

    addUserMutation.mutate(addForm);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          User Management
        </h1>
        <p className="text-muted-foreground">
          Manage all system users, roles, and permissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        {["admin", "doctor", "patient", "pharmacist", "lab_technician"].map(
          (role) => (
            <Card key={role}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
                  {role === "lab_technician" ? "Lab Techs" : role + "s"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter((u) => u.role === role).length || 0}
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Users Management with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage active and deactivated users
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveTab("deactivated")}
                disabled={activeTab === "deactivated"}
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivated Users ({deactivatedUsers?.length || 0})
              </Button>
              <Button
                variant="outline"
                onClick={() => setChangeRequestsDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Change Requests
                {pendingCount > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground">
                    {pendingCount}
                  </span>
                ) : null}
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                <SelectItem value="lab_technician">Lab Technician</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs for Active and Deactivated Users */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "active" | "deactivated")}
          >
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="active">
                Active Users ({filteredUsers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="deactivated">
                Deactivated ({filteredDeactivatedUsers?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Active Users Tab */}
            <TabsContent value="active" className="mt-4">
              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.username}
                          </TableCell>
                          <TableCell>
                            {user.firstName || user.lastName
                              ? `${user.firstName || ""} ${
                                  user.lastName || ""
                                }`.trim()
                              : "—"}
                          </TableCell>
                          <TableCell>{user.email || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${
                                roleColors[user.role]
                              } text-white border-0`}
                            >
                              {user.role.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(user)}
                                title="Edit user"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(user)}
                                title="Deactivate user"
                              >
                                <UserX className="h-4 w-4 text-orange-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Deactivated Users Tab */}
            <TabsContent value="deactivated" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Deactivated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeactivatedUsers &&
                    filteredDeactivatedUsers.length > 0 ? (
                      filteredDeactivatedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.username}
                          </TableCell>
                          <TableCell>
                            {user.firstName || user.lastName
                              ? `${user.firstName || ""} ${
                                  user.lastName || ""
                                }`.trim()
                              : "—"}
                          </TableCell>
                          <TableCell>{user.email || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${
                                roleColors[user.role]
                              } text-white border-0`}
                            >
                              {user.role.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.deactivatedAt
                              ? new Date(
                                  user.deactivatedAt
                                ).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                reactivateUserMutation.mutate(user.id)
                              }
                              disabled={reactivateUserMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reactivate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          No deactivated users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setIsAddUsernameManual(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. All users must be registered by admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-username">Username</Label>
                <Input
                  id="add-username"
                  value={addForm.username}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setAddForm({ ...addForm, username: nextValue });
                    setIsAddUsernameManual(nextValue.trim().length > 0);
                  }}
                  placeholder="Auto-generated from first/last name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">Password</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm({ ...addForm, password: e.target.value })
                  }
                  placeholder="Leave empty to auto-generate"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-firstName">First Name</Label>
                <Input
                  id="add-firstName"
                  value={addForm.firstName}
                  onChange={(e) => {
                    const nextFirstName = e.target.value;
                    setAddForm({
                      ...addForm,
                      firstName: nextFirstName,
                      username: isAddUsernameManual
                        ? addForm.username
                        : buildUsernameFromName(
                            nextFirstName,
                            addForm.lastName
                          ),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-lastName">Last Name</Label>
                <Input
                  id="add-lastName"
                  value={addForm.lastName}
                  onChange={(e) => {
                    const nextLastName = e.target.value;
                    setAddForm({
                      ...addForm,
                      lastName: nextLastName,
                      username: isAddUsernameManual
                        ? addForm.username
                        : buildUsernameFromName(
                            addForm.firstName,
                            nextLastName
                          ),
                    });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm({ ...addForm, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-role">Role *</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) =>
                  setAddForm({ ...addForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="lab_technician">Lab Technician</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Patient-specific fields */}
            {addForm.role === "patient" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">Patient Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-nic">NIC *</Label>
                    <Input
                      id="add-nic"
                      value={addForm.nic}
                      onChange={(e) =>
                        setAddForm({ ...addForm, nic: e.target.value })
                      }
                      placeholder="123456789V"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-rfid">RFID *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="add-rfid"
                        value={addForm.rfid}
                        onChange={(e) =>
                          setAddForm({ ...addForm, rfid: e.target.value })
                        }
                        placeholder="Tap Scan or enter manually"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={scanIntoAddRfid}
                        disabled={isAddRfidScanning}
                      >
                        <Scan className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-dateOfBirth">Date of Birth</Label>
                    <Input
                      id="add-dateOfBirth"
                      type="date"
                      value={addForm.dateOfBirth}
                      onChange={(e) =>
                        setAddForm({ ...addForm, dateOfBirth: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-gender">Gender</Label>
                    <Select
                      value={addForm.gender}
                      onValueChange={(value) =>
                        setAddForm({ ...addForm, gender: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-contactInfo">Contact Info</Label>
                  <Input
                    id="add-contactInfo"
                    value={addForm.contactInfo}
                    onChange={(e) =>
                      setAddForm({ ...addForm, contactInfo: e.target.value })
                    }
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-address">Address</Label>
                  <Input
                    id="add-address"
                    value={addForm.address}
                    onChange={(e) =>
                      setAddForm({ ...addForm, address: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-bloodType">Blood Group</Label>
                    <Select
                      value={addForm.bloodType}
                      onValueChange={(value) =>
                        setAddForm({ ...addForm, bloodType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-allergies">Allergies</Label>
                    <Input
                      id="add-allergies"
                      value={addForm.allergies}
                      onChange={(e) =>
                        setAddForm({ ...addForm, allergies: e.target.value })
                      }
                      placeholder="None, Penicillin, etc."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Doctor-specific fields */}
            {addForm.role === "doctor" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">Doctor Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-doctor-nic">NIC *</Label>
                    <Input
                      id="add-doctor-nic"
                      value={addForm.doctorNic}
                      onChange={(e) =>
                        setAddForm({ ...addForm, doctorNic: e.target.value })
                      }
                      placeholder="123456789V"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-doctor-gender">Gender *</Label>
                    <Select
                      value={addForm.doctorGender}
                      onValueChange={(value) =>
                        setAddForm({ ...addForm, doctorGender: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-specialization">Specialization *</Label>
                    <Input
                      id="add-specialization"
                      value={addForm.specialization}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          specialization: e.target.value,
                        })
                      }
                      placeholder="Cardiology"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-licenseNumber">License Number *</Label>
                    <Input
                      id="add-licenseNumber"
                      value={addForm.licenseNumber}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          licenseNumber: e.target.value,
                        })
                      }
                      placeholder="MD12345"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-qualifications">Qualifications</Label>
                  <Input
                    id="add-qualifications"
                    value={addForm.qualifications}
                    onChange={(e) =>
                      setAddForm({ ...addForm, qualifications: e.target.value })
                    }
                    placeholder="MBBS, MD"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-experience">Years of Experience</Label>
                  <Input
                    id="add-experience"
                    type="number"
                    value={addForm.experience}
                    onChange={(e) =>
                      setAddForm({ ...addForm, experience: e.target.value })
                    }
                    placeholder="5"
                  />
                </div>
              </div>
            )}

            {/* Pharmacist-specific fields */}
            {addForm.role === "pharmacist" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">Pharmacist Information</h4>
                <div className="space-y-2">
                  <Label htmlFor="add-pharm-license">License Number *</Label>
                  <Input
                    id="add-pharm-license"
                    value={addForm.licenseNumber}
                    onChange={(e) =>
                      setAddForm({ ...addForm, licenseNumber: e.target.value })
                    }
                    placeholder="PH12345"
                  />
                </div>
              </div>
            )}

            {/* Lab Technician-specific fields */}
            {addForm.role === "lab_technician" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">
                  Lab Technician Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-labTech-license">
                      License Number *
                    </Label>
                    <Input
                      id="add-labTech-license"
                      value={addForm.labTechLicenseNumber}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          labTechLicenseNumber: e.target.value,
                        })
                      }
                      placeholder="LT12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-labTech-specialization">
                      Specialization
                    </Label>
                    <Input
                      id="add-labTech-specialization"
                      value={addForm.labTechSpecialization}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          labTechSpecialization: e.target.value,
                        })
                      }
                      placeholder="Hematology"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={addUserMutation.isPending}
            >
              {addUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Update user information and role-specific details. Current values
              are shown below each field.
            </DialogDescription>
          </DialogHeader>
          {isLoadingUserData ? (
            <div className="flex items-center justify-center py-8">
              <div className="space-y-3 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">
                  Loading user details...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    placeholder={originalUserData?.firstName || "Not set"}
                    disabled={isLoadingUserData}
                  />
                  {originalUserData?.firstName && (
                    <p className="text-xs text-muted-foreground">
                      Current: {originalUserData.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    placeholder={originalUserData?.lastName || "Not set"}
                  />
                  {originalUserData?.lastName && (
                    <p className="text-xs text-muted-foreground">
                      Current: {originalUserData.lastName}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  placeholder={originalUserData?.email || "Not set"}
                />
                {originalUserData?.email && (
                  <p className="text-xs text-muted-foreground">
                    Current: {originalUserData.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, role: value })
                  }
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="lab_technician">
                      Lab Technician
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Role cannot be changed after creation
                </p>
              </div>

              {/* Patient-specific fields */}
              {editForm.role === "patient" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">Patient Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-nic">NIC</Label>
                      <Input
                        id="edit-nic"
                        value={editForm.nic}
                        onChange={(e) =>
                          setEditForm({ ...editForm, nic: e.target.value })
                        }
                        placeholder={
                          originalUserData?.roleData?.nic || "Not set"
                        }
                      />
                      {originalUserData?.roleData?.nic && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.nic}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-rfid">RFID</Label>
                      <div className="flex gap-2">
                        <Input
                          id="edit-rfid"
                          value={editForm.rfid}
                          onChange={(e) =>
                            setEditForm({ ...editForm, rfid: e.target.value })
                          }
                          placeholder={
                            originalUserData?.roleData?.rfid || "Not set"
                          }
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          onClick={scanIntoEditRfid}
                          disabled={isEditRfidScanning}
                        >
                          <Scan className="h-4 w-4" />
                        </Button>
                      </div>
                      {originalUserData?.roleData?.rfid && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.rfid}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
                      <Input
                        id="edit-dateOfBirth"
                        type="date"
                        value={editForm.dateOfBirth}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            dateOfBirth: e.target.value,
                          })
                        }
                      />
                      {originalUserData?.roleData?.dateOfBirth && (
                        <p className="text-xs text-muted-foreground">
                          Current:{" "}
                          {new Date(
                            originalUserData.roleData.dateOfBirth
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-gender">Gender</Label>
                      <Select
                        value={editForm.gender}
                        onValueChange={(value) =>
                          setEditForm({ ...editForm, gender: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {originalUserData?.roleData?.gender && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.gender}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contactInfo">Contact Info</Label>
                    <Input
                      id="edit-contactInfo"
                      value={editForm.contactInfo}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          contactInfo: e.target.value,
                        })
                      }
                      placeholder={
                        originalUserData?.roleData?.contactInfo || "Not set"
                      }
                    />
                    {originalUserData?.roleData?.contactInfo && (
                      <p className="text-xs text-muted-foreground">
                        Current: {originalUserData.roleData.contactInfo}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm({ ...editForm, address: e.target.value })
                      }
                      placeholder={
                        originalUserData?.roleData?.address || "Not set"
                      }
                    />
                    {originalUserData?.roleData?.address && (
                      <p className="text-xs text-muted-foreground">
                        Current: {originalUserData.roleData.address}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-bloodType">Blood Group</Label>
                      <Select
                        value={editForm.bloodType}
                        onValueChange={(value) =>
                          setEditForm({ ...editForm, bloodType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                      {originalUserData?.roleData?.bloodType && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.bloodType}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-allergies">Allergies</Label>
                      <Input
                        id="edit-allergies"
                        value={editForm.allergies}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            allergies: e.target.value,
                          })
                        }
                        placeholder={
                          originalUserData?.roleData?.allergies || "None"
                        }
                      />
                      {originalUserData?.roleData?.allergies && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.allergies}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor-specific fields */}
              {editForm.role === "doctor" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">Doctor Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-specialization">
                        Specialization
                      </Label>
                      <Input
                        id="edit-specialization"
                        value={editForm.specialization}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            specialization: e.target.value,
                          })
                        }
                        placeholder={
                          originalUserData?.roleData?.specialization ||
                          "Not set"
                        }
                      />
                      {originalUserData?.roleData?.specialization && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.specialization}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-licenseNumber">License Number</Label>
                      <Input
                        id="edit-licenseNumber"
                        value={editForm.licenseNumber}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            licenseNumber: e.target.value,
                          })
                        }
                        placeholder={
                          originalUserData?.roleData?.licenseNumber || "Not set"
                        }
                      />
                      {originalUserData?.roleData?.licenseNumber && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.licenseNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-qualifications">Qualifications</Label>
                    <Input
                      id="edit-qualifications"
                      value={editForm.qualifications}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          qualifications: e.target.value,
                        })
                      }
                      placeholder={
                        originalUserData?.roleData?.qualifications || "Not set"
                      }
                    />
                    {originalUserData?.roleData?.qualifications && (
                      <p className="text-xs text-muted-foreground">
                        Current: {originalUserData.roleData.qualifications}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-experience">
                        Years of Experience
                      </Label>
                      <Input
                        id="edit-experience"
                        type="number"
                        value={editForm.experience}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            experience: e.target.value,
                          })
                        }
                        placeholder={
                          originalUserData?.roleData?.experience?.toString() ||
                          "0"
                        }
                      />
                      {originalUserData?.roleData?.experience !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.experience} years
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-consultationFee">
                        Consultation Fee
                      </Label>
                      <Input
                        id="edit-consultationFee"
                        type="number"
                        step="0.01"
                        value={editForm.consultationFee}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            consultationFee: e.target.value,
                          })
                        }
                        placeholder={
                          originalUserData?.roleData?.consultationFee || "0.00"
                        }
                      />
                      {originalUserData?.roleData?.consultationFee && (
                        <p className="text-xs text-muted-foreground">
                          Current: $
                          {Number(
                            originalUserData.roleData.consultationFee
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Pharmacist-specific fields */}
              {editForm.role === "pharmacist" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">
                    Pharmacist Information
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pharm-license">License Number</Label>
                    <Input
                      id="edit-pharm-license"
                      value={editForm.pharmacistLicenseNumber}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          pharmacistLicenseNumber: e.target.value,
                        })
                      }
                      placeholder={
                        originalUserData?.roleData?.licenseNumber || "Not set"
                      }
                    />
                    {originalUserData?.roleData?.licenseNumber && (
                      <p className="text-xs text-muted-foreground">
                        Current: {originalUserData.roleData.licenseNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Lab Technician-specific fields */}
              {editForm.role === "lab_technician" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">
                    Lab Technician Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-labtech-spec">Specialization</Label>
                      <Input
                        id="edit-labtech-spec"
                        value={editForm.labTechSpecialization}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            labTechSpecialization: e.target.value,
                          })
                        }
                        placeholder={
                          originalUserData?.roleData?.specialization ||
                          "Not set"
                        }
                      />
                      {originalUserData?.roleData?.specialization && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.specialization}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-labtech-license">
                        License Number
                      </Label>
                      <Input
                        id="edit-labtech-license"
                        value={editForm.labTechLicenseNumber}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            labTechLicenseNumber: e.target.value,
                          })
                        }
                        placeholder={
                          originalUserData?.roleData?.licenseNumber || "Not set"
                        }
                      />
                      {originalUserData?.roleData?.licenseNumber && (
                        <p className="text-xs text-muted-foreground">
                          Current: {originalUserData.roleData.licenseNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateUserMutation.isPending || isLoadingUserData}
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the user{" "}
              <span className="font-semibold">{selectedUser?.username}</span>.{" "}
              The user will not be able to log in, but their data will be
              preserved. You can reactivate this user anytime from the
              Deactivated Users tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-orange-500 text-white hover:bg-orange-600"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending
                ? "Deactivating..."
                : "Deactivate User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Change Requests Dialog */}
      <Dialog
        open={changeRequestsDialogOpen}
        onOpenChange={setChangeRequestsDialogOpen}
      >
        <DialogContent className="max-w-6xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Pending Profile Change Requests</DialogTitle>
            <DialogDescription>
              Approve to update the database (and email the user). Reject to
              send a rejection email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => refetchChangeRequests()}
                disabled={isLoadingChangeRequests}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {isLoadingChangeRequests ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : pendingChangeRequests.length === 0 ? (
              <div className="text-muted-foreground">No pending requests.</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Old</TableHead>
                      <TableHead>New</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingChangeRequests.map((r) => {
                      const fullName = `${String(
                        r.requesterFirstName || ""
                      ).trim()} ${String(
                        r.requesterLastName || ""
                      ).trim()}`.trim();
                      const fieldLabel =
                        r.field === "bloodType"
                          ? "Blood Group"
                          : r.field === "dateOfBirth"
                          ? "Date of birth"
                          : r.field;

                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium">
                              {r.requesterUsername || r.requesterUserId}
                            </div>
                            {fullName ? (
                              <div className="text-xs text-muted-foreground">
                                {fullName}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="capitalize">
                            {r.role === "lab_technician"
                              ? "lab technician"
                              : r.role}
                          </TableCell>
                          <TableCell>{fieldLabel}</TableCell>
                          <TableCell className="max-w-[160px] truncate">
                            {r.oldValue || "—"}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate">
                            {r.newValue || "—"}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {r.reason || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-2">
                              {r.field === "healthId" || r.field === "rfid" ? (
                                <div className="w-[280px] max-w-full space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      placeholder={
                                        r.field === "healthId"
                                          ? "MV-xxxxxxxx (blank = auto-generate)"
                                          : "RFID UID (scan or type)"
                                      }
                                      value={
                                        getAdminAction(r.id).newValue ?? ""
                                      }
                                      onChange={(e) =>
                                        setAdminAction(r.id, {
                                          newValue: e.target.value,
                                        })
                                      }
                                    />

                                    {r.field === "healthId" ? (
                                      <Button
                                        type="button"
                                        variant={
                                          getAdminAction(r.id).generate
                                            ? "default"
                                            : "outline"
                                        }
                                        onClick={() =>
                                          setAdminAction(r.id, {
                                            generate: !getAdminAction(r.id)
                                              .generate,
                                          })
                                        }
                                      >
                                        {getAdminAction(r.id).generate
                                          ? "Generate: ON"
                                          : "Generate"}
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => scanRfidForRequest(r.id)}
                                        disabled={
                                          getAdminAction(r.id).scanning === true
                                        }
                                      >
                                        <Scan className="h-4 w-4 mr-2" />
                                        {getAdminAction(r.id).scanning
                                          ? "Scanning..."
                                          : "Scan"}
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {r.field === "healthId"
                                      ? "Leave blank to generate a new Health ID (MV-...)"
                                      : "Scan RFID tag, or enter UID manually"}
                                  </div>
                                </div>
                              ) : null}

                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    approveChangeRequestMutation.mutate({
                                      id: r.id,
                                      newValue: getAdminAction(r.id).newValue,
                                      generate: getAdminAction(r.id).generate,
                                    })
                                  }
                                  disabled={
                                    approveChangeRequestMutation.isPending
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedChangeRequest(r);
                                    setRejectDialogOpen(true);
                                    setRejectNotes("");
                                  }}
                                  disabled={
                                    rejectChangeRequestMutation.isPending
                                  }
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeRequestsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Provide a rejection reason to email the user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Rejection reason</Label>
            <Textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="min-h-[100px]"
              placeholder="Enter rejection reason"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedChangeRequest) return;
                rejectChangeRequestMutation.mutate({
                  id: selectedChangeRequest.id,
                  adminNotes: rejectNotes,
                });
              }}
              disabled={
                rejectChangeRequestMutation.isPending ||
                rejectNotes.trim().length === 0
              }
            >
              {rejectChangeRequestMutation.isPending
                ? "Rejecting..."
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
