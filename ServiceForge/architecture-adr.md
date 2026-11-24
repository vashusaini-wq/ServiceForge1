# Parts Reservation ADR

**Context:** A dispatcher must check, reserve, and release parts for an existing scheduled job; two users may request the last unit, so stock must never be oversold. Each reservation needs job, part, quantity, user, request ID, time, and status.

**Decision:** Angular sends the request to a Spring Boot reserve action, which validates it and asks the `ReservationCritic` before confirmation; `MockDataStore` records the reservation in memory. Under one store lock, the action checks duplicates and current availability, checks the critic, then creates the reservation. Identical request retries return the original result; failed checks create no reservation. Release changes `ACTIVE` to `RELEASED` once. Job notes cannot override rules; critic rejection or unavailability prevents finalization.

**Why:** One protected action makes the final stock check and reservation indivisible, so competing requests cannot both take the last unit; deriving availability from active reservations also makes release safe.

**Impact:** Every reservation must use this action; state resets on restart, and a single-process lock does not protect multiple app instances. Keep scheduling and travel-buffer rules unchanged; clarify user identity and reservation expiry/release policy before implementation.
