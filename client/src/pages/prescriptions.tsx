import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Download, QrCode, User, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Prescriptions() {
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

  // Mock prescription data
  const prescriptions = [
    {
      id: "1",
      doctorName: "Dr. Sarah Johnson",
      dateIssued: new Date(2025, 0, 15),
      expiryDate: new Date(2025, 3, 15),
      status: "active",
      medicines: [
        {
          name: "Amoxicillin",
          dosage: "500mg",
          frequency: "3 times daily",
          duration: "7 days",
        },
        {
          name: "Ibuprofen",
          dosage: "400mg",
          frequency: "As needed",
          duration: "14 days",
        },
      ],
    },
    {
      id: "2",
      doctorName: "Dr. Michael Chen",
      dateIssued: new Date(2025, 0, 10),
      expiryDate: new Date(2025, 2, 10),
      status: "dispensed",
      medicines: [
        {
          name: "Metformin",
          dosage: "850mg",
          frequency: "2 times daily",
          duration: "30 days",
        },
      ],
    },
    {
      id: "3",
      doctorName: "Dr. Emily Davis",
      dateIssued: new Date(2024, 11, 20),
      expiryDate: new Date(2025, 0, 20),
      status: "expired",
      medicines: [
        {
          name: "Vitamin D3",
          dosage: "1000 IU",
          frequency: "Once daily",
          duration: "30 days",
        },
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "dispensed":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "expired":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Prescriptions</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your prescriptions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {prescriptions.map((prescription) => (
          <Card
            key={prescription.id}
            className="hover-elevate transition-all duration-200"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">
                    Prescription #{prescription.id}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {prescription.doctorName}
                  </p>
                </div>
                <Badge className={getStatusColor(prescription.status)}>
                  {prescription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    Issued: {format(prescription.dateIssued, "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    Expires: {format(prescription.expiryDate, "MMM dd, yyyy")}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-sm font-medium text-foreground mb-2">
                  Medications:
                </p>
                <div className="space-y-2">
                  {prescription.medicines.map((med, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <Pill className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {med.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {med.dosage} - {med.frequency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  data-testid={`button-view-qr-${prescription.id}`}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  data-testid={`button-download-${prescription.id}`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
