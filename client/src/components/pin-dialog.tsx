import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound } from "lucide-react";

type PinVerifyResult = {
  userId: string;
  username: string;
};

type PinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (result: PinVerifyResult) => void;
  title?: string;
  description?: string;
};

export function PinDialog({ open, onOpenChange, onVerified, title, description }: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!pin.trim()) {
      setError("Please enter your PIN");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const res = await apiRequest("POST", "/api/auth/verify-pin", { pin: pin.trim() });
      if (!res.ok) {
        setError("Invalid PIN. Please try again.");
        setIsVerifying(false);
        return;
      }
      const data = await res.json();
      if (data.success && data.user) {
        setPin("");
        setError("");
        onVerified({ userId: data.user.id, username: data.user.username });
        onOpenChange(false);
      } else {
        setError("Invalid PIN. Please try again.");
      }
    } catch {
      setError("Failed to verify PIN. Please try again.");
    }
    setIsVerifying(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPin("");
      setError("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            {title || "Enter Your PIN"}
          </DialogTitle>
          <DialogDescription>
            {description || "Enter your PIN code to continue. Your name will be recorded with this entry."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pin-input">PIN Code</Label>
            <Input
              id="pin-input"
              type="password"
              placeholder="Enter your PIN"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-center text-lg font-mono tracking-widest"
              data-testid="input-pin-code"
            />
            {error && (
              <p className="text-sm text-destructive" data-testid="text-pin-error">{error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} data-testid="button-pin-cancel">Cancel</Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying || !pin.trim()}
            data-testid="button-pin-verify"
          >
            {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
