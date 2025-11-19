import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

export default function MedicalRecords() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const medicalRecords = [
    {
      id: "1",
      date: new Date(2025, 0, 15),
      doctorName: "Dr. Sarah Johnson",
      specialty: "Cardiology",
      diagnosis: "Hypertension - Stage 1",
      symptoms: "Headaches, dizziness",
      notes:
        "Blood pressure: 140/90 mmHg. Recommended lifestyle modifications and prescribed medication.",
      vitalSigns: {
        bloodPressure: "140/90",
        heartRate: "78 bpm",
        temperature: "98.6°F",
        weight: "165 lbs",
      },
    },
    {
      id: "2",
      date: new Date(2025, 0, 10),
      doctorName: "Dr. Michael Chen",
      specialty: "Neurology",
      diagnosis: "Migraine headaches",
      symptoms: "Severe headaches with visual disturbances",
      notes:
        "Patient reports recurring migraines. Prescribed preventive medication and lifestyle recommendations.",
      vitalSigns: {
        bloodPressure: "120/80",
        heartRate: "72 bpm",
        temperature: "98.4°F",
        weight: "165 lbs",
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Medical Records</h1>
        <p className="text-muted-foreground mt-1">
          Your complete medical history
        </p>
      </div>

      <div className="space-y-4">
        {medicalRecords.map((record) => (
          <Card
            key={record.id}
            className="hover-elevate transition-all duration-200"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {record.diagnosis}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {record.doctorName} - {record.specialty}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(record.date, "MMMM dd, yyyy")}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Record #{record.id}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Separator />

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Symptoms
                </h4>
                <p className="text-sm text-muted-foreground">
                  {record.symptoms}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Vital Signs
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      Blood Pressure
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {record.vitalSigns.bloodPressure}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      Heart Rate
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {record.vitalSigns.heartRate}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      Temperature
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {record.vitalSigns.temperature}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Weight</p>
                    <p className="text-sm font-medium text-foreground">
                      {record.vitalSigns.weight}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Notes
                </h4>
                <p className="text-sm text-muted-foreground">{record.notes}</p>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`button-view-${record.id}`}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Record
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`button-download-${record.id}`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
