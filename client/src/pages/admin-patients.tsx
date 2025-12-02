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
  UserPlus,
  FileText,
  Download,
  Activity,
  Calendar,
  Phone,
  MapPin,
  Droplet,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Patient {
  id: string;
  userId: string;
  nic: string;
  healthId?: string;
  rfid: string;
  dateOfBirth?: string;
  gender?: string;
  contactInfo?: string;
  address?: string;
  bloodType?: string;
  allergies?: string;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username: string;
  };
}

export default function AdminPatients() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [bloodTypeFilter, setBloodTypeFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch patients
  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Filter patients
  const filteredPatients = patients?.filter((patient) => {
    const fullName = `${patient.user?.firstName || ""} ${
      patient.user?.lastName || ""
    }`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      patient.nic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.rfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBloodType =
      bloodTypeFilter === "all" || patient.bloodType === bloodTypeFilter;
    const matchesGender =
      genderFilter === "all" || patient.gender === genderFilter;

    return matchesSearch && matchesBloodType && matchesGender;
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

    // Create CSV content
    const headers = [
      "Name",
      "NIC",
      "RFID",
      "Email",
      "Contact",
      "Blood Type",
      "Gender",
      "Allergies",
    ];
    const rows = filteredPatients.map((p) => [
      `${p.user?.firstName || ""} ${p.user?.lastName || ""}`,
      p.nic,
      p.rfid,
      p.user?.email || "",
      p.contactInfo || "",
      p.bloodType || "",
      p.gender || "",
      p.allergies || "None",
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
          Manage all registered patients with RFID tracking and medical records
        </p>
      </div>

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
              Male Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients?.filter((p) => p.gender === "male").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Female Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients?.filter((p) => p.gender === "female").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients?.filter(
                (p) =>
                  p.allergies && p.allergies !== "None" && p.allergies !== ""
              ).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Patients</CardTitle>
              <CardDescription>
                View and manage patient records with RFID tracking
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
                placeholder="Search by name, NIC, RFID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={bloodTypeFilter} onValueChange={setBloodTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Blood Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blood Types</SelectItem>
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
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>NIC</TableHead>
                  <TableHead>RFID</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Blood Type</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Allergies</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients && filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">
                            {patient.user?.firstName} {patient.user?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {patient.user?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{patient.nic}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/10">
                          {patient.rfid}
                        </Badge>
                      </TableCell>
                      <TableCell>{patient.contactInfo || "—"}</TableCell>
                      <TableCell>
                        {patient.bloodType ? (
                          <Badge variant="secondary">{patient.bloodType}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {patient.gender || "—"}
                      </TableCell>
                      <TableCell>
                        {patient.allergies &&
                        patient.allergies !== "None" &&
                        patient.allergies !== "" ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Yes</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(patient)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
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

      {/* Patient Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>
              Complete patient information and medical records
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Personal Information</TabsTrigger>
                <TabsTrigger value="medical">Medical Information</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedPatient.user?.firstName}{" "}
                      {selectedPatient.user?.lastName}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <p>{selectedPatient.user?.email || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      NIC
                    </label>
                    <p>{selectedPatient.nic}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      RFID Tag
                    </label>
                    <Badge variant="outline" className="bg-primary/10">
                      {selectedPatient.rfid}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Health ID
                    </label>
                    <p>{selectedPatient.healthId || "—"}</p>
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
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Gender
                    </label>
                    <p className="capitalize">
                      {selectedPatient.gender || "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact
                    </label>
                    <p>{selectedPatient.contactInfo || "—"}</p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </label>
                    <p>{selectedPatient.address || "—"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Droplet className="h-4 w-4" />
                      Blood Type
                    </label>
                    {selectedPatient.bloodType ? (
                      <Badge variant="secondary" className="text-lg">
                        {selectedPatient.bloodType}
                      </Badge>
                    ) : (
                      <p className="text-muted-foreground">Not specified</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Registered Date
                    </label>
                    <p>
                      {new Date(selectedPatient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Allergies
                    </label>
                    {selectedPatient.allergies &&
                    selectedPatient.allergies !== "None" &&
                    selectedPatient.allergies !== "" ? (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-destructive font-medium">
                          {selectedPatient.allergies}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No known allergies
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Appointments
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Medical Records
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
