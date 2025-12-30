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
    if (!file) {
      console.log("❌ No file selected");
      return;
    }

    console.log("📸 File selected:", file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Show processing message
    toast({
      title: "Processing Image",
      description: "Scanning QR code from photo...",
    });

    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        console.log("📖 FileReader onload triggered");
        img.onload = () => {
          console.log(
            "🖼️ Image loaded successfully:",
            img.width,
            "x",
            img.height
          );
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            if (ctx) {
              console.log("🎨 Canvas context obtained");
              // Set canvas size to match image
              canvas.width = img.width;
              canvas.height = img.height;

              // Draw the image
              ctx.drawImage(img, 0, 0);
              console.log("🖌️ Image drawn to canvas");

              // Try to scan the original image first
              console.log(
                "🔍 Starting QR code detection (attempt 1: no inversion)..."
              );
              let imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
              );
              let code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height,
                {
                  inversionAttempts: "dontInvert",
                }
              );
              console.log("Result:", code ? "✅ Found" : "❌ Not found");

              // If not found, try with inverted colors
              if (!code) {
                console.log("🔄 Trying with color inversion (attempt 2)...");
                code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "attemptBoth",
                });
                console.log("Result:", code ? "✅ Found" : "❌ Not found");
              }

              // If still not found, try with different scales
              if (!code && (img.width > 1000 || img.height > 1000)) {
                console.log(
                  "🔄 Image is large, trying with scaled down version (attempt 3)..."
                );
                const scale = 800 / Math.max(img.width, img.height);
                console.log("Scaling factor:", scale);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "attemptBoth",
                });
                console.log("Result:", code ? "✅ Found" : "❌ Not found");
              }

              if (code) {
                console.log("✅ QR Code detected from uploaded image!");
                console.log("📋 QR Code data:", code.data);
                console.log("📤 Calling onScanSuccess callback...");

                setScannedData(code.data);

                // Show success feedback immediately
                toast({
                  title: "✅ QR Code Detected!",
                  description: "Verifying prescription...",
                  duration: 2000,
                });

                // Call parent handler - THIS IS THE IMPORTANT PART
                try {
                  onScanSuccess(code.data);
                  console.log("✅ onScanSuccess called successfully");
                } catch (error) {
                  console.error("❌ Error in onScanSuccess:", error);
                }

                // Clear the file input so same file can be uploaded again
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }

                // Clear scanned data after brief delay
                setTimeout(() => {
                  setScannedData(null);
                }, 3000);
              } else {
                console.log("❌ No QR code detected in image");
                toast({
                  title: "No QR Code Found",
                  description:
                    "Could not detect a QR code in the image. Please ensure the QR code is clear, well-lit, and fills most of the frame.",
                  variant: "destructive",
                  duration: 6000,
                });

                // Clear the file input
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }
            }
          }
        };

        img.onerror = () => {
          console.error("❌ Failed to load image");
          toast({
            title: "Image Load Error",
            description:
              "Failed to load the image file. Please try another image.",
            variant: "destructive",
          });
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        };

        console.log("🔗 Setting image source...");
        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        console.error("❌ Failed to read file");
        toast({
          title: "File Read Error",
          description: "Failed to read the file. Please try again.",
          variant: "destructive",
        });
      };

      console.log("📖 Starting FileReader...");
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading image:", error);
      toast({
        title: "Upload Error",
        description: "Failed to read the image file.",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
      {/* Hidden canvas for image processing - always present */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-4">
        {!isScanning ? (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-base font-medium text-foreground mb-1">
                Choose Scanning Method
              </p>
              <p className="text-sm text-muted-foreground">
                Select how you want to scan the QR code
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <Button
                onClick={startScanning}
                className="w-full h-auto py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <Camera className="h-5 w-5 mr-2" />
                <span className="font-medium">Use Live Camera</span>
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground font-medium">
                    Or
                  </span>
                </div>
              </div>

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full h-auto py-3 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <Camera className="h-5 w-5 mr-2" />
                <span className="font-medium">Upload QR Code Photo</span>
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

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-md mx-auto">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                💡 <span className="font-medium">Tip:</span> If live camera
                doesn't work, use "Upload Photo" to take a picture with your
                camera app
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 sm:w-64 sm:h-64 border-4 border-blue-500 rounded-lg shadow-lg shadow-blue-500/50">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Scanning Active</span>
              </div>
              <Button
                variant="outline"
                onClick={stopScanning}
                size="sm"
                className="shadow-sm"
              >
                Stop
              </Button>
            </div>

            <div className="text-center bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                📷 Position the QR code within the highlighted frame
              </p>
            </div>
          </div>
        )}

        {scannedData && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">
              ✅ QR Code Detected
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1 font-mono break-all">
              {scannedData}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QRScanner;
