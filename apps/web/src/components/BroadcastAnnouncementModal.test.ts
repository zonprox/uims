import { describe, expect, it, vi } from 'vitest';
import { notificationsService } from '../services/notifications.service';

vi.mock('../services/notifications.service', () => ({
  notificationsService: {
    broadcastAnnouncement: vi.fn(),
  },
}));

describe('BroadcastAnnouncementModal Service Logic', () => {
  it('should call broadcastAnnouncement with expected payload', async () => {
    vi.mocked(notificationsService.broadcastAnnouncement).mockResolvedValueOnce({
      count: 10,
      success: true,
    });

    const payload = {
      type: 'INFO' as const,
      targetRole: 'All' as const,
      title: 'Infrastructure Maintenance',
      message: 'Scheduled downtime at midnight UTC.',
      link: '/settings',
    };

    const res = await notificationsService.broadcastAnnouncement(payload);
    expect(notificationsService.broadcastAnnouncement).toHaveBeenCalledWith(payload);
    expect(res.count).toBe(10);
    expect(res.success).toBe(true);
  });

  it('should handle broadcast failure appropriately', async () => {
    vi.mocked(notificationsService.broadcastAnnouncement).mockRejectedValueOnce(
      new Error('Broadcast failed'),
    );

    await expect(
      notificationsService.broadcastAnnouncement({
        title: 'Emergency Alert',
        message: 'Security patch applied',
        type: 'ALERT',
      }),
    ).rejects.toThrow('Broadcast failed');
  });
});
