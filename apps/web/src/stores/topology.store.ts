import { create } from 'zustand';
import type { TopologyViewMode } from '@uims/shared-types';

export type TopologyPerspectiveMode = TopologyViewMode | 'ALL' | 'NETWORK' | 'CCTV';

export interface TopologyFilters {
  rackId?: string;
  vlanId?: string;
  subnetId?: string;
  floor?: string;
  switchRole?: string;
  status?: string;
}

export interface TopologyViewport {
  pan: { x: number; y: number };
  zoom: number;
  isFullscreen: boolean;
}

export interface TopologyStoreState {
  viewMode: TopologyPerspectiveMode;
  filters: TopologyFilters;
  viewport: TopologyViewport;
  searchQuery: string;
  selectedNodeId: string | null;
  hasUnsavedLayout: boolean;
  dirtyPositions: Record<string, { x: number; y: number }>;

  // Actions
  setViewMode: (mode: TopologyPerspectiveMode) => void;
  setFilter: (key: keyof TopologyFilters, value: string | undefined) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  setFullscreen: (fullscreen: boolean) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  markLayoutSaved: () => void;
  resetDirtyLayout: () => void;
}

export const useTopologyStore = create<TopologyStoreState>((set) => ({
  viewMode: 'ALL',
  filters: {},
  viewport: { pan: { x: 50, y: 30 }, zoom: 1, isFullscreen: false },
  searchQuery: '',
  selectedNodeId: null,
  hasUnsavedLayout: false,
  dirtyPositions: {},

  setViewMode: (mode) =>
    set({
      viewMode: mode,
      filters: {},
      hasUnsavedLayout: false,
      dirtyPositions: {},
      selectedNodeId: null,
    }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value || undefined },
    })),

  resetFilters: () => set({ filters: {} }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setPan: (pan) => set((state) => ({ viewport: { ...state.viewport, pan } })),
  setZoom: (zoom) => set((state) => ({ viewport: { ...state.viewport, zoom } })),
  setFullscreen: (isFullscreen) =>
    set((state) => ({ viewport: { ...state.viewport, isFullscreen } })),

  updateNodePosition: (nodeId, x, y) =>
    set((state) => ({
      hasUnsavedLayout: true,
      dirtyPositions: { ...state.dirtyPositions, [nodeId]: { x, y } },
    })),

  markLayoutSaved: () => set({ hasUnsavedLayout: false, dirtyPositions: {} }),
  resetDirtyLayout: () => set({ hasUnsavedLayout: false, dirtyPositions: {} }),
}));
