1. Dashboard
   Operational snapshot of the platform:
   Active organisations, broadcasts today, credit purchases today.
   Failed jobs and integration errors needing attention (FR-ADM-04).
   SMS gateway, payment provider and email service status.
   Last backup status (the MVP lists operational backups).

2. Organisations
   List: name, status, primary contact, member count, credit balance.
   Onboard organisation (FR-ADM-01): create it and invite its first chairman or administrator.
   Detail page: summary, structure counts (units, polling stations, executives), credit balance, recent broadcasts, and suspend or reactivate with a reason.
   Credit purchase policy: central, individual or hybrid per organisation. The SRS (FR-CR-11) says this is still to be confirmed.

3. Credits and Payments
   Payments: provider reference, amount, status, and verify-with-provider for pending ones. The SRS requires server-side verification before credits are added (section 6.5).
   Ledger: purchases, allocations, reservations, consumption, refunds, reversals and adjustments (FR-CR-06, FR-CR-07).
   Adjustments: a manual change must create a ledger entry with a reason, because balances can’t change without one (BR-11).

4. Integrations
   SMS gateway: connection status, sender ID, and recent delivery-report processing (FR-REP-01).
   Payment provider and email service: status and recent errors.

5. Jobs and Errors
   Failed background jobs: SMS dispatch, email, imports and retries, with organisation, error and a retry action (FR-NOT-03, FR-NOT-04, FR-ADM-04).
   Integration error log.
   Retries must stay idempotent, so no duplicate sends to anyone already processed (BR-13).

6. Audit Log
   All admin actions affecting organisations, provider settings or system access (FR-ADM-03).
   Filter by admin, action, organisation and date, with CSV export. Credit transactions and permission changes also need to be auditable (NFR-SEC-05).

7. Settings
   Platform configuration (FR-ADM-01): configurable import file size, type and row limits (section 6.7), and notification settings.
   Admin team: add or remove platform admins and support staff, with roles such as Super Admin, Support and Finance.
