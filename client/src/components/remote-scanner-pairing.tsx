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
// @ts-ignore
import QRCodeLib from "qrcode";

interface RemoteScannerPairingProps {
  onScanSuccess: (qrData: string) => void;
  onClose: () => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "waiting_mobile"
  | "connected";

export function RemoteScannerPairing({
  onScanSuccess,
  onClose,
  onConnectionChange,
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

    // DON'T cleanup WebSocket on unmount - keep connection alive
    // Connection persists so mobile can continue scanning even if dialog is closed
    return () => {
      // Only cleanup heartbeat interval, keep WebSocket connection open
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // DO NOT close WebSocket here - connection should persist
      console.log("🔄 Dialog closed but keeping WebSocket connection alive");
    };
  }, []);

  const connectWebSocket = () => {
    setStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // Same-origin WebSocket (served by the main HTTP server)
    const wsUrl = `${protocol}//${window.location.host}/ws/scanner`;

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

              // Generate QR code for mobile pairing (same origin)
              const pairingUrl = `${window.location.origin}/mobile-scanner?code=${data.pairingCode}`;
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
              onConnectionChange?.(false);
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

  const disconnect = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
    onConnectionChange?.(false);
    toast({
      title: "Disconnected",
      description: "Scanner connection closed",
    });
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
    <div className="w-full space-y-4">
      {/* Localhost Warning */}
      {(window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1") && (
        <div className="bg-amber-50 dark:bg-amber-950 border-2 border-amber-500 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-bold text-amber-900 dark:text-amber-100 text-base">
                ⚠️ Cannot Use Mobile Scanner with Localhost
              </p>
              <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                Mobile devices cannot access localhost. Follow these steps:
              </p>
              <div className="bg-amber-100 dark:bg-amber-900 rounded p-3 space-y-2">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  1. Find Your PC's IP Address:
                </p>
                <code className="block bg-white dark:bg-black px-2 py-1 rounded text-xs">
                  ipconfig
                </code>

                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 pt-2">
                  2. Close This Tab and Open:
                </p>
                <code className="block bg-white dark:bg-black px-2 py-1 rounded text-xs">
                  http://[YOUR-IP]:5000
                </code>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Example: http://192.168.1.100:5000
                </p>

                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 pt-2">
                  3. Then Use Mobile Camera
                </p>
              </div>
            </div>
          </div>
        </div>
      )}{" "}
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
        <div className="flex items-center gap-3">
          {status === "connected" ? (
            <>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-semibold">Connected</span>
            </>
          ) : status === "connecting" ? (
            <>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold">Connecting...</span>
            </>
          ) : status === "waiting_mobile" ? (
            <>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <span className="font-semibold">Waiting for Mobile</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <WifiOff className="h-5 w-5 text-destructive" />
              </div>
              <span className="font-semibold">Disconnected</span>
            </>
          )}
        </div>
        <Badge
          variant={status === "connected" ? "default" : "secondary"}
          className="text-xs px-3 py-1"
        >
          {status === "connected" && <CheckCircle className="h-3 w-3 mr-1" />}
          {status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>
      {/* Pairing Instructions */}
      {status === "waiting_mobile" && (
        <div className="space-y-5">
          <div className="text-center space-y-4">
            <div>
              <p className="text-base font-semibold text-foreground mb-1">
                Connect Your Mobile Device
              </p>
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your mobile phone
              </p>
            </div>
            {qrCodeUrl && (
              <div className="bg-white dark:bg-gray-100 p-6 rounded-xl inline-block shadow-xl border-2 border-primary/20">
                <img
                  src={qrCodeUrl}
                  alt="Pairing QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 mx-auto"
                />
              </div>
            )}
          </div>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                Or enter code manually
              </span>
            </div>
          </div>

          <div className="text-center space-y-3 bg-primary/5 rounded-xl p-5 border-2 border-dashed border-primary/30">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pairing Code
            </p>
            <div className="text-4xl sm:text-5xl font-bold tracking-widest text-primary bg-background py-4 px-6 rounded-lg shadow-inner border-2 border-primary/20">
              {pairingCode}
            </div>
            <p className="text-xs text-muted-foreground">
              Enter this code on your mobile device
            </p>
          </div>
        </div>
      )}
      {/* Connected State */}
      {status === "connected" && (
        <div className="text-center space-y-5 py-8 bg-green-50 dark:bg-green-950 rounded-xl border-2 border-green-200 dark:border-green-800">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <p className="font-bold text-xl text-green-900 dark:text-green-100">
              Mobile Scanner Ready! ✓
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 max-w-sm mx-auto">
              Your mobile device is connected. Use it to scan prescription QR
              codes.
            </p>
          </div>
        </div>
      )}
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {status === "disconnected" && (
          <Button
            onClick={reconnect}
            className="flex-1 w-full h-auto py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
          >
            <Wifi className="h-4 w-4 mr-2" />
            <span className="font-medium">Connect</span>
          </Button>
        )}
        {status === "waiting_mobile" && (
          <Button
            onClick={reconnect}
            variant="outline"
            className="flex-1 w-full h-auto py-3 shadow-md hover:shadow-lg transition-all"
          >
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span className="font-medium">Generate New Code</span>
          </Button>
        )}
        {status === "connected" && (
          <Button
            onClick={disconnect}
            variant="destructive"
            className="flex-1 w-full h-auto py-3 shadow-md hover:shadow-lg transition-all"
          >
            <WifiOff className="h-4 w-4 mr-2" />
            <span className="font-medium">Disconnect Mobile</span>
          </Button>
        )}
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1 w-full h-auto py-3 shadow-md hover:shadow-lg transition-all"
        >
          <span className="font-medium">
            {status === "connected" ? "Hide (Keep Connected)" : "Close"}
          </span>
        </Button>
      </div>
    </div>
  );
}
