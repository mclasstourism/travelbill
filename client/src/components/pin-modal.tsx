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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePin } from "@/lib/pin-context";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, 'password' | 'twoFactorSecret'>;

interface PinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PinModal({ open, onOpenChange, onSuccess }: PinModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { authenticate } = usePin();

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

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
    if (pin.length === 5 && selectedUserId) {
      verifyMutation.mutate({ userId: selectedUserId, pin });
    }
  }, [pin, selectedUserId]);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError("");
      setSelectedUserId("");
    }
  }, [open]);

  const activeUsers = users.filter((u) => u.active !== false && u.pin);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            PIN Authentication
          </DialogTitle>
          <DialogDescription>
            Select your account and enter your 5-digit PIN to authenticate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-user">Staff Member</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={isLoadingUsers}
            >
              <SelectTrigger
                id="staff-user"
                data-testid="select-staff-user"
              >
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {activeUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUserId && (
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
          )}
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
