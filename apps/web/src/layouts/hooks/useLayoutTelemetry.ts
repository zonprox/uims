import { useCallback, useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboard.service';
import { notificationsService } from '../../services/notifications.service';

export interface NavBadgeCounts {
  expiringLicenses?: number;
  lowStockItems?: number;
}

export function useLayoutTelemetry(intervalMs = 15000) {
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [navBadges, setNavBadges] = useState<NavBadgeCounts>({});

  const fetchLiveTelemetry = useCallback(async () => {
    try {
      const notifs = await notificationsService.getNotifications().catch((_error: unknown) => []);
      const notifList = Array.isArray(notifs) ? notifs : [];
      setUnreadNotifCount(notifList.filter((n) => !n.read).length);

      const overview = await dashboardService.getOverview().catch((_error: unknown) => null);
      if (overview) {
        setNavBadges({
          expiringLicenses: overview.kpi?.licenses?.expiringCount ?? 0,
          lowStockItems: overview.actionItems?.filter((a) => a.type === 'error').length ?? 0,
        });
      }
    } catch (_error: unknown) {
      // Telemetry will retry on next poll interval
    }
  }, []);

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, intervalMs);
    return () => clearInterval(interval);
  }, [fetchLiveTelemetry, intervalMs]);

  return {
    unreadNotifCount,
    navBadges,
    fetchLiveTelemetry,
  };
}
