# Feature 1 — Technician Availability Calendar

| Field | Value |
|---|---|
| **Status** | Pre-baked — already built through the pipeline described in `pipeline/orchestration.md`; this is the worked reference, not something you build |
| **One-line intent** | Let a technician's job commitments be scheduled and checked for conflicts |
| **Depends on** | None — this is the root of the feature chain |
| **In scope** | Booking a technician to a job slot; listing a technician's jobs; rejecting bookings that overlap an existing one for the same technician |
| **Out of scope** | Parts, inventory, or stock of any kind — that starts with Feature 2 |
| **Definition of Done** | A technician can be booked for a job; a technician's jobs can be listed; overlapping bookings for the same technician are rejected with a clear conflict error |

## What's implemented

- `GET /api/technicians` — list all technicians (mock, seeded at startup)
- `GET /api/technicians/{id}/jobs` — a technician's booked jobs
- `POST /api/jobs` — book a new job for a technician

## Booking conflict behavior

Bookings for the same technician are rejected when their reserved intervals overlap. Each reserved
interval is half-open: `[start, scheduled end + 45 minutes)`, using the 45-minute travel buffer
recorded in `pipeline/decisions/feature-1-decisions.md`. Thus, a 09:00-11:00 job blocks a 10:00
booking and a booking at 11:30, while a booking at exactly 11:45 is allowed. Conflicts continue to
return HTTP 409.

## Artifacts this feature touches

- `backend/.../service/TechnicianAvailabilityService.java`
- `backend/.../controller/TechnicianController.java`, `JobController.java`
- `backend/.../model/Technician.java`, `Job.java`, `JobStatus.java`
- `backend/.../data/MockDataStore.java`
- `backend/src/test/java/com/serviceforge/service/TechnicianAvailabilityServiceTest.java`
- No `pipeline/rules/*.md` yet — none has been needed until now
