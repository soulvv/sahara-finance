# Sahara Finance — Fraud Protection & Anomaly Engine

## 1. SMS & Message Scam Analyzer

Sahara includes an on-device/server hybrid scam analyzer designed to combat prevalent Indian digital payment frauds (fake electricity disconnection notices, APK malware links, impersonation of bank managers, and urgent UPI PIN requests).

### Detection Vectors:
1. **Urgency Indicators**: *"Account will be blocked in 2 hours"*, *"Electricity cut tonight"*.
2. **Credential Harvesters**: Demands for OTP, UPI PIN, ATM PIN, or Aadhaar number.
3. **Suspicious Domains**: Non-official links (e.g. `bit.ly`, `apk-download`, unauthorized subdomains).
4. **Impersonation**: Claims of representing SBI, NPCI, RBI, or government departments with unofficial contact numbers.

---

## 2. Transaction Anomaly & Adaptive Step-Up Authentication

Transactions are dynamically scored based on:
- Deviation from user's historical 30-day average transaction amount.
- First-time beneficiary transactions.
- High-velocity transaction sequences.
- Unusual device fingerprint or session characteristics.

### Adaptive Authentication Matrix:
- **Low Risk** (e.g. ₹200 to known merchant): Standard Swipe-to-Pay.
- **Medium Risk** (e.g. ₹5,000 to new contact): PIN / Biometric verification + confirmation screen.
- **High Risk** (e.g. large transfer exceeding 5x normal pattern from a new device): Step-up OTP verification + anomaly warning prompt.

---

## 3. Emergency Account Freeze

Users can immediately freeze all outgoing payment capabilities via:
- UI button: **Freeze Account** in Security Center.
- Voice command: *"Mera account turant freeze karo"* (triggers authenticated confirmation flow).
- Dispute submission: Automatically offers account freeze upon reporting an unrecognized transaction.
