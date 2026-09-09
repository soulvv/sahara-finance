/**
 * Account Freeze Service (Phase 4 — Adaptive Security)
 * Emergency instant account freeze blocking all outbound money movement.
 */

interface FreezeRecord {
  userId: string;
  isFrozen: boolean;
  frozenAt?: string;
  reason?: string;
  unfreezeRequestedAt?: string;
}

const freezeStore = new Map<string, FreezeRecord>();

export class AccountFreezeService {
  public static isAccountFrozen(userId: string): boolean {
    const record = freezeStore.get(userId);
    return Boolean(record?.isFrozen);
  }

  public static getStatus(userId: string): FreezeRecord {
    return (
      freezeStore.get(userId) || {
        userId,
        isFrozen: false,
      }
    );
  }

  public static freeze(userId: string, reason: string = "User-initiated emergency lock"): FreezeRecord {
    const record: FreezeRecord = {
      userId,
      isFrozen: true,
      frozenAt: new Date().toISOString(),
      reason,
    };
    freezeStore.set(userId, record);
    return record;
  }

  public static unfreeze(userId: string): FreezeRecord {
    const record: FreezeRecord = {
      userId,
      isFrozen: false,
    };
    freezeStore.set(userId, record);
    return record;
  }
}
