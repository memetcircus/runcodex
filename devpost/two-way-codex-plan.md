# RunCodex two-way interaction — Phase 1 audit, plan, and current status

## Scope

Add a text composer and conversation response view to the existing RunCodex experience while retaining status, approval, rejection, completion response, and long-message scrolling. The current design brief records the world-locked launcher/panel placement in the user's Codex work area, explicit Move / Recenter behavior, and two-way conversation direction.

## Initial repository and scene findings

- Lens Studio project: 5.23.2, core 372; current editor setting and manifest target enum: `Spectacles` (Specs glasses platform). The participant reports running Preview with SPECS 27 selected.
- The Devpost planning folder is present. The approved design brief began as a sample-only prototype plan; it has since been updated to describe the live Codex conversation and world-locked work-area placement. At the time of this initial audit, no `scope.md`, `prd.md`, technical spec, checklist, or `.devpost-hackathon-state.json` was present, so the Learn `build-spec`/`build-checklist` commands could not run under their stated prerequisites.
- On 2026-10-27, `scope.md`, `prd.md`, `spec.md`, `checklist.md`, and `build-notes.md` were added under `devpost/` as retrospective records from the current project and prior implementation notes. They are English-language planning artifacts, not evidence that those exact documents preceded the build. `.devpost-hackathon-state.json` remains absent because it is local workflow state rather than a submission planning document.
- The active `Scene.scene` contains `RunCodexExperience` with its enabled `RunCodexUI` ScriptComponent referencing `Assets/Scripts/RunCodexUI.ts`. The local bridge URL/pairing input is saved in the scene; do not copy those values into source, docs, logs, or public commits.
- At the start of this work, `RunCodexUI.ts` already handled `thread/list`, `thread/resume`, approval prompts, `turn/started`, `turn/completed`, `item/agentMessage/delta`, and completed assistant messages, but had no composer, send path, user-message display, or send/error state. The current implementation now has those conversation features and uses the SPECS ASR Speak/Stop flow.
- At the start of this work, `bridge.mjs` was a local WebSocket relay to a Codex App Server socket. The initial audit found that it allowed `turn/start` but forwarded request parameters without method-specific validation and did not allow `turn/steer`. Its default socket path was absent in that shell while a different Codex IPC socket existed. The later participant-confirmed SPECS 27 Preview run exercised the configured local connection successfully. Other host setups need the correct local App Server socket; do not guess a replacement path.
- At the start of this work, the bridge listened on `0.0.0.0`, authenticated with a local pairing token, and used unencrypted WebSocket. The current implementation validates the local peer and text payload, limits the supported methods, and filters tool output; it remains a development-only unencrypted WebSocket service and should not be exposed publicly.

## Verified API compatibility

- The current composer uses Specs speech-to-text through the ASR module, followed by explicit Send. It does not use the native virtual keyboard or a custom keyboard. Physical-device speech and interaction behavior are not verified by Preview testing.
- The official Codex App Server protocol documents resuming an existing thread, sending text with `turn/start`, steering an in-flight turn with `turn/steer` plus `expectedTurnId`, and streaming `item/agentMessage/delta` until `turn/completed`. Use only those text/thread fields. The public API documents the protocol; the private Unix-socket discovery path used by the current local relay is an implementation detail. The participant has since confirmed live message sending/receiving and real approval handling in Lens Studio Preview.

## Implementation plan and outcome

1. **Composer and response view — `Assets/Scripts/RunCodexUI.ts`.** Implemented Speak/Stop transcription through Specs ASR, a visible draft, explicit Send, duplicate-send protection, timeout/reconnect feedback, user-message display, and streamed Codex text. The status, approval card, completion response, and long-text scrolling remain in the panel.
2. **Bounded App Server forwarding — `Assets/RunCodexBridge/bridge.mjs`.** The local bridge validates the client and text request, limits project-scoped thread access, permits the supported turn start/steer calls, filters tool output, and keeps pairing information out of logs. It remains a development-only local service.
3. **Spatial placement.** The launcher and panel are placed once from the current view, then remain world-locked. Move / Recenter explicitly places them at the current view. Runtime Billboards and per-frame camera-follow placement are removed; decorative room props have been removed from the active scene hierarchy.
4. **Recovery and verification.** Timeout/disconnect recovery and existing Approve/Reject behavior are retained. Recompile and Preview logs passed after the placement change. In a later Preview session, the participant confirmed that live Codex messages can be sent and received and a real approval request can be handled with Approve/Reject. No physical-device result is implied.

## Implementation and verification status

- `Assets/Scripts/RunCodexUI.ts` includes Speak/Stop ASR input, draft display, Send/Sending states, duplicate-send protection, timeout and reconnect draft recovery, selected-thread `turn/start` or `turn/steer`, user-message display, and streamed assistant deltas. The launcher and panel are placed once from the current view, remain world-locked, and can be moved with Move / Recenter. Runtime Billboards and per-frame camera-follow placement are removed. Sample task behavior remains in source.
- `Assets/RunCodexBridge/bridge.mjs` now validates the local peer and text payload, uses fixed safe parameters for thread listing/resume/turn listing, tracks the active turn for safe steering, filters tool outputs, and no longer prints the pairing token.
- `Assets/RunCodexBridge/README.md` documents development-only run and Preview steps.
- Passed in the recorded placement change: TypeScript recompile; Preview refresh/log collection with no runtime errors; closed launcher visible in Preview; decorative room props are absent from the active scene hierarchy; `git diff --check`.
- Current user-confirmed Preview status: the full RunCodex experience runs successfully with SPECS 27 selected, including live Codex messages and real approval requests handled with Approve/Reject.
- The current `Scene.scene` retains its local bridge configuration and has the named decorative room props removed from the active hierarchy. Keep it private and do not expose the pairing values.

## Blockers and limits

- No physical-device verification is documented; on-device ASR, placement comfort, and hand input remain unverified.
- The local bridge is development-only and depends on the paired Mac's Codex App Server. Live message send/receive and real approval Approve/Reject behavior are confirmed by the participant in Lens Studio Preview; that does not establish physical-device behavior.

## References

- Codex App Server: https://developers.openai.com/codex/app-server/
- Specs speech-to-text uses Lens Studio's `LensStudio:AsrModule` for dictated chat input; no custom keyboard is included.
- RunCodex bridge setup and local-only limitations: `Assets/RunCodexBridge/README.md`.
