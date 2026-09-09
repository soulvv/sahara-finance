# Sahara Finance — Financial Engine & Double-Entry Ledger

## 1. Double-Entry Invariant Principle

The core banking engine enforces the fundamental accounting equation:

$$\sum \text{Debits} \equiv \sum \text{Credits}$$

- **No Magic Balances**: Balances are not arbitrary floating numbers; every balance change is backed by matched debit and credit entries in the transaction ledger.
- **Micro-Unit Arithmetic**: Authoritative balances and movements are calculated in integer paise minor units ($1\text{ INR} = 100\text{ paise}$) to eliminate JavaScript floating-point rounding errors.
- **Idempotent Execution**: Every payment execution requires a client-generated `idempotencyKey`. Duplicate requests with the same key return the original transaction record with `duplicate: true` without performing a second debit.

---

## 2. Safe-to-Spend Analyzer

The Safe-to-Spend calculation protects vulnerable users from unexpected overdrafts:

$$\text{Safe To Spend} = \text{Total Balance} - (\text{Upcoming EMIs} + \text{Known Recurring Bills} + \text{Active Savings Allocations} + \text{Emergency Reserve})$$

### Example Breakdown:
- **Total Balance**: ₹12,450.00
- **Reserved Commitments**:
  - Upcoming Micro-Loan EMI: ₹1,800.00
  - Scheduled Electricity Bill: ₹1,200.00
  - Emergency Reserve: ₹2,600.00
- **Safe to Spend**: **₹6,850.00**

---

## 3. Micro-Loan & EMI Engine

- **Deterministic EMI Formula**: Calculated using standard reducing-balance amortisation.
- **Early Repayment & No Penalties**: Repayments reduce outstanding principal directly.
- **Responsible Lending Guidance**: When users request new loans, the AI first highlights available savings and budget alternatives.
