import React, { useState } from "react";
import { Link } from "wouter";
import { useListClients, useDeleteClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, Building2, User, CreditCard, Trash2, Eye, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function ClientsList() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useListClients(search ? { search } : {});
  const deleteClient = useDeleteClient();

  const clients = data?.clients || [];

  function handleDelete(id: number, name: string) {
    if (!confirm(`Delete client "${name}"? This will unlink all their invoices.`)) return;
    deleteClient.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({ title: "Client Deleted" });
        },
        onError: () => {
          toast({ title: "Delete Failed", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} client{(data?.total ?? 0) !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No clients found</p>
          <p className="text-sm mt-1">Add your first client to get started.</p>
          <Link href="/clients/new">
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" /> Add Client
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white dark:bg-zinc-900 border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {(client as unknown as { clientType?: string }).clientType === "private" ? (
                    <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                      <User className="h-5 w-5 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-50 leading-tight">
                        {client.name}
                      </h3>
                      {(client as unknown as { clientType?: string }).clientType === "private" ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Private</span>
                      ) : (
                        <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-full font-medium">Corporate</span>
                      )}
                    </div>
                    {client.contactInfo && (
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {client.contactInfo}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {client.currency || "PKR"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>
                    Credit:{" "}
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {formatCurrency(client.creditLimit || 0, client.currency || "PKR")}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>
                    Cycle:{" "}
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {client.creditCycleDays ?? 30}d
                    </span>
                  </span>
                </div>
                <div className="col-span-2">
                  Svc Charge:{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {client.serviceChargePct ?? 0}%{" "}
                    on {client.serviceChargeBase === "base_fare_plus_taxes" ? "Fare+Tax" : "Base Fare"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t">
                <Link href={`/clients/${client.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> View Profile
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => handleDelete(client.id, client.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
