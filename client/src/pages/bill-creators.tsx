import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Plus, Lock, Shield, Loader2, User, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { BillCreator } from "@shared/schema";

const createBillCreatorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d{4}$/, "PIN must be numeric"),
});

type CreateBillCreatorForm = z.infer<typeof createBillCreatorSchema>;

export default function BillCreatorsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: billCreators = [], isLoading } = useQuery<BillCreator[]>({
    queryKey: ["/api/bill-creators"],
  });

  const form = useForm<CreateBillCreatorForm>({
    resolver: zodResolver(createBillCreatorSchema),
    defaultValues: {
      name: "",
      pin: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateBillCreatorForm) => {
      const res = await apiRequest("POST", "/api/bill-creators", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bill-creators"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Bill creator added",
        description: "The bill creator has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bill creator",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/bill-creators/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bill-creators"] });
      toast({
        title: "Status updated",
        description: "The bill creator status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateBillCreatorForm) => {
    createMutation.mutate(data);
  };

  const handleToggle = (creator: BillCreator) => {
    toggleMutation.mutate({ id: creator.id, active: !creator.active });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-bill-creators-title">Bill Creators</h1>
          <p className="text-sm text-muted-foreground">Manage staff who can create invoices and issue tickets</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-bill-creator">
          <Plus className="w-4 h-4 mr-2" />
          Add Bill Creator
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            PIN Authentication
          </CardTitle>
          <CardDescription>
            Bill creators must authenticate with their 4-digit PIN before creating invoices or issuing tickets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : billCreators.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No bill creators found</p>
              <p className="text-sm">Add your first bill creator to enable PIN authentication</p>
            </div>
          ) : (
            <div className="space-y-4">
              {billCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-md border"
                  data-testid={`row-bill-creator-${creator.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{creator.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        PIN: ****
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {creator.active ? (
                      <Badge variant="default" size="sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                    <Switch
                      checked={creator.active}
                      onCheckedChange={() => handleToggle(creator)}
                      disabled={toggleMutation.isPending}
                      data-testid={`switch-creator-active-${creator.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bill Creator</DialogTitle>
            <DialogDescription>
              Create a new bill creator with a 4-digit PIN for authentication.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Full name"
                        {...field}
                        data-testid="input-creator-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>4-Digit PIN *</FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={4}
                          value={field.value}
                          onChange={field.onChange}
                          data-testid="input-creator-pin"
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </FormControl>
                    <FormDescription className="text-center">
                      This PIN will be required to create invoices and issue tickets.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-creator"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-creator"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Add Bill Creator
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
