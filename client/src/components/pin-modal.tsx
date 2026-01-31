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

type SimpleBillCreator = { id: string; name: string; active?: boolean };

interface PinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PinModal({ open, onOpenChange, onSuccess }: PinModalProps) {
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { authenticate } = usePin();

  const { data: billCreators = [], isLoading: isLoadingCreators } = useQuery<SimpleBillCreator[]>({
    queryKey: ["/api/bill-creators-from-users"],
    enabled: open,
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
    if (pin.length === 8 && selectedCreatorId) {
      verifyMutation.mutate({ creatorId: selectedCreatorId, pin });
    }
  }, [pin, selectedCreatorId]);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError("");
      setSelectedCreatorId("");
    }
  }, [open]);

  const activeCreators = billCreators.filter((c) => c.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            PIN Authentication
          </DialogTitle>
          <DialogDescription>
            Select your staff account and enter your 8-digit PIN to create bills.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bill-creator">Staff Member</Label>
            {isLoadingCreators ? (
              <div className="flex items-center gap-2 h-10 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : activeCreators.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No staff with PIN found. Please set a PIN in Admin Settings.
              </div>
            ) : (
              <Select
                value={selectedCreatorId}
                onValueChange={(value) => {
                  setSelectedCreatorId(value);
                  setPin("");
                  setError("");
                }}
              >
                <SelectTrigger data-testid="select-bill-creator">
                  <SelectValue placeholder="Select bill creator" />
                </SelectTrigger>
                <SelectContent>
                  {activeCreators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedCreatorId && (
            <div className="flex flex-col items-center gap-4">
              <Label>Enter PIN</Label>
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
