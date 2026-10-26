# RunCodex two-way interaction — Phase 1 audit, plan, and current status

## Scope

Add a text composer and conversation response view to the existing RunCodex experience while retaining status, approval, rejection, completion response, and long-message scrolling. The current design brief records the world-locked launcher/panel placement in the user's Codex work area, explicit Move / Recenter behavior, and two-way conversation direction.

## Initial repository and scene findings

- Lens Studio project: 5.23.2, core 372, target `Spectacles`.
- The Devpost planning folder is present. The approved design brief began as a sample-only prototype plan; it has since been updated to describe the live Codex conversation and world-locked work-area placement. No Devpost `scope.md`, `prd.md`, technical spec, checklist, or `.devpost-hackathon-state.json` is present; the Learn `build-spec`/`build-checklist` commands therefore cannot run under their stated prerequisites.
- The active `Scene.scene` contains `RunCodexExperience` with its enabled `RunCodexUI` ScriptComponent referencing `Assets/Scripts/RunCodexUI.ts`. The local bridge URL/pairing input is saved in the scene; do not copy those values into source, docs, logs, or public commits.
- At the start of this work, `RunCodexUI.ts` already handled `thread/list`, `thread/resume`, approval prompts, `turn/started`, `turn/completed`, `item/agentMessage/delta`, and completed assistant messages, but had no composer, send path, user-message display, or send/error state. The current implementation now has those conversation features and uses the SPECS ASR Speak/Stop flow.
- `bridge.mjs` is a local WebSocket relay to a Codex App Server socket. It filters thread listing to the project root and restricts thread-specific calls to IDs returned by that list. It already allows `turn/start`, but forwards all request parameters without method-specific validation; it does not allow `turn/steer`. Its default socket path is absent in this shell while a different Codex IPC socket exists, so the currently running bridge depends on its launch environment. Do not guess a replacement socket path; preserve the active local connection and test the actual round trip before relying on it.
- The bridge currently listens on `0.0.0.0`, authenticates with a local pairing token, and uses unencrypted WebSocket. Add private/loopback-client validation and strict message/method limits while retaining same-Wi-Fi development use; do not bind a public service or relay file contents/tool output.

## Verified API compatibility

- The current composer uses SPECS speech-to-text through the ASR module, followed by explicit Send. It does not use the native virtual keyboard or a custom keyboard. Physical Specs behavior remains unverified because no device is available.
- The official Codex App Server protocol documents resuming an existing thread, sending text with `turn/start`, steering an in-flight turn with `turn/steer` plus `expectedTurnId`, and streaming `item/agentMessage/delta` until `turn/completed`. Use only those text/thread fields. The public API documents the protocol; the private Unix-socket discovery path used by the current local relay is an implementation detail, so verify the actual selected thread and a real message round trip in Preview before calling the feature proven.

## Implementation plan and outcome

1. **Composer and response view — `Assets/Scripts/RunCodexUI.ts`.** Implemented Speak/Stop transcription through SPECS ASR, a visible draft, explicit Send, duplicate-send protection, timeout/reconnect feedback, user-message display, and streamed Codex text. The status, approval card, completion response, and long-text scrolling remain in the panel.
2. **Bounded App Server forwarding — `Assets/RunCodexBridge/bridge.mjs`.** The local bridge validates the client and text request, limits project-scoped thread access, permits the supported turn start/steer calls, filters tool output, and keeps pairing information out of logs. It remains a development-only local service.
3. **Spatial placement.** The launcher and panel are placed once from the current view, then remain world-locked. Move / Recenter explicitly places them at the current view. Runtime Billboards and per-frame camera-follow placement are removed; decorative room props have been removed from the active scene hierarchy.
4. **Recovery and verification.** Timeout/disconnect recovery and existing Approve/Reject behavior are retained. Recompile and Preview logs pass after the placement change. A fresh live message/approval round trip and physical Specs interaction should be verified separately; the Preview interaction tool could not open the panel in this run.

## Implementation and verification status

- `Assets/Scripts/RunCodexUI.ts` includes Speak/Stop ASR input, draft display, Send/Sending states, duplicate-send protection, timeout and reconnect draft recovery, selected-thread `turn/start` or `turn/steer`, user-message display, and streamed assistant deltas. The launcher and panel are placed once from the current view, remain world-locked, and can be moved with Move / Recenter. Runtime Billboards and per-frame camera-follow placement are removed. Sample task behavior remains in source.
- `Assets/RunCodexBridge/bridge.mjs` now validates the local peer and text payload, uses fixed safe parameters for thread listing/resume/turn listing, tracks the active turn for safe steering, filters tool outputs, and no longer prints the pairing token.
- `Assets/RunCodexBridge/README.md` documents development-only run and Preview steps.
- Passed in the latest placement change: TypeScript recompile; Preview refresh/log collection with no runtime errors; closed launcher visible in Preview; decorative room props are absent from the active scene hierarchy; `git diff --check`.
- Not verified in this pass: opening the panel, using Move / Recenter, and visualizing the live approval card. `PreviewInteractTool` reported `Interaction failed (obstructed): Blocked by "Collider" between camera and target.` LEAF was not run. The Preview screenshot still has room furniture because it is part of the Preview environment, not the active project hierarchy.
- The current `Scene.scene` retains its local bridge configuration and has the named decorative room props removed from the active hierarchy. Keep it private and do not expose the pairing values.

## Blockers and limits

- No physical Specs device is available; on-device ASR, placement comfort, and hand input cannot be certified here.
- The local bridge is development-only and depends on the paired Mac's Codex App Server. Confirm a fresh message/response and approval round trip before claiming those paths verified. No physical Specs device test is available.
- In the latest Preview check, TypeScript compiled and refreshed runtime logs showed no errors. The closed launcher rendered. Preview interaction could not open it because the interaction tool reported it was blocked by a `Collider`; the open panel and Move / Recenter action therefore remain visually unverified in this pass. The room furniture still visible in the Preview screenshot belongs to the Preview environment, not the active project hierarchy.

## References

- Codex App Server: https://developers.openai.com/codex/app-server/
- SPECS speech-to-text uses Lens Studio's `LensStudio:AsrModule` for dictated chat input; no custom keyboard is included.
- RunCodex bridge setup and local-only limitations: `Assets/RunCodexBridge/README.md`.
