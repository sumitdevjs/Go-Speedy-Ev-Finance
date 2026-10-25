# Audit repair deployment

Apply these changes to the target Supabase database **before deploying the changed backend**:

1. Apply `schema.sql` for the baseline tables/indexes.
2. Apply `migrations/20261025_audit_repairs.sql`. It is a single transaction and can be rerun. On failure, inspect the reported constraint or legacy data issue before retrying.
3. Apply `create-storage-buckets.sql` and inspect `verify-storage.sql` results. Both KYC buckets must be private; check remaining policies for broad access. Unknown deployment policies are not automatically deleted.
4. Deploy the backend and frontend together; use Node 20.9 or newer (Node 24 verified). Install each package with `npm ci`.

The migration installs restricted server-only RPCs. The backend must continue using the service role. Requests fail if the migration is missing; there is no fallback to nontransactional stock writes.

## Intentional changes

- Stock reservation, new/used vehicle issuance, cancellation returns, booking finalization and transfer inventory/audit writes now commit or roll back together. Dispatch removes units from available stock; receipt adds them to the destination. Only a requested transfer can be cancelled.
- The dedicated transfer table is authoritative. Legacy audit-only transfers are backfilled; invalid references make migration fail for correction. Historical audit rows are retained.
- Branch stock subtracts all new vehicles issued, including completed/cancelled contracts: returned vehicles belong to `old_evs`. Stock resets establish a new counting baseline. Existing incorrect stock counts or missing history must be reconciled with physical inventory; code cannot recover missing historical facts.
- Model log edits adjust current stock by the receipt delta, preserving already issued units. Transfer movement entries cannot be edited through receipt maintenance. Direct stock-count edits must use receipt adjustments or the explicit reset operation.
- Phone uniqueness now applies only to active rentals. Repeat direct purchases are allowed; hardware remains unique across active rentals and direct purchases, and can be reused after cancellation. Old global hardware/phone constraints are removed.
- Customer lookups scope the initial profile as well as contracts and payments. Grouped balances use the authorized contracts independently before totaling them.
- Password changes revoke existing access JWTs using `auth_version`, as well as refresh credentials. Existing JWTs without a version count as version 0 until the password changes.
- Google OAuth is removed. Passwordless accounts need password setup/reset; SMTP delivery still needs working production configuration.

## Local verification

Backend: `npm run test:unit -- --runInBand` with synthetic required env values. Real database checks: point `PSQL_TEST_COMMAND` at a **disposable** PostgreSQL database whose name ends `_test` or `_audit`, then run `npm run test:db`. This command truncates fixtures and installs the schema/migration in that disposable database.

Frontend: `npm test`, `npm run lint`, `npm run build`, `npm audit`.

Frontend dependencies include Next 16.4.3, Zod 4.6.7 and SheetJS 0.20.3 from its official versioned distribution (npm's `xlsx` release is stale). Lockfile integrity pins the downloaded archive. Tailwind stays on v3; patched PostCSS/parser/nested releases are resolved through explicit overrides. Next 16 uses a standalone ESLint command; `build` uses webpack and no longer embeds lint.
