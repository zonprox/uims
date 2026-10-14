import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NetworkTopologyData } from '@uims/shared-types';
import { networkService } from '../../../../services/network.service';
import type { SaveTopologyLayoutDto, TopologyQueryParams, TopologyViewMode } from './types';

export function useTopologyGraph(
  viewMode: TopologyViewMode,
  filters: Record<string, string | undefined> = {},
) {
  const queryParams: TopologyQueryParams = {
    mode: viewMode,
    ...filters,
  };

  return useQuery<NetworkTopologyData>({
    queryKey: ['network', 'topology', viewMode, filters],
    queryFn: () => networkService.getTopology(queryParams),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useSaveTopologyLayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveTopologyLayoutDto) => networkService.updateTopologyLayout(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['network', 'topology', variables.mode],
      });
    },
  });
}
