import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  UserSearch,
  ShieldCheck,
  Droplet,
  AlertCircle,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Activity,
  Scan,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
}

interface VerificationResponse {
  verified: boolean;
  patient: Patient;
}

export default function DoctorPatients() {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState("");
  const [nic, setNic] = useState("");
  const [rfid, setRfid] = useState("");
  const [verifiedPatient, setVerifiedPatient] = useState<Patient | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);

  // Verify patient mutation
  const verifyPatientMutation = useMutation({
    mutationFn: async (data: {
      patientId: string;
      nic: string;
      rfid: string;
    }) => {
      const response = await fetch("/api/patients/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
      }
      return response.json() as Promise<VerificationResponse>;
    },
    onSuccess: (data) => {
      setVerifiedPatient(data.patient);
      setSearchAttempted(true);
      toast({
        title: "Verification Successful",
        description:
          "Patient identity verified. Full medical records accessible.",
      });
    },
    onError: (error: Error) => {
      setVerifiedPatient(null);
      setSearchAttempted(true);
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    const hasPatientId = patientId.trim();
    const hasNic = nic.trim();
    const hasRfid = rfid.trim();

    if (!hasPatientId && !hasNic && !hasRfid) {
      toast({
        title: "Missing Information",
        description:
          "Please enter at least one identifier (Patient ID, NIC, or RFID).",
        variant: "destructive",
      });
      return;
    }

    verifyPatientMutation.mutate({
      patientId: hasPatientId || undefined,
      nic: hasNic || undefined,
      rfid: hasRfid || undefined,
    });
  };

  const handleReset = () => {
    setPatientId("");
    setNic("");
    setRfid("");
    setVerifiedPatient(null);
    setSearchAttempted(false);
  };

  const handleScanRFID = () => {
    toast({
      title: "RFID Scanner",
      description: "Connect RFID scanner and scan patient's card",
    });
    // TODO: Implement RFID scanner integration
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <UserSearch className="h-8 w-8 text-primary" />
          Patient Medical Records Access
        </h1>
        <p className="text-muted-foreground">
          Search and verify patients to access their medical records
        </p>
      </div>

      {/* Security Notice */}
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Privacy & Security:</strong> Search for a patient using any
          one identifier (Patient ID, NIC, or RFID) to access medical records.
          All access attempts are logged for audit compliance.
        </AlertDescription>
      </Alert>

      {/* Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Patient Verification
          </CardTitle>
          <CardDescription>
            Enter any one identifier to search and access patient medical
            records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Patient ID */}
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                placeholder="e.g., MV-P-001"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={verifyPatientMutation.isPending}
              />
            </div>

            {/* NIC */}
            <div className="space-y-2">
              <Label htmlFor="nic">National ID (NIC)</Label>
              <Input
                id="nic"
                placeholder="Enter NIC"
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                disabled={verifyPatientMutation.isPending}
              />
            </div>

            {/* RFID */}
            <div className="space-y-2">
              <Label htmlFor="rfid">RFID</Label>
              <div className="flex gap-2">
                <Input
                  id="rfid"
                  placeholder="Enter or Scan RFID"
                  value={rfid}
                  onChange={(e) => setRfid(e.target.value)}
                  disabled={verifyPatientMutation.isPending}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleScanRFID}
                  disabled={verifyPatientMutation.isPending}
                >
                  <Scan className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleVerify}
              disabled={verifyPatientMutation.isPending}
              className="flex-1"
            >
              {verifyPatientMutation.isPending ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verify Patient
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verification Failed */}
      {searchAttempted && !verifiedPatient && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Verification Failed:</strong> Patient not found with the
            provided identifier. Please check the information and try again. All
            search attempts are logged for security.
          </AlertDescription>
        </Alert>
      )}

      {/* Verified Patient Information */}
      {verifiedPatient && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="bg-green-50 dark:bg-green-950">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  Patient Verified Successfully
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Full medical records access granted
                </CardDescription>
              </div>
              <Badge className="bg-green-600">Verified</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="medical">Medical Information</TabsTrigger>
                <TabsTrigger value="records">Medical Records</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Patient ID
                    </label>
                    <Badge variant="outline" className="font-mono">
                      {verifiedPatient.id}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </label>
                    <p className="text-lg font-semibold">
                      {verifiedPatient.firstName} {verifiedPatient.lastName}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <p>{verifiedPatient.email || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      NIC
                    </label>
                    <p className="font-mono">{verifiedPatient.nic}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      RFID
                    </label>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 font-mono"
                    >
                      {verifiedPatient.rfid}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </label>
                    <p>
                      {verifiedPatient.dateOfBirth
                        ? new Date(
                            verifiedPatient.dateOfBirth
                          ).toLocaleDateString()
                        : "Not provided"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Gender
                    </label>
                    <p className="capitalize">
                      {verifiedPatient.gender || "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact
                    </label>
                    <p>{verifiedPatient.contactInfo || "—"}</p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </label>
                    <p>{verifiedPatient.address || "—"}</p>
                  </div>
                </div>
              </TabsContent>

              {/* Medical Information Tab */}
              <TabsContent value="medical" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Droplet className="h-4 w-4" />
                      Blood Type
                    </label>
                    {verifiedPatient.bloodType ? (
                      <Badge variant="secondary" className="text-lg">
                        {verifiedPatient.bloodType}
                      </Badge>
                    ) : (
                      <p className="text-muted-foreground">Not specified</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Health ID
                    </label>
                    <p className="font-mono">
                      {verifiedPatient.healthId || "—"}
                    </p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Allergies
                    </label>
                    {verifiedPatient.allergies &&
                    verifiedPatient.allergies !== "None" &&
                    verifiedPatient.allergies !== "" ? (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-destructive font-medium">
                          {verifiedPatient.allergies}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No known allergies
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Registration Date
                    </label>
                    <p>
                      {new Date(verifiedPatient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Account Status
                    </label>
                    {verifiedPatient.isActive ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View Medical History
                    </Button>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Appointments
                    </Button>
                    <Button variant="outline">
                      <Activity className="h-4 w-4 mr-2" />
                      View Lab Reports
                    </Button>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View Prescriptions
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Medical Records Tab */}
              <TabsContent value="records" className="space-y-4 mt-4">
                <Alert>
                  <AlertDescription>
                    Medical records, prescriptions, lab reports, and documents
                    will be displayed here. This section will show the patient's
                    complete medical history after full implementation of
                    document management.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
