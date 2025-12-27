import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  Activity,
  FileText,
  Phone,
  MapPin,
  ShieldAlert,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Patient {
  id: string;
  userId: string;
  nic: string;
  rfid: string; // Masked for admin
  dateOfBirth?: string;
  gender?: string;
  contactInfo?: string;
  address?: string;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
}

export default function AdminPatients() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch patients (admin view - limited info only)
  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Filter patients
  const filteredPatients = patients?.filter((patient) => {
    const fullName = `${patient.firstName || ""} ${
      patient.lastName || ""
    }`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      patient.nic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGender =
      genderFilter === "all" || patient.gender === genderFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && patient.isActive) ||
      (statusFilter === "inactive" && !patient.isActive);

    return matchesSearch && matchesGender && matchesStatus;
  });

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setDetailsDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredPatients || filteredPatients.length === 0) {
      toast({
        title: "No Data",
        description: "No patients to export",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content (ADMIN VIEW - NO MEDICAL DATA)
    const headers = [
      "Patient ID",
      "Full Name",
      "NIC",
      "Date of Birth",
      "Gender",
      "Email",
      "Contact Number",
      "Address",
      "RFID (Masked)",
      "Status",
      "Registration Date",
    ];
    const rows = filteredPatients.map((p) => [
      p.id,
      `${p.firstName || ""} ${p.lastName || ""}`,
      p.nic,
      p.dateOfBirth
        ? new Date(p.dateOfBirth).toLocaleDateString()
        : "Not provided",
      p.gender || "Not specified",
      p.email || "",
      p.contactInfo || "",
      p.address || "",
      p.rfid, // Already masked from backend
      p.isActive ? "Active" : "Inactive",
      new Date(p.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patients-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Exported ${filteredPatients.length} patients`,
    });
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
          <Activity className="h-8 w-8 text-primary" />
          Patient Management
        </h1>
        <p className="text-muted-foreground">
          View and manage patient registration and account status
        </p>
      </div>

      {/* Privacy Notice */}
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <ShieldAlert className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Admin Access Notice:</strong> As an administrator, you have
          access to basic patient information only. Medical records, lab
          reports, prescriptions, and diagnosis history are restricted to
          authorized medical personnel.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {patients?.filter((p) => p.isActive).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {patients?.filter((p) => !p.isActive).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registered This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients?.filter((p) => {
                const createdDate = new Date(p.createdAt);
                const now = new Date();
                return (
                  createdDate.getMonth() === now.getMonth() &&
                  createdDate.getFullYear() === now.getFullYear()
                );
              }).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patient Registry</CardTitle>
              <CardDescription>
                Basic patient information and account management
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, NIC, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>NIC</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>RFID (Masked)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients && filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {patient.id.slice(0, 8)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {patient.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{patient.nic}</TableCell>
                      <TableCell>{patient.contactInfo || "—"}</TableCell>
                      <TableCell className="capitalize">
                        {patient.gender || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-muted font-mono text-xs"
                        >
                          {patient.rfid}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {patient.isActive ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(patient)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground"
                    >
                      No patients found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Details Dialog - ADMIN VIEW (NO MEDICAL DATA) */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Information</DialogTitle>
            <DialogDescription>
              Basic patient registration and contact details
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6">
              {/* Privacy Warning */}
              <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                <ShieldAlert className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900 dark:text-yellow-100">
                  Medical records, lab reports, and prescriptions are not
                  accessible to administrators. Contact authorized medical
                  personnel for medical data access.
                </AlertDescription>
              </Alert>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Patient ID
                    </label>
                    <Badge variant="outline" className="font-mono">
                      {selectedPatient.id}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Account Status
                    </label>
                    {selectedPatient.isActive ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Email Address
                    </label>
                    <p>{selectedPatient.email || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      National ID (NIC)
                    </label>
                    <p className="font-mono">{selectedPatient.nic}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </label>
                    <p>
                      {selectedPatient.dateOfBirth
                        ? new Date(
                            selectedPatient.dateOfBirth
                          ).toLocaleDateString()
                        : "Not provided"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Gender
                    </label>
                    <p className="capitalize">
                      {selectedPatient.gender || "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      RFID Code (Masked)
                    </label>
                    <Badge
                      variant="outline"
                      className="bg-muted font-mono text-xs"
                    >
                      {selectedPatient.rfid}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Number
                    </label>
                    <p>{selectedPatient.contactInfo || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Registration Date
                    </label>
                    <p>
                      {new Date(selectedPatient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </label>
                    <p>{selectedPatient.address || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Restricted Data Notice */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3 text-muted-foreground">
                  Restricted Information
                </h3>
                <div className="bg-muted p-4 rounded-md space-y-2">
                  <p className="text-sm text-muted-foreground">
                    ❌ Medical Records - Access Denied
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ❌ Lab Reports - Access Denied
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ❌ Prescriptions - Access Denied
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ❌ Diagnosis History - Access Denied
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ❌ Doctor Notes - Access Denied
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Admin users can only view basic patient information for system
                  management and user verification purposes in compliance with
                  data privacy regulations.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
