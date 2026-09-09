/**
 * Device Security Center Service (Phase 4)
 * Active session tracking and remote device management.
 */

export interface DeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  browser: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  lastActive: string;
}

const sessionsStore = new Map<string, DeviceSession[]>();

export class DeviceService {
  public static getSessions(userId: string): DeviceSession[] {
    const existing = sessionsStore.get(userId);
    if (existing && existing.length > 0) {
      return existing;
    }

    // Default sessions for realistic demo experience
    const initialSessions: DeviceSession[] = [
      {
        id: "sess_curr",
        userId,
        deviceName: "This Device (Chrome / Android)",
        browser: "Mobile Chrome 124",
        ipAddress: "103.21.124.45 (Delhi, India)",
        location: "New Delhi, DL",
        isCurrent: true,
        lastActive: "Just now",
      },
      {
        id: "sess_secondary",
        userId,
        deviceName: "Redmi Note 11 (Browser)",
        browser: "Mi Browser 14",
        ipAddress: "49.36.192.88 (Noida, India)",
        location: "Noida, UP",
        isCurrent: false,
        lastActive: "2 days ago",
      },
    ];
    sessionsStore.set(userId, initialSessions);
    return initialSessions;
  }

  public static revokeOtherSessions(userId: string): { revokedCount: number } {
    const sessions = this.getSessions(userId);
    const currentOnly = sessions.filter((s) => s.isCurrent);
    const revokedCount = sessions.length - currentOnly.length;
    sessionsStore.set(userId, currentOnly);
    return { revokedCount };
  }
}
