# Feature 1 — Decision Log

Decisions made while building Feature 1 that later features may need to retrieve. This file exists so a later feature's memory-retrieval step has something concrete to pull a single fact from, instead of needing the entire build history in context.

## Decision: standard travel buffer per job is 45 minutes

**What was decided:** every booked job reserves not just its own start/end time on a technician's calendar, but an additional 45-minute travel buffer, to account for the technician getting to the next job. This is encoded as `TRAVEL_BUFFER_MINUTES = 45` in `TechnicianAvailabilityService`.

**Why it matters beyond Feature 1:** this buffer is what actually limits how many jobs — and, later, how many parts-reservations tied to those jobs — can realistically be scheduled for one technician in a day. Anything built on top of the calendar that reasons about "how many jobs can fit today" needs this number, not a guess.

**Where it lives in code:** `backend/src/main/java/com/serviceforge/service/TechnicianAvailabilityService.java`, `TRAVEL_BUFFER_MINUTES` constant.

## Decision: booking conflicts use half-open reserved intervals

**What was decided:** each job reserves `[start time, scheduled end + 45 minutes)`, a half-open interval.
A booking for the same technician conflicts when its reserved interval intersects an existing
job's reserved interval. The service uses `TRAVEL_BUFFER_MINUTES` for both intervals.

**Boundary behavior:** the end point is excluded, so a new job may start exactly 45 minutes after
the earlier job's scheduled end. A start during that 45-minute travel buffer conflicts. For example,
a seeded 09:00-11:00 job conflicts with starts at 10:00 and 11:30, but permits 11:45.

**Why it matters:** this makes interval overlaps impossible while preserving the travel time required
between jobs. Booking conflicts still follow the existing HTTP 409 response path.

**Where it lives in code:** `backend/src/main/java/com/serviceforge/service/TechnicianAvailabilityService.java`.
