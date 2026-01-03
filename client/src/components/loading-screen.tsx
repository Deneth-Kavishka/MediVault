import { Activity } from "lucide-react";
import Landing3DAnimation from "@/components/landing-3d-animation";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="absolute inset-0">
        <Landing3DAnimation className="h-full w-full" />
        <div className="absolute inset-0 bg-background/70" />
      </div>

      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-primary/10">
            <Activity className="w-12 h-12 text-primary" />
          </div>

          <h2 className="text-2xl font-semibold text-foreground mb-2">
            MediVault
          </h2>

          <div className="text-sm text-muted-foreground">
            Loading your healthcare dashboard...
          </div>
        </div>
      </div>
    </div>
  );
}
