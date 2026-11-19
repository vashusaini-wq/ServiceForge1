# Rule: prevent overlapping technician bookings

Every booking operation must reject a new job when its reserved interval intersects a reserved interval for an existing job assigned to the same technician.

Each booking reserves the half-open interval `[start time, scheduled end + TRAVEL_BUFFER_MINUTES)`. Use the shared `TechnicianAvailabilityService.TRAVEL_BUFFER_MINUTES` decision; do not duplicate or guess the buffer value. Two intervals conflict when each starts before the other's reserved end. Because the intervals are half-open, a new booking may start exactly at the existing reservation's end.

Keep the conflict check in the booking service before saving the job. Surface a conflict through the existing API conflict response (HTTP 409). Do not alter another technician's bookings, the travel-buffer policy, or the scheduled job as part of a parts-reservation flow.

Regression coverage must include:

- Same-technician jobs with different start times and intersecting windows are rejected.
- A booking beginning during the 45-minute travel buffer is rejected.
- A booking beginning exactly at the reserved end is allowed.
- The same time window remains available to a different technician.

This rule is grounded in `pipeline/decisions/feature-1-decisions.md` and the regression tests in `backend/src/test/java/com/serviceforge/service/TechnicianAvailabilityServiceTest.java`.
