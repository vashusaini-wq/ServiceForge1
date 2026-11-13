# Feature 2 — Check Stock and Reserve Parts for a Scheduled Job

**Status:** BA-generated; human-reviewed and annotated; open assumptions are listed below

## Feature intent and scope

**Intent:** Let a dispatcher check available stock for parts needed by an already scheduled job, then reserve requested quantities against that job so the same stock cannot be promised again.

**In scope**
- Check current availability of requested parts in the context of an existing scheduled job.
- Reserve the requested quantity of each sufficiently stocked part against that job.
- Report available quantities and whether each part was reserved or is short.

**Out of scope**
- Creating, booking, moving, changing, or revalidating technician appointments.
- Partial fulfillment of a requested part quantity: a short line is not partially reserved.
- Backorders, future-stock promises, purchasing, replenishment, or low-stock alerts.
- Defining reservation release, expiry, or persistence across application restarts.
- Prescribing a user interface or production telemetry.

> **Human review annotation:** The BA draft added multi-part all-or-nothing transaction behavior. The intent requires requested quantities to be reserved, but does not say one short part should block otherwise available parts. This spec treats each requested part as an independent line: reserve a line only when its full quantity is available. Backorders are excluded because the stated intent is to reserve stock that is currently available, not promise future supply.

## User stories

- As a dispatcher, I want to check available stock for parts needed by an already scheduled job so I can tell what can be prepared.
- As a dispatcher, I want to reserve fully available requested quantities against that job so the reserved stock cannot be promised to another job.
- As a dispatcher, I want a clear shortage result for a part that is not fully available so I know what remains unreserved.

## Testable acceptance criteria

1. Given an existing `SCHEDULED` job and a valid part request, when availability is checked, the result reports the available quantity for each requested part and creates no reservation.

   > **Human review annotation:** The BA draft said “existing scheduled job” without tying eligibility to the repository's job status. `SCHEDULED` is the explicit status already represented by Feature 1; this removes ambiguity without adding a new status policy.

2. Given an existing `SCHEDULED` job and a requested part quantity less than or equal to that part's available stock, when the quantity is reserved, a reservation for exactly the requested quantity is associated with that job and part, and the available quantity decreases by that amount.

3. Given a requested part quantity equal to its available stock, when it is reserved, the full quantity is reserved and the remaining available quantity is zero.

4. Given a requested part quantity greater than its available stock, when reservation is attempted, none of that part's requested quantity is reserved, and the result reports both the available quantity and the shortage against the requested quantity.

   > **Human review annotation:** The BA draft made every short line reject every other line in a multi-part request. That cross-part rollback is not required by the intent. A short line is not partially allocated, but does not block reservation of other fully stocked lines.

5. Given multiple requested parts where some lines are fully available and others are short, when reservation is attempted, each fully available line is reserved for its full requested quantity and each short line remains unreserved.

   > **Human review annotation:** This criterion makes the independent-line policy explicit, replacing the BA draft's invented all-or-nothing multi-part transaction.

6. Given a missing job, a job whose status is not `SCHEDULED`, a missing part, or an invalid quantity (zero, negative, or fractional), when availability is checked or reservation is attempted, the request is rejected and no reservation or stock quantity changes for the rejected line.

   > **Human review annotation:** The BA draft's quantity assumption is retained as a positive whole-number request; no unit model or conversion is added.

7. Given active reservations and another request for the same part, when availability is checked or a reservation is attempted, already-reserved quantities are excluded from availability and no successful reservations cause total reserved quantity to exceed on-hand stock.

   > **Human review annotation:** The BA draft mentioned duplicate/competing requests as an open question but did not make the core “cannot be promised again” intent testable. This criterion requires the no-overselling invariant while leaving identical-request idempotency behavior unspecified.

8. Given a reservation request for an existing scheduled job, when it is checked or reserved, the job's technician, start time, end time, and status are not changed by this feature.

   > **Human review annotation:** The BA draft made Feature 1's calendar rule itself an acceptance criterion, even though Feature 2 must not book or revalidate appointments. This criterion checks only the in-scope boundary: reservation does not mutate the existing job.

## Edge cases

- Requested quantity exactly equals available stock: reserve the full quantity; zero remains available.
- Available stock is positive but less than the requested quantity: reserve none of that line, report available and shortage quantities, and do not create a backorder.
- No stock is available: report the shortage and reserve none of that line.
- A multi-part request has both fully available and short lines: reserve the fully available lines and leave only short lines unreserved.
- A part is already reserved by another job: subtract its active reservation from availability before checking the new request.
- Missing job, non-`SCHEDULED` job, or missing part: reject the affected request without changing its reservation or stock.
- Quantity is absent, zero, negative, or fractional: reject without changing the affected reservation or stock.
- Duplicate submissions: do not promise reserved stock twice; whether identical requests are idempotent or distinct requests remains an open product decision.
- A scheduled job's booking intersects another job's reserved calendar interval or starts exactly at its end boundary: these outcomes belong to Feature 1's calendar behavior, not to this feature's stock check or reservation operation.

## Named dependencies

- **Feature 1 decision — “Decision: booking conflicts use half-open reserved intervals”** in `pipeline/decisions/feature-1-decisions.md`: each booking reserves `[start, scheduled end + 45 minutes)`, intersections for the same technician conflict, and a booking at the exact end boundary is allowed.
- **Feature 1 decision — “Decision: standard travel buffer per job is 45 minutes”** in the same file supplies the 45-minute value used by the interval decision.

Feature 2 accepts an already scheduled job and must not redefine, revalidate, or implement either calendar decision.

> **Human review annotation:** The BA surfaced the dependency without prompting. I retained it by exact decision name, but removed calendar-boundary testing from Feature 2's acceptance criteria; those tests belong to the calendar feature.

## Measurable success metrics

Measured by acceptance tests, not production telemetry:

- **Availability accuracy:** 100% of test cases report the expected available quantity after active reservations are deducted.
- **Reservation accuracy:** 100% of sufficiently stocked test lines reserve exactly the requested quantity.
- **Short-line safety:** 100% of insufficient-stock test lines reserve zero of the requested quantity and report the shortage.
- **Independent-line behavior:** 100% of mixed-availability multi-part tests reserve full-stock lines and leave short lines unreserved.
- **No overselling:** 0 test cases leave total active reservations above on-hand stock.
- **Job preservation:** 100% of reservation tests leave the existing scheduled job's technician, time window, and status unchanged.

> **Human review annotation:** Metrics are framed as test-suite targets because the repository defines no production telemetry system.

## Assumptions and open decisions

- Requests use positive whole-number quantities. No unit conversion or fractional stock is specified.
- Available stock is on-hand stock minus active reservations.
- Eligibility means an existing job with status `SCHEDULED`, matching Feature 1's existing job model.
- The repository uses seeded in-memory mock data; stock persistence across application restarts is not a requirement here.
- Reservation release, expiry, and automatic release on job completion or cancellation are unspecified and remain outside this feature.
- Identical duplicate-submission behavior is unspecified; it must not violate the no-overselling criterion.

> **Human review annotation:** The in-memory stock assumption follows the repository's existing no-database convention; seed catalog and quantities remain implementation fixtures rather than business policy.
