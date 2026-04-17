import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

export interface CreditNote {
  id: number;
  creditNoteNumber: string;
  clientId: number;
  clientName: string;
  invoiceId?: number | null;
  invoiceNumber?: string | null;
  type: string;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  currency: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ListCreditNotesParams {
  search?: string;
  clientId?: number;
  status?: string;
}

interface ListCreditNotesResponse {
  creditNotes: CreditNote[];
  total: number;
}

interface CreateCreditNoteBody {
  clientId: number;
  clientName: string;
  invoiceId?: number;
  invoiceNumber?: string;
  type: "excess_payment" | "refund_credit" | "manual_adjustment";
  amount: number;
  currency?: string;
  description?: string;
}

interface UpdateCreditNoteBody {
  description?: string;
  status?: "available" | "voided";
}

interface ApplyCreditNoteBody {
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
}

interface ClientCreditBalanceResponse {
  totalCredit: number;
  usedCredit: number;
  availableCredit: number;
  creditNotes: CreditNote[];
}

function listCreditNotes(params?: ListCreditNotesParams): Promise<ListCreditNotesResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.clientId) qs.set("clientId", String(params.clientId));
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return customFetch(`/api/credit-notes${query ? `?${query}` : ""}`, { responseType: "json" });
}

function getCreditNote(id: number): Promise<CreditNote> {
  return customFetch(`/api/credit-notes/${id}`, { responseType: "json" });
}

function createCreditNote(body: CreateCreditNoteBody): Promise<CreditNote> {
  return customFetch("/api/credit-notes", {
    method: "POST",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

function updateCreditNote(id: number, body: UpdateCreditNoteBody): Promise<CreditNote> {
  return customFetch(`/api/credit-notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

function deleteCreditNote(id: number): Promise<{ success: boolean }> {
  return customFetch(`/api/credit-notes/${id}`, {
    method: "DELETE",
    responseType: "json",
  });
}

function applyCreditNote(id: number, body: ApplyCreditNoteBody): Promise<CreditNote> {
  return customFetch(`/api/credit-notes/${id}/apply`, {
    method: "POST",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

function getClientCreditBalance(clientId: number): Promise<ClientCreditBalanceResponse> {
  return customFetch(`/api/clients/${clientId}/credit-balance`, { responseType: "json" });
}

export function getListCreditNotesQueryKey(params?: ListCreditNotesParams) {
  return params ? ["/api/credit-notes", params] : ["/api/credit-notes"];
}

export function getGetCreditNoteQueryKey(id: number) {
  return [`/api/credit-notes/${id}`];
}

export function getClientCreditBalanceQueryKey(clientId: number) {
  return [`/api/clients/${clientId}/credit-balance`];
}

export function useListCreditNotes(
  params?: ListCreditNotesParams,
  options?: Partial<UseQueryOptions<ListCreditNotesResponse, ErrorType<unknown>>>
) {
  return useQuery<ListCreditNotesResponse, ErrorType<unknown>>({
    queryKey: getListCreditNotesQueryKey(params),
    queryFn: () => listCreditNotes(params),
    ...options,
  });
}

export function useGetCreditNote(
  id: number,
  options?: Partial<UseQueryOptions<CreditNote, ErrorType<unknown>>>
) {
  return useQuery<CreditNote, ErrorType<unknown>>({
    queryKey: getGetCreditNoteQueryKey(id),
    queryFn: () => getCreditNote(id),
    enabled: id > 0,
    ...options,
  });
}

export function useClientCreditBalance(
  clientId: number,
  options?: Partial<UseQueryOptions<ClientCreditBalanceResponse, ErrorType<unknown>>>
) {
  return useQuery<ClientCreditBalanceResponse, ErrorType<unknown>>({
    queryKey: getClientCreditBalanceQueryKey(clientId),
    queryFn: () => getClientCreditBalance(clientId),
    enabled: clientId > 0,
    ...options,
  });
}

export function useCreateCreditNote(
  options?: UseMutationOptions<CreditNote, ErrorType<unknown>, CreateCreditNoteBody>
) {
  return useMutation<CreditNote, ErrorType<unknown>, CreateCreditNoteBody>({
    mutationFn: (body) => createCreditNote(body),
    ...options,
  });
}

export function useUpdateCreditNote(
  options?: UseMutationOptions<CreditNote, ErrorType<unknown>, { id: number; body: UpdateCreditNoteBody }>
) {
  return useMutation<CreditNote, ErrorType<unknown>, { id: number; body: UpdateCreditNoteBody }>({
    mutationFn: ({ id, body }) => updateCreditNote(id, body),
    ...options,
  });
}

export function useDeleteCreditNote(
  options?: UseMutationOptions<{ success: boolean }, ErrorType<unknown>, { id: number }>
) {
  return useMutation<{ success: boolean }, ErrorType<unknown>, { id: number }>({
    mutationFn: ({ id }) => deleteCreditNote(id),
    ...options,
  });
}

export function useApplyCreditNote(
  options?: UseMutationOptions<CreditNote, ErrorType<unknown>, { id: number; body: ApplyCreditNoteBody }>
) {
  return useMutation<CreditNote, ErrorType<unknown>, { id: number; body: ApplyCreditNoteBody }>({
    mutationFn: ({ id, body }) => applyCreditNote(id, body),
    ...options,
  });
}
