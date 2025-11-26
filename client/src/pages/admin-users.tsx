import { useState } from "react";
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
import { Search, UserPlus, Edit, Trash2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
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

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
    specialization: "",
    licenseNumber: "",
    qualifications: "",
    experience: "",
    // Pharmacist/Lab tech fields
    certificationNumber: "",
  });

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: [
      "/api/admin/users",
      roleFilter !== "all" ? { role: roleFilter } : {},
    ],
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const payload: any = {
        username: userData.username,
        password: userData.password,
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
          certificationNumber: userData.certificationNumber,
        };
      }

      return await api.post("/api/admin/users", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setAddDialogOpen(false);
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
        specialization: "",
        licenseNumber: "",
        qualifications: "",
        experience: "",
        certificationNumber: "",
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search and role
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({ id: selectedUser.id, data: editForm });
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.id);
  };

  const handleAddSubmit = () => {
    // Validate required fields
    if (!addForm.username || !addForm.password || !addForm.role) {
      toast({
        title: "Validation Error",
        description: "Username, password, and role are required",
        variant: "destructive",
      });
      return;
    }

    // Validate patient-specific fields
    if (addForm.role === "patient") {
      if (!addForm.nic || !addForm.rfid) {
        toast({
          title: "Validation Error",
          description: "NIC and RFID are required for patients",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate doctor-specific fields
    if (addForm.role === "doctor") {
      if (!addForm.specialization || !addForm.licenseNumber) {
        toast({
          title: "Validation Error",
          description:
            "Specialization and license number are required for doctors",
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
      <div className="grid gap-4 md:grid-cols-5">
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                View and manage all registered users in the system
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
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
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
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
                <Label htmlFor="add-username">Username *</Label>
                <Input
                  id="add-username"
                  value={addForm.username}
                  onChange={(e) =>
                    setAddForm({ ...addForm, username: e.target.value })
                  }
                  placeholder="john.doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">Password *</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm({ ...addForm, password: e.target.value })
                  }
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-firstName">First Name</Label>
                <Input
                  id="add-firstName"
                  value={addForm.firstName}
                  onChange={(e) =>
                    setAddForm({ ...addForm, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-lastName">Last Name</Label>
                <Input
                  id="add-lastName"
                  value={addForm.lastName}
                  onChange={(e) =>
                    setAddForm({ ...addForm, lastName: e.target.value })
                  }
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
                    <Input
                      id="add-rfid"
                      value={addForm.rfid}
                      onChange={(e) =>
                        setAddForm({ ...addForm, rfid: e.target.value })
                      }
                      placeholder="RF123456"
                    />
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
                    <Label htmlFor="add-bloodType">Blood Type</Label>
                    <Select
                      value={addForm.bloodType}
                      onValueChange={(value) =>
                        setAddForm({ ...addForm, bloodType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood type" />
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
                <div className="space-y-2">
                  <Label htmlFor="add-cert">Certification Number *</Label>
                  <Input
                    id="add-cert"
                    value={addForm.certificationNumber}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        certificationNumber: e.target.value,
                      })
                    }
                    placeholder="LT12345"
                  />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editForm.firstName}
                onChange={(e) =>
                  setEditForm({ ...editForm, firstName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={editForm.lastName}
                onChange={(e) =>
                  setEditForm({ ...editForm, lastName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="lab_technician">Lab Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user{" "}
              <span className="font-semibold">{selectedUser?.username}</span>{" "}
              and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
