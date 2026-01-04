import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scan } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { isWebSerialSupported, scanRfidOnce } from "@/lib/rfid-serial";

type AddUserFormState = {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  nic: string;
  rfid: string;
  dateOfBirth: string;
  gender: string;
  contactInfo: string;
  address: string;
  bloodType: string;
  allergies: string;
  doctorNic: string;
  doctorGender: string;
  specialization: string;
  licenseNumber: string;
  qualifications: string;
  experience: string;
  labTechSpecialization: string;
  labTechLicenseNumber: string;
};

const DEFAULT_FORM: AddUserFormState = {
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
};

function buildUsernameFromName(firstName: string, lastName: string) {
  const base =
    `${firstName || ""}.${lastName || ""}`
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "")
      .slice(0, 24) || "user";
  return base;
}

export function AdminAddUserDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, onOpenChange } = props;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddRfidScanning, setIsAddRfidScanning] = useState(false);
  const [isAddUsernameManual, setIsAddUsernameManual] = useState(false);
  const [addForm, setAddForm] = useState<AddUserFormState>(DEFAULT_FORM);

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

  const addUserMutation = useMutation({
    mutationFn: async (userData: AddUserFormState) => {
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

      if (userData.role === "patient") {
        payload.patientData = {
          nic: userData.nic,
          rfid: userData.rfid,
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
    onSuccess: (data: any, variables: AddUserFormState) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });

      const temporaryPassword =
        typeof data?.temporaryPassword === "string" && data.temporaryPassword
          ? data.temporaryPassword
          : typeof variables?.password === "string"
          ? variables.password
          : "";

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

      onOpenChange(false);
      setIsAddUsernameManual(false);
      setAddForm(DEFAULT_FORM);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
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

  const handleAddSubmit = () => {
    if (!addForm.role) {
      toast({
        title: "Validation Error",
        description: "Role is required",
        variant: "destructive",
      });
      return;
    }

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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setIsAddUsernameManual(false);
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
                      : buildUsernameFromName(nextFirstName, addForm.lastName),
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
                      : buildUsernameFromName(addForm.firstName, nextLastName),
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
              onValueChange={(value) => setAddForm({ ...addForm, role: value })}
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

          {addForm.role === "lab_technician" && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm">
                Lab Technician Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-labTech-license">License Number *</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
