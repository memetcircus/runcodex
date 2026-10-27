# RunCodex Build Notes

> Consolidated retrospective notes updated 2026-10-27 from the existing design brief, project files, Git history, and implementation audit.

## Build Summary

RunCodex is a Specs Lens Studio project with a spatial launcher and conversation panel. The current editor setting and manifest use `targetPlatform: Spectacles` in Lens Studio 5.23.2. The participant reports successful Lens Studio Preview runs with SPECS 27 selected. The Preview target is separate from the manifest's platform enum. The Lens UI is implemented in TypeScript. A small Node.js bridge runs locally on a paired Mac and relays supported data between the Lens and the Codex App Server.

## Tooling And Planning

- The project has an approved design brief and implementation plan in this directory.
- The repository and existing notes document the Lens Studio, CLAD workflow, and Lens Studio MCP usage.
- The files `scope.md`, `prd.md`, `spec.md`, and `checklist.md` were reconstructed retrospectively from the current project; they are not represented as contemporaneous planning records.
- The Devpost Learn workflow state file is not included in this public planning archive. It is local workflow metadata, not a required submission artifact.

## Implementation Map

- `Assets/Scripts/RunCodexUI.ts` — launcher/panel UI, speech input, conversation rendering, turn status, and approval controls.
- `Assets/RunCodexBridge/bridge.mjs` — local WebSocket relay to the Codex App Server.
- `Assets/RunCodexBridge/README.md` — bridge setup and troubleshooting.
- `Assets/Scene.scene` — scene wiring. Local pairing settings must not be published.
- `README.md` — architecture, setup, safety boundaries, and limitations.

## Recorded Verification

- TypeScript compilation and Lens Studio Preview refresh/log checks are recorded in the project implementation notes.
- The launcher appeared in Preview in the recorded pass.
- The participant reports trying the full RunCodex experience successfully in Lens Studio Preview with SPECS 27 selected, including live Codex message sending/receiving and real approval handling with Approve/Reject.
- That Preview result does not verify physical Specs hand interaction, on-device ASR, comfort, or placement.
- These notes distinguish Preview verification from physical-device verification.

## Submission Follow-up

- Record a truthful Preview demonstration under three minutes and upload it publicly to YouTube.
- Confirm that the repository is public and contains the Lens Studio project without local credentials.
- Confirm the Devpost text, video URL, and testing instructions before submitting.
