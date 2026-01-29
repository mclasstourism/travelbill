import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle, Loader2, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePin } from "@/lib/pin-context";
import { useAuth } from "@/lib/auth-context";

interface PinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PinModal({ open, onOpenChange, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { authenticate } = usePin();
  const { user } = useAuth();

  const verifyMutation = useMutation({
    mutationFn: async ({ userId, pin }: { userId: string; pin: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-user-pin", { userId, pin });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        authenticate(data.user);
        setPin("");
        setError("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError("Invalid PIN. Please try again.");
        setPin("");
      }
    },
    onError: () => {
      setError("Invalid PIN. Please try again.");
      setPin("");
    },
  });

  useEffect(() => {
    if (pin.length === 5 && user) {
      verifyMutation.mutate({ userId: user.id, pin });
    }
  }, [pin, user]);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            PIN Authentication
          </DialogTitle>
          <DialogDescription>
            Enter your 5-digit PIN to authenticate this transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {user && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{user.name || user.username}</p>
                <p className="text-sm text-muted-foreground">
                  {user.role === "superadmin" ? "Administrator" : "Staff"}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <Label>Enter 5-digit PIN</Label>
            <InputOTP
              maxLength={5}
              value={pin}
              onChange={setPin}
              disabled={verifyMutation.isPending}
              data-testid="input-pin"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
              </InputOTPGroup>
            </InputOTP>

            {verifyMutation.isPending && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-pin"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
