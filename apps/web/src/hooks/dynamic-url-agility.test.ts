import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { notificationsService } from '../services/notifications.service';
import { useAuthStore } from '../stores/auth.store';
import { useRealtimeNotifications } from './useRealtimeNotifications';

const mockSocketOn = vi.fn();
const mockSocketDisconnect = vi.fn();
const mockSocketEmit = vi.fn();
const mockIo = vi.fn((_url: string, _opts?: unknown) => ({
  on: mockSocketOn,
  disconnect: mockSocketDisconnect,
  emit: mockSocketEmit,
}));

vi.mock('socket.io-client', () => ({
  io: (url: string, opts?: unknown) => mockIo(url, opts),
}));

vi.mock('../services/notifications.service', () => ({
  notificationsService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => ({
        notification: {
          open: vi.fn(),
          info: vi.fn(),
          warning: vi.fn(),
          error: vi.fn(),
          success: vi.fn(),
          destroy: vi.fn(),
        },
      }),
    },
  };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Dynamic URL & Custom Port Agility Stress Test', () => {
  let container: HTMLDivElement;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    useAuthStore.setState({
      token: 'jwt-test-token',
      user: { id: 'u1', email: 'admin@company.com', name: 'Alex', role: 'Admin' },
    });
  });

  afterEach(() => {
    container.remove();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
    delete (import.meta.env as Record<string, unknown>).VITE_WS_URL;
    delete (import.meta.env as Record<string, unknown>).VITE_API_URL;
  });

  const mountHook = async () => {
    vi.mocked(notificationsService.getNotifications).mockResolvedValueOnce([]);

    function TestComponent() {
      const state = useRealtimeNotifications();
      return createElement('div', null, `Unread: ${state.unreadCount}`);
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      root.unmount();
    });
  };

  describe('WebSocket Endpoint Dynamic Origin Resolution', () => {
    const testOrigins = [
      { origin: 'http://localhost:5679', expected: 'http://localhost:5679/notifications' },
      { origin: 'http://localhost:3000', expected: 'http://localhost:3000/notifications' },
      { origin: 'http://localhost:9999', expected: 'http://localhost:9999/notifications' },
      { origin: 'https://127.0.0.1:8443', expected: 'https://127.0.0.1:8443/notifications' },
      { origin: 'http://0.0.0.0:4000', expected: 'http://0.0.0.0:4000/notifications' },
      { origin: 'https://app.internal.corp', expected: 'https://app.internal.corp/notifications' },
      { origin: 'http://192.168.1.150:7777', expected: 'http://192.168.1.150:7777/notifications' },
      {
        origin: 'https://preview-xyz-123.trycloudflare.com',
        expected: 'https://preview-xyz-123.trycloudflare.com/notifications',
      },
    ];

    for (const { origin, expected } of testOrigins) {
      it(`dynamically resolves socket endpoint for origin: ${origin}`, async () => {
        Object.defineProperty(window, 'location', {
          value: { ...originalLocation, origin },
          configurable: true,
          writable: true,
        });

        await mountHook();

        expect(mockIo).toHaveBeenCalledWith(
          expected,
          expect.objectContaining({
            auth: { token: 'jwt-test-token' },
            transports: ['polling', 'websocket'],
          }),
        );
      });
    }

    it('falls back to relative /notifications when window.location.origin is empty', async () => {
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, origin: '' },
        configurable: true,
        writable: true,
      });

      await mountHook();

      expect(mockIo).toHaveBeenCalledWith(
        '/notifications',
        expect.objectContaining({
          auth: { token: 'jwt-test-token' },
        }),
      );
    });

    it('falls back to relative /notifications when window.location has undefined origin', async () => {
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, origin: undefined },
        configurable: true,
        writable: true,
      });

      await mountHook();

      expect(mockIo).toHaveBeenCalledWith(
        '/notifications',
        expect.objectContaining({
          auth: { token: 'jwt-test-token' },
        }),
      );
    });

    it('prioritizes VITE_WS_URL override when configured', async () => {
      (import.meta.env as Record<string, unknown>).VITE_WS_URL = 'wss://custom-ws.example.com:9443';

      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, origin: 'https://web.example.com' },
        configurable: true,
        writable: true,
      });

      await mountHook();

      expect(mockIo).toHaveBeenCalledWith(
        'wss://custom-ws.example.com:9443/notifications',
        expect.objectContaining({
          auth: { token: 'jwt-test-token' },
        }),
      );
    });

    it('derives socket origin from VITE_API_URL when it starts with http', async () => {
      (import.meta.env as Record<string, unknown>).VITE_API_URL =
        'https://api-service.infra.net:8080/api/v1';

      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, origin: 'https://web.infra.net' },
        configurable: true,
        writable: true,
      });

      await mountHook();

      expect(mockIo).toHaveBeenCalledWith(
        'https://api-service.infra.net:8080/notifications',
        expect.objectContaining({
          auth: { token: 'jwt-test-token' },
        }),
      );
    });

    it('derives socket origin from VITE_API_URL with trailing slash', async () => {
      (import.meta.env as Record<string, unknown>).VITE_API_URL =
        'https://api-service.infra.net:8080/api/v1/';

      await mountHook();

      expect(mockIo).toHaveBeenCalledWith(
        'https://api-service.infra.net:8080/notifications',
        expect.objectContaining({
          auth: { token: 'jwt-test-token' },
        }),
      );
    });

    it('ignores relative VITE_API_URL and uses window.location.origin instead', async () => {
      (import.meta.env as Record<string, unknown>).VITE_API_URL = '/api/v1';

      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, origin: 'https://custom-port.io:6543' },
        configurable: true,
        writable: true,
      });

      await mountHook();

      expect(mockIo).toHaveBeenCalledWith(
        'https://custom-port.io:6543/notifications',
        expect.objectContaining({
          auth: { token: 'jwt-test-token' },
        }),
      );
    });
  });

  describe('Axios API Client Dynamic BaseURL Verification', () => {
    it('has relative baseURL /api/v1 without hardcoded host or port', () => {
      expect(api.defaults.baseURL).toBe('/api/v1');
      expect(api.defaults.baseURL).not.toContain('localhost');
      expect(api.defaults.baseURL).not.toContain('3002');
      expect(api.defaults.baseURL).not.toContain('5679');
      expect(api.defaults.baseURL).toMatch(/^\/api\/v1\/?$/);
    });

    it('constructs correct request URL relative to domain/proxy without hardcoded port', async () => {
      const mockAdapter = vi.fn().mockResolvedValue({
        data: { success: true },
        status: 200,
        headers: {},
        config: {},
      });

      await api.get('/assets', { adapter: mockAdapter });

      expect(mockAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/assets',
          baseURL: '/api/v1',
        }),
      );
    });
  });
});
