import { useMemo, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { useLocation } from "wouter";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.src = url;
  });
}

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = 512,
  mime: "image/jpeg" | "image/webp" = "image/jpeg",
  quality = 0.9
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }

  // Draw cropped area scaled into a square canvas.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), mime, quality)
  );
  if (!blob) {
    throw new Error("Failed to create image");
  }
  return blob;
}

function initials(firstName?: string | null, lastName?: string | null) {
  const a = (firstName || "").trim();
  const b = (lastName || "").trim();
  const first = a ? a[0].toUpperCase() : "";
  const second = b ? b[0].toUpperCase() : "";
  return first + second || "U";
}

export function ProfileMenu() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [open, setOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>("avatar.png");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const currentUsername = String(user?.username || "");
  const avatarUrl = useMemo(() => {
    // Cache-bust on updates.
    return isAuthenticated
      ? `/api/profile/avatar?t=${avatarVersion}`
      : undefined;
  }, [isAuthenticated, avatarVersion]);

  const [username, setUsername] = useState(currentUsername);
  const [firstName, setFirstName] = useState(String(user?.firstName || ""));
  const [lastName, setLastName] = useState(String(user?.lastName || ""));
  const [email, setEmail] = useState(String(user?.email || ""));
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkUsernameMutation = useMutation({
    mutationFn: async (candidate: string) => {
      const u = candidate.trim();
      if (!u) throw new Error("Username is required");
      const res = await fetch(
        `/api/profile/username-available?username=${encodeURIComponent(u)}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to check username");
      }
      return (await res.json()) as { available: boolean };
    },
    onMutate: () => setUsernameStatus("checking"),
    onSuccess: (data) =>
      setUsernameStatus(data.available ? "available" : "taken"),
    onError: () => setUsernameStatus("invalid"),
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      };
      const res = await apiRequest("PATCH", "/api/profile", payload);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update profile",
        variant: "destructive",
      });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Avatar upload failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setAvatarVersion((v) => v + 1);
      toast({ title: "Profile picture updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Upload failed",
        description: err?.message || "Could not upload picture",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword || !newPassword) {
        throw new Error("Current and new password are required");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Password change failed",
        description: err?.message || "Could not change password",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) return null;

  const fallback = initials(user?.firstName, user?.lastName);

  const resetCropState = () => {
    setCropOpen(false);
    setCropImageSrc(null);
    setCropFileName("avatar.png");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Profile menu">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt="Profile" />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {user?.firstName || user?.lastName
              ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
              : user?.username}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setLocation("/profile");
            }}
          >
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setUsername(currentUsername);
              setFirstName(String(user?.firstName || ""));
              setLastName(String(user?.lastName || ""));
              setEmail(String(user?.email || ""));
              setUsernameStatus("idle");
              setOpen(true);
            }}
          >
            Profile settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profile settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} alt="Profile" />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatarMutation.isPending}
                >
                  Change picture
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCropImageSrc(String(reader.result || ""));
                      setCropFileName(file.name || "avatar.png");
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      setCroppedAreaPixels(null);
                      setCropOpen(true);
                    };
                    reader.onerror = () => {
                      toast({
                        title: "Failed to read image",
                        variant: "destructive",
                      });
                    };
                    reader.readAsDataURL(file);

                    // Allow selecting the same file again later.
                    e.currentTarget.value = "";
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameStatus("idle");
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => checkUsernameMutation.mutate(username)}
                  disabled={checkUsernameMutation.isPending}
                >
                  Check
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {usernameStatus === "checking" && "Checking..."}
                {usernameStatus === "available" && "Username is available"}
                {usernameStatus === "taken" && "Username is taken"}
                {usernameStatus === "invalid" && "Could not validate username"}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => saveProfileMutation.mutate()}
                disabled={saveProfileMutation.isPending}
              >
                Save
              </Button>
            </div>

            <div className="border-t pt-4" />

            <div className="space-y-3">
              <div className="font-medium">Change password</div>
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => changePasswordMutation.mutate()}
                  disabled={changePasswordMutation.isPending}
                >
                  Update password
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cropOpen}
        onOpenChange={(v) => {
          if (!v) resetCropState();
          else setCropOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crop profile picture</DialogTitle>
          </DialogHeader>

          {cropImageSrc ? (
            <div className="space-y-4">
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted">
                <Cropper
                  image={cropImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_a, pixels) => setCroppedAreaPixels(pixels)}
                />
              </div>

              <div className="space-y-2">
                <Label>Zoom</Label>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.01}
                  onValueChange={(v) => setZoom(v[0] ?? 1)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCropState}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    uploadAvatarMutation.isPending || !croppedAreaPixels
                  }
                  onClick={async () => {
                    try {
                      if (!cropImageSrc || !croppedAreaPixels) return;
                      // Prefer JPEG for much smaller uploads than PNG.
                      let size = 512;
                      let quality = 0.9;
                      let blob = await getCroppedBlob(
                        cropImageSrc,
                        croppedAreaPixels,
                        size,
                        "image/jpeg",
                        quality
                      );
                      // If still big, reduce quality / resolution.
                      const targetMax = 2 * 1024 * 1024; // ~2MB
                      if (blob.size > targetMax) {
                        quality = 0.8;
                        blob = await getCroppedBlob(
                          cropImageSrc,
                          croppedAreaPixels,
                          size,
                          "image/jpeg",
                          quality
                        );
                      }
                      if (blob.size > targetMax) {
                        quality = 0.7;
                        blob = await getCroppedBlob(
                          cropImageSrc,
                          croppedAreaPixels,
                          size,
                          "image/jpeg",
                          quality
                        );
                      }
                      if (blob.size > targetMax) {
                        size = 384;
                        quality = 0.8;
                        blob = await getCroppedBlob(
                          cropImageSrc,
                          croppedAreaPixels,
                          size,
                          "image/jpeg",
                          quality
                        );
                      }

                      const safeName = (cropFileName || "avatar.jpg").replace(
                        /\.(png|jpe?g|webp)$/i,
                        ".jpg"
                      );
                      const file = new File([blob], safeName, {
                        type: "image/jpeg",
                      });
                      uploadAvatarMutation.mutate(file, {
                        onSuccess: () => {
                          resetCropState();
                        },
                      });
                    } catch (err: any) {
                      toast({
                        title: "Crop failed",
                        description: err?.message || "Could not crop image",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Upload
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No image selected
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
