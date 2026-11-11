# Feature 2 — Check Stock and Reserve Parts for a Scheduled Job

**Status:** BA-generated; human-reviewed and annotated; assumptions requiring product confirmation remain open

## Feature intent and scope

**Intent:** Let a user check part availability and reserve a requested quantity of parts against a job that is already scheduled.

> **Human review annotation:** “Already scheduled” means an existing job whose status is `SCHEDULED`, matching Feature 1's current `JobStatus` model. Completed and canceled jobs are not eligible.

**In scope**
- Check availability for requested parts in the context of an existing scheduled job.
- If sufficient stock is available, create an in-memory reservation associated with that job and part, subject to the assumptions below.
- Report whether the request was reserved or could not be fulfilled.

**Out of scope**
- Creating, booking, rescheduling, or changing jobs or technician assignments.
- Implementing or changing technician-calendar conflict detection, travel buffers, or scheduling eligibility rules.
- Purchasing, replenishing, transferring, pricing, or notifying about parts; low-stock alerts; or warehouse/location selection.
- Releasing reservations or automatically changing reservation state when a job is completed or canceled.

> **Human review annotation:** For this training increment, I am choosing the repository's existing mock/in-memory convention: reservations exist for the running process and reset on restart. Durable storage and a release workflow are deliberately deferred.

## Assumptions to validate

These are working assumptions, not confirmed product policy. Confirm them before implementation.

- **A1 — Quantity:** A request supplies an explicit positive whole-number quantity for each part. Fractional quantities, defaults, and unit conversion are not supported.
- **A2 — Availability and shortage:** Available quantity means on-hand quantity minus quantities already reserved. Reservation is all-or-nothing across the request: if any requested quantity is unavailable, none of the request is reserved and the user is told which part is short. Partial fulfillment is not assumed.
- **A3 — Reservation lifecycle:** A reservation remains active for the lifetime of the running application and reduces availability; it is not released by this feature. Restart persistence, explicit release, and automatic release on job completion or cancellation are out of scope and require a future product decision.
- **A4 — Job eligibility:** A target must already exist, have a saved schedule, and have status `SCHEDULED`. `COMPLETED` and `CANCELLED` jobs are ineligible, matching the existing `JobStatus` values.
- **A5 — Calendar boundary:** The existing scheduled job is the input to this feature. Feature 2 does not create or validate bookings and does not change Feature 1's calendar policy. The committed booking rule remains half-open `[start, scheduled end + 45 minutes)`: intersecting bookings for the same technician are rejected, while a booking starting exactly at the reserved interval's end is allowed.
- **A6 — Duplicate requests and concurrency:** Duplicate submission/idempotency behavior is not specified and needs a product decision. Regardless of duplicate policy, concurrent requests must not reserve more than available stock; the implementation mechanism is left to the developer.
- **A7 — Stock source:** Part records and on-hand counts use the repository's in-memory mock-data convention. The exact catalog and seed quantities are implementation/test fixtures, not product policy.

> **Human review annotation:** I accept A1 and A2 for this increment: quantities are positive integers, and a multi-part reservation is all-or-nothing. The BA draft's configured-unit assumption is removed because no unit model exists in the repository. A6 remains an open product decision, but it does not weaken the no-overselling invariant.

## User stories

- As a dispatcher, I want to check whether the parts needed for an already scheduled job are available so I can prepare for the visit.
- As a dispatcher, I want to reserve the requested quantities against that job when stock is sufficient so that the same stock is not promised to another job.
- As a dispatcher, I want a clear shortage or eligibility result, without a partial reservation, so I know the request needs attention.

## Testable acceptance criteria

1. Given an existing `SCHEDULED` job with a saved schedule and an explicit valid part quantity, when availability is checked, the result reports the available quantity according to A2 and does not create a reservation by itself.
2. Given an eligible job and sufficient available quantities for every requested part, when the request is reserved, a reservation for each requested quantity is associated with that job and part, and the available quantity for each part decreases by exactly that amount.
3. Given an eligible job and insufficient available stock for any requested part, when reservation is attempted, the result identifies the shortage and no part in the request is reserved; all affected available quantities remain unchanged.
4. Given a missing job, a job without a saved schedule, a job whose status is not `SCHEDULED`, a missing part, or an invalid quantity (zero, negative, or fractional), when availability is checked or reservation is attempted, the request is rejected and no reservation or stock quantity changes.
5. Given an active reservation, when availability is checked for that part during the same application run, its reserved quantity is excluded from availability. Reservation release and restart persistence are not part of this feature.
6. Given two concurrent requests whose combined quantities exceed the available quantity, at most requests totaling the available quantity succeed; resulting active reservations never exceed on-hand stock. User-facing behavior for identical duplicate submissions still requires a policy decision under A6.
7. Reserving parts for an existing `SCHEDULED` job never creates, moves, or changes that job's technician booking. The booking remains governed by Feature 1's half-open interval rule in A5; this feature does not introduce a separate calendar check or scheduling policy.

> **Human review annotation:** The BA draft had a release action in an acceptance criterion while explicitly leaving release behavior and ownership undefined. Release is removed from this feature's testable contract; the corrected lifecycle is runtime-only until restart.

## Edge cases

- Requested quantity equals available quantity: provisionally succeeds and leaves zero available.
- Any one part in a multi-part request is short: provisionally rejects the entire request, with no partial allocation (A2).
- A part has no stock, a job or part identifier does not resolve, or the job has no saved schedule: reject without changing reservations or stock.
- Quantity is absent, zero, negative, or fractional: reject without changing reservations or stock; unit conversion is not supported (A1).
- A job is canceled or completed: it cannot receive a new reservation; release of an existing reservation is out of scope (A3).
- The same request is submitted more than once or two requests compete for the last units: prevent overselling; duplicate/idempotency behavior requires a product decision (A6).
- A scheduled job starts at another booking's reserved end boundary, or its booking would intersect another booking: those outcomes belong to Feature 1's calendar policy, not to part reservation. For the same technician, intersections of `[start, scheduled end + 45 minutes)` are rejected and a start exactly at the end is allowed (A5).

## Named dependencies

- **Feature 1 decision — “Decision: booking conflicts use half-open reserved intervals”** in `pipeline/decisions/feature-1-decisions.md`. This is the committed rule that each technician booking reserves `[start, scheduled end + 45 minutes)`, rejects intersections, and permits a booking exactly at the earlier interval's end. Feature 2 consumes an already scheduled job and must not redefine or implement that calendar policy.
- The companion committed **“Decision: standard travel buffer per job is 45 minutes”** in the same file supplies the 45-minute value referenced by the interval decision.

## Measurable success metrics

- **Reservation accuracy:** 100% of eligible, sufficiently stocked test requests reserve exactly the explicitly requested quantities.
- **Shortage safety:** 100% of insufficient-stock test requests create zero reservations and leave all affected availability unchanged.
- **Oversell prevention:** 0 test scenarios leave active reservations greater than on-hand stock, including concurrent competing requests.
- **Job/calendar boundary:** 100% of tests confirm reservation is limited to an existing scheduled job and does not alter the job's booking or Feature 1's half-open 45-minute-buffer behavior.

> **Human review annotation:** These are acceptance-suite targets, not production analytics. The repository has no telemetry system, so no runtime measurement or reporting is implied.
