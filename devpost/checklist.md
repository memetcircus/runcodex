# Build Checklist

> Retrospective checklist reconstructed on 2026-10-27 from the current repository and implementation notes. Checked items mean the implementation/documentation is present in the repository; see each verification field for test limits. This is not a claim that every check was run during the original build.

## Build Preferences

- **Build mode:** Retrospective; original choice not recorded.
- **Comprehension checks:** N/A; original preference not recorded.
- **Git:** Source history contains incremental commits; an original commit cadence was not recorded.
- **Verification:** Yes; recorded Preview/compile checks exist, with explicit unverified paths below.
- **Check-in cadence:** N/A; original preference not recorded.

## Checklist

- [x] **1. Define the RunCodex product scope**
  Spec ref: `spec.md > Overview`
  What to build: Focus the project on a spatial Codex conversation, reviewed voice follow-up, and real approval handling.
  Acceptance: The target user, core workflow, non-goals, and demo story are stated.
  Verify: Review `design-brief.md` and `scope.md`.

- [x] **2. Set up the SPECS Lens Studio project**
  Spec ref: `spec.md > Stack`
  What to build: Configure a Lens Studio project for the Spectacles target and establish its scene and interaction packages.
  Acceptance: The repository contains the Lens Studio project and Spectacles scene assets.
  Verify: Inspect the project manifest and `Assets/Scene.scene`; Preview compilation is recorded in project notes.

- [x] **3. Build the spatial launcher and conversation panel**
  Spec ref: `spec.md > Components And Responsibilities > RunCodex Lens UI`
  What to build: Create the launcher, world-locked panel, conversation viewport, status, close, and move/recenter controls.
  Acceptance: The interface supports the documented open, close, and reposition workflow.
  Verify: Review `Assets/Scripts/RunCodexUI.ts` and the scene; open-panel and move/recenter Preview interactions are not fully verified in the recorded pass.

- [x] **4. Add reviewed SPECS speech input**
  Spec ref: `spec.md > Components And Responsibilities > RunCodex Lens UI`
  What to build: Add Speak/Stop transcription, a visible draft, and explicit Send.
  Acceptance: The user can review dictated text before it is sent; disconnected/pending-send states are handled.
  Verify: Review the ASR/composer implementation; physical-device ASR is unverified.

- [x] **5. Implement the local bridge boundary**
  Spec ref: `spec.md > Components And Responsibilities > RunCodex bridge`
  What to build: Authenticate the paired client, scope threads to the configured project, allow only supported calls, and filter forwarded content.
  Acceptance: The bridge remains a local relay and does not expose arbitrary shell or tool output.
  Verify: Review `Assets/RunCodexBridge/bridge.mjs` and its README; verify the socket path in the actual environment.

- [x] **6. Connect thread selection and user turns**
  Spec ref: `spec.md > Data Flow`
  What to build: Load project threads and send a reviewed user message with `turn/start` or supported `turn/steer` behavior.
  Acceptance: Thread and turn requests are routed through the bridge and the active conversation is represented in the Lens.
  Verify: Review the Lens and bridge protocol paths; perform a fresh live round trip before calling this end-to-end verified.

- [x] **7. Stream conversation and status updates**
  Spec ref: `spec.md > Data Flow`
  What to build: Relay supported user/assistant text and turn status to the conversation panel as events arrive.
  Acceptance: Incoming user prompts and assistant responses appear without requiring a Lens refresh.
  Verify: Review message-event handlers and recorded implementation history; confirm live event behavior in Preview.

- [x] **8. Handle genuine approval requests**
  Spec ref: `spec.md > Components And Responsibilities > Codex App Server`
  What to build: Show a real pending request and route the user's approve/reject decision back to that request.
  Acceptance: Sample mode cannot be mistaken for a live approval; controls remain readable in the approval layout.
  Verify: Review approval handlers and prior layout changes; a fresh live approval round trip is not recorded as verified.

- [x] **9. Document setup, safety, and limitations**
  Spec ref: `spec.md > Risks And Verification`
  What to build: Document private-network setup, pairing-token handling, local socket configuration, sample state, and device-test limitations.
  Acceptance: Setup instructions do not disclose local pairing credentials or instruct users to expose the bridge publicly.
  Verify: Review the root README and `Assets/RunCodexBridge/README.md`.

- [ ] **10. Prepare the final Devpost handoff**
  Spec ref: `spec.md > Demo And Submission Flow`
  What to build: Capture a sub-three-minute YouTube Preview demonstration, confirm the public repository and testing instructions, and complete the Devpost submission materials.
  Acceptance: The video demonstrates the project truthfully and all required submission fields and links are ready.
  Verify: Confirm the published video URL, repository visibility, submission fields, and testing instructions before submission.
