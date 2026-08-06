import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
      return data;
    },
    enabled: !!id,
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
