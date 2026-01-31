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
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePin } from "@/lib/pin-context";
import { useAuth } from "@/lib/auth-context";

type PinStatus = { hasPin: boolean; active: boolean; username: string };

interface PinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PinModal({ open, onOpenChange, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { authenticate } = usePin();
  const { user: currentUser } = useAuth();

  const { data: pinStatus, isLoading: isLoadingUser } = useQuery<PinStatus>({
    queryKey: ["/api/users/me/pin-status", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const res = await apiRequest("GET", `/api/users/me/pin-status?userId=${currentUser.id}`);
      return res.json();
    },
    enabled: open && !!currentUser?.id,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ creatorId, pin }: { creatorId: string; pin: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-pin", { creatorId, pin });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.billCreator) {
        authenticate(data.billCreator);
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
    if (pin.length === 8 && currentUser?.id) {
      verifyMutation.mutate({ creatorId: currentUser.id, pin });
    }
  }, [pin, currentUser?.id]);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError("");
    }
  }, [open]);

  const hasPin = pinStatus?.hasPin && pinStatus?.active;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            PIN Authentication
          </DialogTitle>
          <DialogDescription>
            Enter your 8-digit PIN to create bills.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {isLoadingUser ? (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : !hasPin ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">No PIN Set</p>
                <p className="text-sm text-muted-foreground">
                  Your account does not have a PIN configured. Please ask an admin to set your PIN in Settings.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted rounded-lg">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium" data-testid="text-current-user">
                  {currentUser?.username}
                </span>
              </div>

              <div className="flex flex-col items-center gap-4">
                <Label>Enter Your PIN</Label>
                <InputOTP
                  maxLength={8}
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
                    <InputOTPSlot index={5} />
                    <InputOTPSlot index={6} />
                    <InputOTPSlot index={7} />
                  </InputOTPGroup>
                </InputOTP>

                {verifyMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
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
