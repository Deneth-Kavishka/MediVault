import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState("");

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { emailOrUsername: string }) => {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Failed to submit password reset request"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      setEmailOrUsername("");
      setTimeout(() => {
        setOpen(false);
      }, 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      return;
    }
    forgotPasswordMutation.mutate({ emailOrUsername: emailOrUsername.trim() });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog closes
      setEmailOrUsername("");
      forgotPasswordMutation.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="px-0 text-sm text-muted-foreground hover:text-primary"
        >
          Forgot your password?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Enter your email or username. An administrator will review your
            request and send you a temporary password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {forgotPasswordMutation.isSuccess ? (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {forgotPasswordMutation.data?.message ||
                  "Password reset request submitted successfully. Please wait for admin approval."}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="emailOrUsername">Email or Username</Label>
                <Input
                  id="emailOrUsername"
                  type="text"
                  placeholder="Enter your email or username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  disabled={forgotPasswordMutation.isPending}
                  required
                />
              </div>

              {forgotPasswordMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {forgotPasswordMutation.error?.message ||
                      "Failed to submit password reset request. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={forgotPasswordMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    forgotPasswordMutation.isPending || !emailOrUsername.trim()
                  }
                >
                  {forgotPasswordMutation.isPending
                    ? "Submitting..."
                    : "Submit Request"}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
