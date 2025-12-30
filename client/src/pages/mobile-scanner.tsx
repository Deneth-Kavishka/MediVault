import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QRScanner } from "@/components/qr-scanner";
import { Smartphone, Wifi, WifiOff, CheckCircle, ScanLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ConnectionStatus = "disconnected" | "pairing" | "connected" | "scanning";

export default function MobileScanner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [pairingCode, setPairingCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>("");

  // Get pairing code from URL if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setPairingCode(code);
      // Auto-connect if code is in URL
      setTimeout(() => connectWithCode(code), 500);
    }
  }, []);

  const connectWithCode = (code: string) => {
    console.log("🔵 Mobile: Starting connection with code:", code);
    setStatus("pairing");

    // WebSocket server runs on dedicated port 5001 to avoid Vite HMR conflicts
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = `${window.location.hostname}:5001`;
    const wsUrl = `${protocol}//${wsHost}`;

    console.log("🔵 Mobile: Connecting to WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(
        "🟢 Mobile: WebSocket connected, sending pairing code:",
        code
      );
      // Send pairing code
      const message = {
        type: "mobile_pair",
        pairingCode: code,
      };
      console.log("📤 Mobile: Sending message:", JSON.stringify(message));
      ws.send(JSON.stringify(message));
    };

    ws.onmessage = (event) => {
      console.log("📥 Mobile: Received message:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("📋 Mobile: Parsed message type:", data.type);

        switch (data.type) {
          case "pairing_success":
            console.log("✅ Mobile: Pairing successful!");
            sessionIdRef.current = data.sessionId;
            setStatus("connected");
            toast({
              title: "Connected to PC",
              description: "Ready to scan prescription QR codes",
            });
            break;

          case "pairing_failed":
            console.log("❌ Mobile: Pairing failed:", data.message);
            setStatus("disconnected");
            toast({
              title: "Pairing Failed",
              description: data.message || "Invalid pairing code",
              variant: "destructive",
            });
            break;

          case "pc_disconnected":
            console.log("⚠️ Mobile: PC disconnected");
            setStatus("disconnected");
            toast({
              title: "PC Disconnected",
              description: "The PC has disconnected",
              variant: "destructive",
            });
            break;

          case "scan_sent":
            console.log("✅ Mobile: QR code sent successfully");
            toast({
              title: "✅ Success!",
              description: "Prescription sent to PC. Ready for next scan.",
              duration: 3000,
            });
            // Keep scanner open and connection alive for next scan
            // Don't close scanner - pharmacist can scan multiple prescriptions
            break;

          default:
            console.log("❓ Mobile: Unknown message:", data.type);
        }
      } catch (error) {
        console.error("❌ Mobile: Error processing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ Mobile: WebSocket error:", error);
      setStatus("disconnected");
      toast({
        title: "Connection Error",
        description: "Failed to connect to scanner service",
        variant: "destructive",
      });
    };

    ws.onclose = (event) => {
      console.log(
        "🔴 Mobile: WebSocket closed. Code:",
        event.code,
        "Reason:",
        event.reason
      );
      setStatus("disconnected");
    };
  };

  const handlePair = () => {
    if (pairingCode.length === 6) {
      connectWithCode(pairingCode);
    } else {
      toast({
        title: "Invalid Code",
        description: "Pairing code must be 6 digits",
        variant: "destructive",
      });
    }
  };

  const handleScan = (qrData: string) => {
    console.log("🔵 handleScan called with:", qrData.substring(0, 50) + "...");
    console.log("🔍 WebSocket state:", wsRef.current?.readyState);
    console.log("🔍 Session ID:", sessionIdRef.current);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: "mobile_scan_result",
        sessionId: sessionIdRef.current,
        qrData,
      };
      console.log(
        "📤 Mobile: Sending message:",
        JSON.stringify(message).substring(0, 100)
      );
      wsRef.current.send(JSON.stringify(message));

      // Show immediate feedback
      toast({
        title: "📤 Sending to PC",
        description: "Prescription data is being sent...",
      });
    } else {
      console.error(
        "❌ Mobile: WebSocket not connected! State:",
        wsRef.current?.readyState
      );
      console.error("❌ WebSocket.OPEN constant:", WebSocket.OPEN);
      toast({
        title: "Connection Error",
        description: `Not connected to PC. WebSocket state: ${wsRef.current?.readyState}`,
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setStatus("disconnected");
    setPairingCode("");
    sessionIdRef.current = "";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-6 w-6" />
              Mobile QR Scanner
            </CardTitle>
            <CardDescription>
              Connect to PC and scan prescription QR codes
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {status === "connected" ? (
                  <>
                    <Wifi className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Connected to PC</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Not Connected</span>
                  </>
                )}
              </div>
              <Badge variant={status === "connected" ? "default" : "secondary"}>
                {status === "connected" && (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                {status.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pairing Form */}
        {status === "disconnected" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enter Pairing Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code shown on the PC screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pairingCode">Pairing Code</Label>
                <Input
                  id="pairingCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={pairingCode}
                  onChange={(e) =>
                    setPairingCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center text-2xl tracking-widest font-bold"
                />
              </div>
              <Button
                onClick={handlePair}
                className="w-full"
                disabled={pairingCode.length !== 6 || status === "pairing"}
              >
                {status === "pairing" ? "Connecting..." : "Connect to PC"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scanner Controls */}
        {status === "connected" && !showScanner && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <ScanLine className="h-10 w-10 text-primary" />
                </div>
                <p className="font-semibold text-lg">Ready to Scan</p>
                <p className="text-sm text-muted-foreground">
                  Tap the button below to start scanning
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowScanner(true)}
                  className="w-full"
                  size="lg"
                >
                  <ScanLine className="h-5 w-5 mr-2" />
                  Start Scanning
                </Button>
                <Button
                  onClick={() => handleScan("TEST-QR-DATA-12345")}
                  variant="secondary"
                  className="w-full"
                  size="sm"
                >
                  🧪 Test Send Data
                </Button>
                <Button
                  onClick={disconnect}
                  variant="outline"
                  className="w-full"
                >
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Scanner */}
        {showScanner && (
          <Card>
            <CardContent className="pt-6">
              <QRScanner
                onScanSuccess={handleScan}
                onClose={() => setShowScanner(false)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
