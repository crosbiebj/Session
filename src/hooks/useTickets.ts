import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getTicketQrSignedUrl, uploadTicketQrCode } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, lakes(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, lakes(name)')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      const qrSignedUrl = await getTicketQrSignedUrl(data.qr_code_path);
      return { ...data, qrSignedUrl };
    },
    enabled: !!id,
  });
}

// "Whip out my ticket for the bailiff" — a screenshot of whatever QR the
// syndicate already issues, attached to the matching ticket.
export function useUpdateTicketQrCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { ticketId: string; base64: string; fileExtension: string }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const path = await uploadTicketQrCode({
        ownerId: userData.user.id,
        ticketId: input.ticketId,
        base64: input.base64,
        fileExtension: input.fileExtension,
      });

      const { error } = await supabase.from('tickets').update({ qr_code_path: path }).eq('id', input.ticketId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'detail', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      lakeId: string | null;
      syndicateName: string | null;
      status: 'held' | 'wanted';
      notes: string | null;
    }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          owner_id: userData.user.id,
          lake_id: input.lakeId,
          syndicate_name: input.syndicateName,
          status: input.status,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; status: 'held' | 'wanted' }) => {
      const { error } = await supabase.from('tickets').update({ status: input.status }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      syndicateName: string | null;
      status: 'held' | 'wanted';
      renewalDate: string | null;
      notes: string | null;
    }) => {
      const { error } = await supabase
        .from('tickets')
        .update({
          syndicate_name: input.syndicateName,
          status: input.status,
          renewal_date: input.renewalDate,
          notes: input.notes,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tickets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useTrashedTickets() {
  return useQuery({
    queryKey: ['trash', 'tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, lakes(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRestoreTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tickets').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}
