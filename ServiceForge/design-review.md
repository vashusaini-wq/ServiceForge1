# Design Review — Parts Reservation

**Challenge source:** AI assistant.

- **Need:** Sam can request `P-100` for a scheduled job and see confirmation after the backend creates the reservation. The protected reserve action rechecks availability when reserving, so active reservations cannot exceed stock.
- **Challenges and outcomes:**
  - Two users compete for the last unit: only one request succeeds.
  - No stock: show “Part unavailable” and create no reservation.
  - Sam submits twice: the same request ID and payload return the original result, not a second reservation; a different payload with that ID is rejected.
  - A reservation is released twice: only the first release restores availability.
  - Notes cannot bypass rules. If the critic rejects or is unavailable, do not finalize the reservation.
- **Reservation data:** Store the part, user, request ID, time, and status; also store the job and quantity as specified in the ADR.
- **Improvement to ADR:** Make request-ID idempotency explicit to prevent duplicate reservations on retries.
- **Alternative not adopted:** A 15-minute expiry could release abandoned reservations, but the expiry policy needs clarification before implementation.

**Ready** — core behavior and failure outcomes are clear; expiry remains undecided.
