import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, X, ScanLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsQR from "jsqr";

interface QRScannerProps {
  onScanSuccess: (qrData: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startScanning = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      // Request camera permission with fallback constraints
      let stream: MediaStream;
      try {
        // Try with back camera first (for mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (e) {
        console.log("Back camera not available, trying front camera:", e);
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);

        // Wait for video to be ready before scanning
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          scanQRCode();
        };
      }
    } catch (error: any) {
      console.error("Error accessing camera:", error);

      let errorMessage = "Unable to access camera. ";
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        errorMessage += "Please allow camera access in your browser settings.";
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        errorMessage += "No camera found on this device.";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        errorMessage += "Camera is already in use by another application.";
      } else if (error.message === "Camera API not supported in this browser") {
        errorMessage =
          "Live camera requires HTTPS or special browser settings. Use 'Upload QR Code Photo' instead - it works the same way!";
      } else {
        errorMessage +=
          error.message || "Please check permissions and try again.";
      }

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
    }
  };

  const scanQRCode = () => {
    if (
      videoRef.current &&
      canvasRef.current &&
      videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
    ) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          console.log(
            "📷 QR Code detected:",
            code.data.substring(0, 50) + "..."
          );
          setScannedData(code.data);
          onScanSuccess(code.data);

          // Don't stop scanning or show toast - let the parent (mobile-scanner) handle feedback
          // This allows continuous scanning without restarting camera

          // Brief pause before next scan to avoid duplicate scans
          setTimeout(() => {
            setScannedData(null);
          }, 2000);
          return;
        }
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode);
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show processing message
    toast({
      title: "Processing Image",
      description: "Scanning QR code from photo...",
    });

    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            if (ctx) {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);

              const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
              );
              const code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height
              );

              if (code) {
                console.log(
                  "📸 QR Code from uploaded image:",
                  code.data.substring(0, 50) + "..."
                );
                setScannedData(code.data);
                onScanSuccess(code.data);

                // Don't close - ready for next upload
                // Clear the file input so same file can be uploaded again
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }

                // Clear scanned data after brief delay
                setTimeout(() => {
                  setScannedData(null);
                }, 3000);
              } else {
                toast({
                  title: "No QR Code Found",
                  description:
                    "Could not detect a QR code in the image. Make sure the QR code is clear and well-lit.",
                  variant: "destructive",
                  duration: 5000,
                });
              }
            }
          }
        };
        img.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading image:", error);
      toast({
        title: "Upload Error",
        description: "Failed to read the image file.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Don't auto-start scanning - let user choose between camera and upload
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="w-full space-y-4">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan Prescription QR Code
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopScanning();
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isScanning ? (
            <div className="text-center py-8 space-y-4">
              <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Choose a method to scan the QR code
              </p>

              <div className="space-y-3">
                <Button onClick={startScanning} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Use Live Camera
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Upload QR Code Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                💡 Tip: If live camera doesn't work, use "Upload Photo" to take
                a picture with your camera app
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-primary rounded-lg animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  Scanning...
                </Badge>
                <Button variant="outline" onClick={stopScanning}>
                  Stop Scanning
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Position the QR code within the frame
              </p>
            </div>
          )}

          {scannedData && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                QR Code Detected
              </p>
              <p className="text-xs text-green-700 mt-1 font-mono break-all">
                {scannedData}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default QRScanner;
