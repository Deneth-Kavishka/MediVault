import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Smartphone, Camera, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { QRScanner } from "@/components/qr-scanner";
import { RemoteScannerPairing } from "@/components/remote-scanner-pairing";
import PrescriptionDetailsDialog from "@/components/prescription-details-dialog";

export default function QRScannerPage() {
  const [activeTab, setActiveTab] = useState<"webcam" | "mobile">("webcam");
  const [isMobileConnected, setIsMobileConnected] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [showPrescriptionDetails, setShowPrescriptionDetails] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleQRScan = async (qrCode: string) => {
    console.log("🔍 handleQRScan called with QR code:", qrCode);

    try {
      console.log("📡 Sending API request to verify prescription...");

      // Use GET request with QR code in URL path
      const response = await fetch(
        `/api/prescriptions/scan/${encodeURIComponent(qrCode)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", errorText);
        let errorMessage = "Failed to verify prescription";

        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const prescription = await response.json();
      console.log("✅ Prescription received:", prescription);

      toast({
        title: "✅ Prescription Found",
        description: `Prescription for ${
          prescription.patientName || "patient"
        }`,
        duration: 3000,
      });

      setSelectedPrescription(prescription);
      setShowPrescriptionDetails(true);
    } catch (error: any) {
      console.error("❌ Error verifying prescription:", error);
      toast({
        title: "❌ Verification Failed",
        description: error.message || "Could not verify prescription",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Scan className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              QR Code Scanner
            </h1>
            <p className="text-muted-foreground">
              Scan prescription QR codes to verify and dispense medications
            </p>
          </div>
        </div>
      </div>

      {/* Main Scanner Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Prescription Scanner</CardTitle>
          <CardDescription className="text-base">
            Choose your preferred scanning method below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-auto p-1">
              <TabsTrigger
                value="webcam"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <Camera className="h-4 w-4" />
                <span className="font-medium">Webcam Scanner</span>
              </TabsTrigger>
              <TabsTrigger
                value="mobile"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                <Smartphone className="h-4 w-4" />
                <span className="font-medium">Mobile Scanner</span>
                {isMobileConnected && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="webcam" className="mt-6">
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Webcam Scanner
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Use your computer's webcam to scan QR codes in
                        real-time, or upload a photo of the QR code.
                      </p>
                    </div>
                  </div>
                </div>

                <QRScanner onScanSuccess={handleQRScan} onClose={() => {}} />
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="mt-6">
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        Mobile Scanner
                      </h3>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Connect your mobile phone and use it as a wireless
                        scanner. Perfect for scanning prescriptions from
                        patients.
                      </p>
                    </div>
                  </div>
                </div>

                <RemoteScannerPairing
                  onScanSuccess={handleQRScan}
                  onClose={() => {}}
                  onConnectionChange={setIsMobileConnected}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Scanner Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Good Lighting</p>
                <p className="text-xs text-muted-foreground">
                  Ensure the QR code is well-lit and not in shadow
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Hold Steady</p>
                <p className="text-xs text-muted-foreground">
                  Keep the QR code steady and centered in the frame
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Clear & Clean</p>
                <p className="text-xs text-muted-foreground">
                  Make sure the QR code is not damaged or dirty
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">4</span>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Right Distance</p>
                <p className="text-xs text-muted-foreground">
                  Position the camera 6-12 inches from the QR code
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescription Details Dialog */}
      {selectedPrescription && (
        <PrescriptionDetailsDialog
          open={showPrescriptionDetails}
          onClose={() => {
            setShowPrescriptionDetails(false);
            setSelectedPrescription(null);
            // Refresh prescription list after closing
            queryClient.invalidateQueries({
              queryKey: ["/api/prescriptions/pharmacist/recent"],
            });
            queryClient.invalidateQueries({
              queryKey: ["/api/prescriptions/pharmacist/stats"],
            });
          }}
          prescription={selectedPrescription}
        />
      )}
    </div>
  );
}
