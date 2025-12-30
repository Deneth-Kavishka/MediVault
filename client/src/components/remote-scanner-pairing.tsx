import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Wifi,
  WifiOff,
  CheckCircle,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCodeLib from "qrcode";

interface RemoteScannerPairingProps {
  onScanSuccess: (qrData: string) => void;
  onClose: () => void;
}

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "waiting_mobile"
  | "connected";

export function RemoteScannerPairing({
  onScanSuccess,
  onClose,
}: RemoteScannerPairingProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [pairingCode, setPairingCode] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>("");
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if WebSocket is available first
    fetch("/api/ws/health")
      .then((res) => res.json())
      .then((data) => {
        console.log("WebSocket health check:", data);
        connectWebSocket();
      })
      .catch((err) => {
        console.error("WebSocket health check failed:", err);
        toast({
          title: "Service Unavailable",
          description: "Scanner service is not available. Please check server.",
          variant: "destructive",
        });
        setStatus("disconnected");
      });

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    setStatus("connecting");

    // WebSocket server runs on dedicated port 5001 to avoid Vite HMR conflicts
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // Always use current hostname to ensure mobile can connect
    const wsHost = `${window.location.hostname}:5001`;
    const wsUrl = `${protocol}//${wsHost}`;

    console.log("Connecting to WebSocket:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected successfully");
        setStatus("waiting_mobile");
        // Request pairing code
        ws.send(JSON.stringify({ type: "pc_request_pairing" }));

        // Set up heartbeat to keep connection alive
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000); // Send ping every 25 seconds
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "pairing_code":
              setPairingCode(data.pairingCode);
              sessionIdRef.current = data.sessionId;
              setStatus("waiting_mobile");

              // Generate QR code for mobile pairing - use port 5000 where Express serves the app
              const pairingUrl = `${window.location.protocol}//${window.location.hostname}:5000/mobile-scanner?code=${data.pairingCode}`;
              const qrUrl = await QRCodeLib.toDataURL(pairingUrl, {
                width: 300,
                margin: 2,
                errorCorrectionLevel: "M",
              });
              setQrCodeUrl(qrUrl);

              // Check if using localhost
              const isLocalhost =
                window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1";

              toast({
                title: "Ready to Pair",
                description: isLocalhost
                  ? "Note: If mobile can't connect, access this page using your computer's IP address (e.g., 192.168.1.x) instead of localhost"
                  : "Scan QR code or enter code on mobile device",
                duration: isLocalhost ? 10000 : 3000,
              });
              break;

            case "mobile_connected":
              setStatus("connected");
              toast({
                title: "Mobile Connected",
                description: "You can now scan prescription QR codes",
              });
              break;

            case "mobile_disconnected":
              setStatus("waiting_mobile");
              toast({
                title: "Mobile Disconnected",
                description: "Please reconnect your mobile device",
                variant: "destructive",
              });
              break;

            case "scan_result":
              // QR code scanned from mobile
              console.log(
                "📥 PC: Received QR scan from mobile:",
                data.qrData.substring(0, 50) + "..."
              );
              onScanSuccess(data.qrData);
              toast({
                title: "✅ Prescription Received",
                description: "Data loaded. Mobile ready for next scan.",
                duration: 3000,
              });
              // Keep connection alive - don't close or disconnect
              break;

            default:
              console.log("Unknown message:", data.type);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        console.error("WebSocket URL:", wsUrl);
        console.error("WebSocket readyState:", ws.readyState);
        setStatus("disconnected");
        toast({
          title: "Connection Error",
          description:
            "Failed to connect to scanner service. Make sure the server is running.",
          variant: "destructive",
        });
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        setStatus("disconnected");
        if (!event.wasClean) {
          toast({
            title: "Connection Lost",
            description: "WebSocket connection closed unexpectedly.",
            variant: "destructive",
          });
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setStatus("disconnected");
      toast({
        title: "Connection Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initialize WebSocket",
        variant: "destructive",
      });
    }
  };

  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connectWebSocket();
  };

  const copyMobileUrl = () => {
    const url = `${window.location.protocol}//${window.location.hostname}:5000/mobile-scanner`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "URL Copied!",
      description: "Paste this in your mobile browser",
    });
  };

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Smartphone className="h-5 w-5" />
          Remote Mobile Scanner
        </CardTitle>
        <CardDescription>
          Connect your mobile phone as a QR scanner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {/* Localhost Warning */}
        {(window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1") && (
          <div className="bg-red-50 dark:bg-red-950 border-2 border-red-500 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-red-900 dark:text-red-100 text-base">
                  ⚠️ Cannot Use Mobile Scanner with Localhost
                </p>
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                  Mobile devices cannot access localhost. Follow these steps:
                </p>
                <div className="bg-red-100 dark:bg-red-900 rounded p-3 space-y-2">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                    1. Find Your PC's IP Address:
                  </p>
                  <code className="block bg-white dark:bg-black px-2 py-1 rounded text-xs">
                    ipconfig
                  </code>

                  <p className="text-sm font-semibold text-red-900 dark:text-red-100 pt-2">
                    2. Close This Tab and Open:
                  </p>
                  <code className="block bg-white dark:bg-black px-2 py-1 rounded text-xs">
                    http://[YOUR-IP]:5000
                  </code>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Example: http://192.168.1.100:5000
                  </p>

                  <p className="text-sm font-semibold text-red-900 dark:text-red-100 pt-2">
                    3. Then Use Mobile Camera
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {status === "connected" ? (
              <>
                <Wifi className="h-5 w-5 text-green-600" />
                <span className="font-medium">Connected</span>
              </>
            ) : status === "connecting" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="font-medium">Connecting...</span>
              </>
            ) : status === "waiting_mobile" ? (
              <>
                <Smartphone className="h-5 w-5 text-amber-600 animate-pulse" />
                <span className="font-medium">Waiting for Mobile</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-destructive" />
                <span className="font-medium">Disconnected</span>
              </>
            )}
          </div>
          <Badge variant={status === "connected" ? "default" : "secondary"}>
            {status === "connected" && <CheckCircle className="h-3 w-3 mr-1" />}
            {status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>

        {/* Pairing Instructions */}
        {status === "waiting_mobile" && (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your mobile device:
              </p>
              {qrCodeUrl && (
                <div className="bg-white p-6 rounded-lg inline-block shadow-lg">
                  <img
                    src={qrCodeUrl}
                    alt="Pairing QR Code"
                    className="w-64 h-64 sm:w-72 sm:h-72 mx-auto"
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter code manually
                </span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Pairing Code:
              </p>
              <div className="text-3xl sm:text-4xl font-bold tracking-wider text-primary bg-primary/10 py-3 px-4 rounded-lg">
                {pairingCode}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Enter this code on your mobile device
              </p>
            </div>
          </div>
        )}

        {/* Connected State */}
        {status === "connected" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-lg">Mobile Scanner Ready</p>
              <p className="text-sm text-muted-foreground">
                Use your mobile device to scan prescription QR codes
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {status === "disconnected" && (
            <Button onClick={reconnect} className="flex-1 w-full">
              <Wifi className="h-4 w-4 mr-2" />
              Connect
            </Button>
          )}
          {status === "waiting_mobile" && (
            <Button
              onClick={reconnect}
              variant="outline"
              className="flex-1 w-full"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generate New Code
            </Button>
          )}
          <Button onClick={onClose} variant="outline" className="flex-1 w-full">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
