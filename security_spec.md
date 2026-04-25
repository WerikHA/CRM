# Security Specification - Amplifica CRM

## 1. Data Invariants
- **Multi-tenancy isolation**: Every record must belong to an `owner_id`. Users with role `ADMIN` or `OWNER` can only see records where `owner_id` matches their own `owner_id`.
- **Identity Integrity**: The `users.id` must correspond to the authenticated user's ID.
- **Relational Integrity**: Clients, Leads, and Orders must be linked to a valid owner.
- **Role-based access**: 
  - `DESIGNER` can only see orders assigned to them.
  - `PARTNER` can only see their referred clients and requests.
  - `EDITOR` can only see video orders assigned to them.

## 2. The "Dirty Dozen" Payloads (Attack Vectors)
1. **Identity Spoofing**: Attempt to create a client with a different `owner_id`.
2. **Privilege Escalation**: A `DESIGNER` attempting to update a client's `monthly_value`.
3. **Cross-Tenant Read**: User A attempting to fetch Leads belonging to User B.
4. **Orphan Creation**: Creating an order for a client that belongs to another owner.
5. **Self-Promotion**: A user attempting to update their own `role` to `ADMIN`.
6. **Financial Tampering**: A partner trying to update their `commission_value`.
7. **Bypassing Workflow**: Manually setting an order's `approval_status` to 'approved' without going through the process.
8. **PII Scraping**: Anonymous user attempting to list the `users` table.
9. **Bulk Deletion**: Authenticated user attempting to delete all `clients` via a compromised sub-query.
10. **ID Poisoning**: Injecting a 1MB string into a `UUID` field to cause index bloat/crash.
11. **Timestamp Manipulation**: Manually setting `created_at` to a date in the past.
12. **Shadow Field Injection**: Adding an `is_verified: true` field to a lead record to bypass logic.

## 3. RLS Implementation Roadmap
- Enable RLS on all tables.
- Use `jwt_claims` to identify the user's role and owner_id.
- Implement `CHECK` constraints for data integrity.
- Use `auth.uid()` as the primary identity source.
