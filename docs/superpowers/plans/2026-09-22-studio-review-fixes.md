# Content Studio review fixes

**Goal:** Resolve the five confirmed branch-review findings without committing changes.
**Architecture:** Serialize piece mutations with short PostgreSQL row-lock transactions. Fence worker writes using the run's current status under that lock, enforce active-run uniqueness in PostgreSQL, and create draft articles in the same transaction as handoff. Scope planned chunks and snapshot all generated metadata.
**Spec:** The five findings in this task's code review.

## Tasks

- [x] Add database regression tests for cancelled writes, concurrent runs, snapshot metadata, scoped chunks, and atomic handoff. Run against an isolated local PostgreSQL database and confirm failures.
- [x] Add a shared piece lock and guarded repository writes; pass run IDs from every generation executor; serialize cancellation and run enqueue, with a partial unique index on active piece runs. Test cancelled in-flight calls and competing run kinds.
- [x] Filter planned chunks with the current source/chapter scope and invalidate generated content when selection changes. Test deselected and unlinked sources and excluded chapters.
- [x] Add nullable snapshot metadata fields, migration, and full restoration, including clearing null metadata from older snapshots. Regenerate Prisma types.
- [x] Pass the transaction through article author/slug/create operations and handoff under the piece lock. Test competing requests and rollback after article insertion.
- [x] Run unit/component tests, database tests, TypeScript and lint; inspect the final diff.
- [x] Run the requested security review and fix actionable findings, with regression coverage.

## Constraints and review focus

No commits; do not touch shared or production databases. AI calls stay outside transactions. Cancellation must fence every write, including snapshots and final stages. Lock ordering is piece before run. Keep existing permission checks. A migration must reject existing duplicate active runs rather than silently discard work. Legacy snapshot metadata clears to null because historical values cannot be recovered.

## Results

Seven initial database regressions reproduced the reviewed issues before implementation; the additional source invalidation regression also failed before its fix. Six delayed model-call scenarios now verify cancellation across outline, write, finish, translate, metadata, and rewrite. Queue integration covers cross-kind exclusion, cancellation replacement, and locked handoff. Handoff rollback uses a failure injected immediately after article insertion.

Security review found one worker authorization mismatch: forced password changes were ignored. Both permission-holder and super-admin regressions failed before adding that check. Queued-job integration also checks that the worker performs no steps for restricted accounts.

The snapshot/active-run migration was applied only to the disposable local test database. No commits or production migrations were performed.

Final verification: 732 unit/component tests and 71 database tests passed; TypeScript and production build passed. Lint has no errors and nine pre-existing warnings. The disposable test container was removed after verification.
