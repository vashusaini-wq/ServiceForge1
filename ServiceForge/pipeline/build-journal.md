# Build journal

## Technician overlap-booking exercise

The confirmed defect was that two jobs for one technician with different start times could be silently accepted even when their booking windows overlapped. The production fix is in commit `d5331e6`; it compares half-open reserved intervals and uses `TRAVEL_BUFFER_MINUTES`.

**Doing became deciding before the overlap predicate was written:** the key choice was whether a new job at 11:45 conflicts with a seeded 09:00-11:00 job. The documented 45-minute travel buffer means 11:30 is still blocked, but the half-open interval ends at 11:45, so exactly 11:45 is allowed. Choosing that contract—not typing the comparison—was the judgment point.

**Comparison:** the direct implementation used the overlap condition inline, while the agent-directed version named the new and existing reserved ends before applying the same two-sided interval check. The code-level difference is readability, not behavior. The agent version preserves the 45-minute buffer on both intervals, rejects 10:00 and 11:30 against the seeded 09:00-11:00 job, and allows 11:45. Regression tests cover those boundaries and the focused test suite passed.

**What did not change:** the invariant that one technician cannot hold intersecting reserved booking intervals. The implementation path changed; the scheduling contract did not.

**Process note:** this repository history records an assistant-directed direct implementation and a delegated agent implementation, not a human-only keystroke session or a Claude Code diagnosis reviewed before coding. I cannot truthfully certify those exercise steps as completed without AI. The side-by-side comparison above records the code-level distinction without claiming otherwise.
