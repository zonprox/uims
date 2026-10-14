import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useTopologyStore } from './topology.store';

describe('useTopologyStore', () => {
  beforeEach(() => {
    useTopologyStore.setState({
      viewMode: 'ALL',
      filters: {},
      viewport: { pan: { x: 50, y: 30 }, zoom: 1, isFullscreen: false },
      searchQuery: '',
      selectedNodeId: null,
      hasUnsavedLayout: false,
      dirtyPositions: {},
    });
  });

  afterEach(() => {
    useTopologyStore.getState().resetFilters();
    useTopologyStore.getState().resetDirtyLayout();
  });

  it('should have initial default state for multi-perspective canvas', () => {
    const state = useTopologyStore.getState();
    expect(state.viewMode).toBe('ALL');
    expect(state.filters).toEqual({});
    expect(state.viewport).toEqual({ pan: { x: 50, y: 30 }, zoom: 1, isFullscreen: false });
    expect(state.searchQuery).toBe('');
    expect(state.selectedNodeId).toBeNull();
    expect(state.hasUnsavedLayout).toBe(false);
    expect(state.dirtyPositions).toEqual({});
  });

  it('should switch between ALL, NETWORK, and CCTV perspective modes and reset dirty layout', () => {
    // Stage dirty layout and selection
    useTopologyStore.getState().updateNodePosition('node-1', 120, 240);
    useTopologyStore.getState().setSelectedNodeId('node-1');
    expect(useTopologyStore.getState().hasUnsavedLayout).toBe(true);
    expect(useTopologyStore.getState().selectedNodeId).toBe('node-1');

    // Switch to NETWORK perspective
    useTopologyStore.getState().setViewMode('NETWORK');
    expect(useTopologyStore.getState().viewMode).toBe('NETWORK');
    expect(useTopologyStore.getState().hasUnsavedLayout).toBe(false);
    expect(useTopologyStore.getState().dirtyPositions).toEqual({});
    expect(useTopologyStore.getState().selectedNodeId).toBeNull();

    // Switch to CCTV perspective
    useTopologyStore.getState().setViewMode('CCTV');
    expect(useTopologyStore.getState().viewMode).toBe('CCTV');

    // Switch back to ALL
    useTopologyStore.getState().setViewMode('ALL');
    expect(useTopologyStore.getState().viewMode).toBe('ALL');
  });

  it('should set and reset perspective filters', () => {
    useTopologyStore.getState().setFilter('floor', '2F');
    useTopologyStore.getState().setFilter('status', 'ACTIVE');
    useTopologyStore.getState().setFilter('vlanId', 'vlan-10');
    expect(useTopologyStore.getState().filters).toEqual({
      floor: '2F',
      status: 'ACTIVE',
      vlanId: 'vlan-10',
    });

    useTopologyStore.getState().setFilter('floor', undefined);
    expect(useTopologyStore.getState().filters.floor).toBeUndefined();

    useTopologyStore.getState().resetFilters();
    expect(useTopologyStore.getState().filters).toEqual({});
  });

  it('should update viewport state (pan, zoom, fullscreen)', () => {
    useTopologyStore.getState().setPan({ x: 200, y: 150 });
    expect(useTopologyStore.getState().viewport.pan).toEqual({ x: 200, y: 150 });

    useTopologyStore.getState().setZoom(1.4);
    expect(useTopologyStore.getState().viewport.zoom).toBe(1.4);

    useTopologyStore.getState().setFullscreen(true);
    expect(useTopologyStore.getState().viewport.isFullscreen).toBe(true);
  });

  it('should record dirty layout positions and mark saved cleanly', () => {
    useTopologyStore.getState().updateNodePosition('node-sw-01', 350, 420);
    useTopologyStore.getState().updateNodePosition('node-cam-01', 500, 600);

    const state = useTopologyStore.getState();
    expect(state.hasUnsavedLayout).toBe(true);
    expect(state.dirtyPositions).toEqual({
      'node-sw-01': { x: 350, y: 420 },
      'node-cam-01': { x: 500, y: 600 },
    });

    useTopologyStore.getState().markLayoutSaved();
    expect(useTopologyStore.getState().hasUnsavedLayout).toBe(false);
    expect(useTopologyStore.getState().dirtyPositions).toEqual({});
  });

  it('should reset filters when switching perspective modes to isolate views', () => {
    useTopologyStore.getState().setFilter('switchRole', 'CORE');
    useTopologyStore.getState().setFilter('floor', '2F');
    expect(useTopologyStore.getState().filters).toEqual({ switchRole: 'CORE', floor: '2F' });

    useTopologyStore.getState().setViewMode('CCTV');
    expect(useTopologyStore.getState().viewMode).toBe('CCTV');
    expect(useTopologyStore.getState().filters).toEqual({});
  });
});
