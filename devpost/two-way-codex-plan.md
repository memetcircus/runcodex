# RunCodex two-way interaction — Phase 1 audit and plan

## Scope

Add a small text composer and conversation response view to the existing RunCodex experience. Keep the approved status, approval, rejection, completion summary, and long-summary scrolling behavior. Keep the existing approved design brief intact; this file records the new live-interaction scope.

## Repository and scene findings

- Lens Studio project: 5.23.2, core 372, target `Spectacles`.
- `devpost/design-brief.md` remains present and approved. It predates live Codex integration and explicitly scopes live connection out. No Devpost `scope.md`, `prd.md`, technical spec, checklist, or `.devpost-hackathon-state.json` is present; the Learn `build-spec`/`build-checklist` commands therefore cannot run under their stated prerequisites. This task's explicit objective and phases provide the implementation acceptance criteria.
- The active `Scene.scene` is the recovered room scene. VirtualScene inspection found `RunCodexExperience` at the scene root with its enabled `RunCodexUI` ScriptComponent referencing `Assets/Scripts/RunCodexUI.ts`. The current local bridge URL/pairing input is saved in the scene; preserve the scene and do not copy those values into source, docs, logs, or commits.
- `RunCodexUI.ts` creates the launcher and panel at runtime and already handles `thread/list`, `thread/resume`, approval prompts, `turn/started`, `turn/completed`, `item/agentMessage/delta`, and completed assistant messages. It has no composer, `turn/start`/`turn/steer` send path, user-message display, or send/error state.
- `bridge.mjs` is a local WebSocket relay to a Codex App Server socket. It filters thread listing to the project root and restricts thread-specific calls to IDs returned by that list. It already allows `turn/start`, but forwards all request parameters without method-specific validation; it does not allow `turn/steer`. Its default socket path is absent in this shell while a different Codex IPC socket exists, so the currently running bridge depends on its launch environment. Do not guess a replacement socket path; preserve the active local connection and test the actual round trip before relying on it.
- The bridge currently listens on `0.0.0.0`, authenticates with a local pairing token, and uses unencrypted WebSocket. Add private/loopback-client validation and strict message/method limits while retaining same-Wi-Fi development use; do not bind a public service or relay file contents/tool output.

## Verified API compatibility

- SPECS supports the native `TextInputSystem` through `global.textInputSystem`, `requestKeyboard`, `KeyboardOptions`, `onTextChanged`, and `onReturnKeyPressed`. Lens Studio 5.23.2's `StudioLib.d.ts` contains these definitions. Use this native AR/mobile keyboard; do not build a custom keyboard. Snap documents that its keyboard will not appear in the Spectacles (2024) render simulation, so Preview keyboard verification requires simulation without that render. Physical Specs behavior remains unverified because no device is available.
- The official Codex App Server protocol documents resuming an existing thread, sending text with `turn/start`, steering an in-flight turn with `turn/steer` plus `expectedTurnId`, and streaming `item/agentMessage/delta` until `turn/completed`. Use only those text/thread fields. The public API documents the protocol; the private Unix-socket discovery path used by the current local relay is an implementation detail, so verify the actual selected thread and a real message round trip in Preview before calling the feature proven.

## Implementation plan

1. **Composer and response view — `Assets/Scripts/RunCodexUI.ts`.** Add a compact Compose control that opens the native text keyboard, a visible draft, Send, and bounded recent conversation text. Disable Send for blank/disconnected/in-flight duplicate requests; show sending, success, timeout, and error feedback. Render the user's text immediately and append streamed Codex response deltas. Keep the existing approval controls and summary viewport/scroll state.
2. **Bounded App Server forwarding — `Assets/RunCodexBridge/bridge.mjs`.** Validate client IP as loopback/private, allowed method, selected project thread ID, and text-only input with a 1–4,000 character limit. Allow `turn/start` for an idle thread and `turn/steer` only for the matching active turn; drop Lens-supplied cwd, sandbox, model, approval-policy, filesystem, and shell overrides. Forward only status, approval, user-message, and assistant-text events; filter tool outputs.
3. **Recovery and regression checks.** Handle timeout/disconnect/reconnect without duplicate sends; keep Approve/Reject and completed-summary scrolling. Recompile, collect Preview logs, exercise a real text message and response, then run the existing relevant LEAF scenarios. Use keyboard-capable Preview simulation where available.

## Implementation and verification status

- `Assets/Scripts/RunCodexUI.ts` now includes Compose/Edit, a system text keyboard request, draft display in the existing summary viewport, Send/Sending states, duplicate-send protection, 20-second timeout and reconnect draft recovery, selected-thread `turn/start` or `turn/steer`, user-message display, and streamed assistant deltas. The original sample summary and existing sample interactions remain in source.
- `Assets/RunCodexBridge/bridge.mjs` now validates the local peer and text payload, uses fixed safe parameters for thread listing/resume/turn listing, tracks the active turn for safe steering, filters tool outputs, and no longer prints the pairing token.
- `Assets/RunCodexBridge/README.md` documents development-only run and Preview steps.
- Passed: `node --check Assets/RunCodexBridge/bridge.mjs`; Lens Studio TypeScript recompile; Preview refresh/log collection (no RunCodex script errors); LEAF criterion 1 (spatial anchor); LEAF criterion 3 (working state/task name).
- LEAF criterion 2 failed because the live scene shows `CODEX BRIDGE OFFLINE`, while that sample-only scenario asserts the sample disclaimer. Criteria 4 and 5 failed because live mode hides `AdvanceSampleButton`, which those scenarios try to tap. Criterion 5's later summary checks were not reached; its source also expects old `SummaryScrollControls`/`SummaryScrollDown` objects while the current approved summary scroll is hand-based.
- Preview initially showed `LIVE CODEX · CONNECTED`; after LEAF resets, reconnect returned `Codex app-server is not ready` and the final launcher showed `CODEX BRIDGE OFFLINE`. The configured default socket path is currently not a Unix socket in this host environment (`test -S` returned false); the bridge's actual private socket override is not available to this run. The hand interaction tool also could not reach the launcher because a room collider obstructed its path. SPECS 27 render simulation does not show the native keyboard, and switching this Preview to desktop paused it. Therefore a user message was **not** entered, sent, or confirmed end-to-end; response streaming, approval round-trip, disconnect recovery, and device keyboard behavior remain unverified. Do not claim the new two-way flow has passed until the intended App Server endpoint is available and a keyboard-capable Preview or physical-device round trip succeeds.
- The current `Scene.scene` was not edited by this work. It already contains local development bridge configuration and pre-existing user changes; keep it private and do not commit those pairing values.

## Blockers and limits

- No physical Specs device is available; actual AR/mobile keyboard behavior and on-device hand input cannot be certified here.
- The active bridge process is reachable from Preview, but its private socket override is not visible in project source and its default path does not exist in this shell. The implementation must prove the existing selected-thread round trip before claiming that an arbitrary live CLI thread is controllable. If that fails, the documented fallback is a bridge-owned `codex app-server` process and thread, which would be a separate RunCodex conversation rather than an assumed attachment to an arbitrary active CLI session.
- Preview's current Spectacles 2024 render mode cannot display the native keyboard; switch simulation mode before attempting keyboard entry.

## References

- Codex App Server: https://developers.openai.com/codex/app-server/
- Specs Keyboard: https://developers.snap.com/spectacles/about-spectacles-features/apis/key-board
- TextInputSystem API: https://developers.snap.com/lens-studio/api/lens-scripting/classes/Built-In.TextInputSystem
