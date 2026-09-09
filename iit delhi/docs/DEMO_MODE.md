# Sahara Finance — Demo Mode & Sandbox Environment

## 1. Demo Mode Architecture

Sahara includes a complete sandbox environment for zero-dependency evaluations and live hackathon demonstrations:

1. **Dual-Mode Persistence**: Automatically detects live MongoDB connections or boots in resilient in-memory mode if offline.
2. **Pre-Seeded Demo State**:
   - Primary Demo User: `Ravi Kumar` (`+919876543210`) with ₹8,420.00 initial balance, 4 categorized transactions, and an active micro-loan (2/3 installments paid).
   - Test Merchants: `Rahul General Store` (UPI ID: `rahulstore@upi`), `Ramesh Kirana`.
3. **Safety Disclaimers**: All demo endpoints return explicit metadata indicating simulated sandbox status.
