# RunCodex

**A spatial Codex companion for SPECS.** RunCodex brings a project-scoped Codex conversation into the user's work area, so they can check progress, dictate a follow-up, and handle a real approval request without returning to a laptop screen.

The Lens uses a small world-locked launcher and an on-demand conversation panel. The panel stays at its chosen place as the user turns; a grab bar lets them move it when needed. It is designed as a glasses interface, not a web page floating in front of the face.

## What it does

- Shows the selected Codex task, live turn status, recent conversation, and completion response.
- Uses SPECS speech recognition for **Speak / Stop** dictation. The user reviews the transcript before pressing **Send**.
- Streams Codex responses into a scrollable conversation viewport.
- Shows **Approve** and **Reject** only for a pending approval received from the live Codex connection.
- Keeps the panel hidden until the launcher is opened, and lets the user reposition the launcher and panel together.
- Includes a clearly marked sample flow for trying the interface without a live connection.

RunCodex does not include a custom virtual keyboard. Speech input availability depends on the Lens Studio Preview or SPECS environment and its ASR permissions and network access.

## How the connection works

```text
RunCodex Lens  <── local WebSocket ──>  RunCodex bridge  <── local socket ──>  Codex App Server
```

The bridge runs on the paired Mac. It is a development relay, not a hosted service or an unrestricted shell. It supports one paired Lens client, filters available threads to the configured project root, allows a limited set of Codex App Server methods, and forwards plain-text conversation content rather than tool output.

The bridge uses unencrypted WebSocket on a trusted local network. **Do not port-forward it or expose it to the public internet.** Keep the pairing token private and never put it in this README, screenshots, logs, or a public commit.

## Open the project

1. Install Lens Studio and Node.js on the Mac used for development.
2. Open [`Specs Base Template 2.esproj`](Specs%20Base%20Template%202.esproj) in Lens Studio.
3. Run the project in Lens Studio Preview. Without local bridge credentials, the Lens stays in sample mode and labels its content **SAMPLE DATA — NOT CONNECTED TO CODEX**.

The project file currently records Lens Studio **5.23.2** and the **Spectacles** target. SPECS 27 migration and physical-device behavior have not been verified in this repository; check the project configuration and Snap's current migration guide before targeting a different SDK version.

## Run the local bridge

For live Codex use, run the bridge from the project directory on the Mac that can reach the intended Codex App Server socket:

```sh
RUNCODEX_PROJECT_ROOT="$PWD" \
RUNCODEX_BRIDGE_TOKEN="<private local pairing token>" \
node Assets/RunCodexBridge/bridge.mjs
```

The bridge listens on port `8765` by default. In Lens Studio, configure the `RunCodexUI` component with the bridge's reachable private-LAN WebSocket URL (`ws://<mac-lan-address>:8765/runcodex`) and the same private pairing token. Use a unique token for your own development setup; do not reuse a token from another checkout.

The bridge must also be able to reach the Codex App Server. Its default socket location is an implementation detail; if it is not available in your environment, set `CODEX_APP_SERVER_SOCKET` only to a socket path you have independently verified belongs to the intended App Server. Do not guess a socket path. See [`Assets/RunCodexBridge/README.md`](Assets/RunCodexBridge/README.md) for setup details and troubleshooting.

## Try the Lens

- Open **RunCodex** from the world-locked launcher.
- In live mode, choose **Speak**, dictate a message, choose **Stop**, review the transcript, then choose **Send**.
- Read user and Codex messages in the conversation viewport. Long messages can be scrolled without moving the panel or its controls.
- When the connected Codex task raises a real approval request, review it and choose **Approve** or **Reject**. Sample mode is labeled and does not represent a live Codex approval.
- Pinch and drag the bar beneath the panel to move the launcher and panel together.

Preview interaction and ASR support can differ from the physical glasses. This repository has not been tested on physical SPECS hardware; no device-specific behavior is claimed here.

## Planning and implementation

- [`devpost/design-brief.md`](devpost/design-brief.md) — approved AR design brief.
- [`devpost/two-way-codex-plan.md`](devpost/two-way-codex-plan.md) — conversation integration audit, plan, and verification notes.
- [`Assets/Scripts/RunCodexUI.ts`](Assets/Scripts/RunCodexUI.ts) — Lens interface, interaction, conversation, and approval handling.
- [`Assets/RunCodexBridge/bridge.mjs`](Assets/RunCodexBridge/bridge.mjs) — development-only local relay.
- [`project_notes.md`](project_notes.md) — local bridge troubleshooting notes.

The Lens was planned with the Devpost Learn skill pack and built in Lens Studio using the CLAD workflow and Lens Studio MCP. The repository includes LEAF scenario scripts for Preview workflows; consult their current source before relying on them, because some scenarios may need updates as the interface evolves.

## Status and limitations

- TypeScript compilation and Lens Studio Preview refresh have passed in the current development checkout.
- Live message delivery and approval handling depend on a correctly paired local Codex App Server; verify those paths in your own setup before relying on them.
- No physical SPECS device test has been performed.
- The project manifest has not been confirmed as migrated to SPECS 27.
