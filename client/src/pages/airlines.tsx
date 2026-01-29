import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Plus, Pencil, Search, Plane, Image } from "lucide-react";
import { insertAirlineSchema, type Airline } from "@shared/schema";

const formSchema = insertAirlineSchema.extend({
  code: z.string().min(2, "Code must be 2-3 characters").max(3, "Code must be 2-3 characters").transform(v => v.toUpperCase()),
});

type FormData = z.infer<typeof formSchema>;

export default function Airlines() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAirline, setEditingAirline] = useState<Airline | null>(null);

  const isSuperAdmin = user?.role === "superadmin";

  const { data: airlines = [], isLoading } = useQuery<Airline[]>({
    queryKey: ["/api/airlines"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      logo: "",
      active: true,
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      logo: "",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/airlines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/airlines"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Airline Created",
        description: "The airline has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create airline.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      return apiRequest("PATCH", `/api/airlines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/airlines"] });
      setIsEditOpen(false);
      setEditingAirline(null);
      toast({
        title: "Airline Updated",
        description: "The airline has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update airline.",
        variant: "destructive",
      });
    },
  });

  const filteredAirlines = airlines.filter(airline =>
    airline.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    airline.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditDialog = (airline: Airline) => {
    setEditingAirline(airline);
    editForm.reset({
      name: airline.name,
      code: airline.code,
      logo: airline.logo || "",
      active: airline.active,
    });
    setIsEditOpen(true);
  };

  const onCreateSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    if (editingAirline) {
      updateMutation.mutate({ id: editingAirline.id, data });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plane className="w-8 h-8" />
            Airlines
          </h1>
          <p className="text-muted-foreground">Manage your airline database</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-airline">
            <Plus className="w-4 h-4 mr-2" />
            Add Airline
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search airlines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-airlines"
              />
            </div>
            <Badge variant="secondary">{filteredAirlines.length} airlines</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAirlines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No airlines found</p>
              <p className="text-sm">Add your first airline to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Logo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    {isSuperAdmin && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAirlines.map((airline) => (
                    <TableRow key={airline.id} data-testid={`row-airline-${airline.id}`}>
                      <TableCell>
                        {airline.logo ? (
                          <img
                            src={airline.logo}
                            alt={airline.name}
                            className="w-10 h-8 object-contain rounded"
                          />
                        ) : (
                          <div className="w-10 h-8 bg-muted rounded flex items-center justify-center">
                            <Plane className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{airline.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{airline.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={airline.active ? "default" : "secondary"}>
                          {airline.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(airline)}
                            data-testid={`button-edit-airline-${airline.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Airline Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Airline</DialogTitle>
            <DialogDescription>
              Add a new airline to the system.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Emirates"
                        {...field}
                        data-testid="input-airline-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IATA Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. EK"
                        maxLength={3}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        data-testid="input-airline-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="https://example.com/logo.png"
                            className="pl-10"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-airline-logo"
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Inactive airlines won't appear in selection lists
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        data-testid="switch-airline-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsCreateOpen(false);
                    form.reset();
                  }}
                  data-testid="button-cancel-add-airline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-add-airline"
                >
                  {createMutation.isPending ? "Creating..." : "Create Airline"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Airline Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Airline</DialogTitle>
            <DialogDescription>
              Update the airline details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Emirates"
                        {...field}
                        data-testid="input-edit-airline-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IATA Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. EK"
                        maxLength={3}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        data-testid="input-edit-airline-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="https://example.com/logo.png"
                            className="pl-10"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-edit-airline-logo"
                          />
                        </div>
                        {field.value && (
                          <img
                            src={field.value}
                            alt="Preview"
                            className="w-10 h-8 object-contain rounded border"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Inactive airlines won't appear in selection lists
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-airline-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingAirline(null);
                  }}
                  data-testid="button-cancel-edit-airline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit-airline"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
