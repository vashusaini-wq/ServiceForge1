# AI-use log — Feature 2 requirements kata

**Date:** 2026-11-13  
**Artifact:** `pipeline/features/requirements.md`

## AI use

- Asked the named `ba-agent` to draft Feature 2 requirements from the explicit intent: check stock for parts needed by an already scheduled job, reserve requested quantities so reserved stock cannot be promised again, and preserve Feature 1's committed calendar rule.
- The agent returned a draft in its response; it did not edit or commit repository files.
- Reviewed every acceptance criterion against the intent, consulted the existing Feature 1 spec and decision log, and made the human interventions documented inline in `requirements.md`.
- `/clear` is not available in this interface. The repository files were inspected as the source of truth; I did not claim a context reset.

## Reflection

- **Where the first draft needed the most correction:** it treated a multi-part request as one all-or-nothing transaction, though the intent only requires that a requested part quantity not be promised when it is short. The requirements now handle each part line independently.
- **Edge case this exercise surfaced:** when one requested part is short but another is fully available, reserve the full-stock line, leave the short line unreserved, and do not create a backorder.
- **What I will check first next time:** read each acceptance criterion literally against the stated intent and the named upstream decisions; separate necessary invariants from implementation or business policy the intent did not choose.
- **What I would tell A1-me:** “A plausible extra rule is still a product decision—especially when it changes an entire multi-part request.”
