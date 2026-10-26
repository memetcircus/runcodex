# RunCodex local bridge

The bridge is a development-only relay between the RunCodex Lens and a Codex App Server. It is not a public service. It supports one paired Lens client, filters threads to `RUNCODEX_PROJECT_ROOT`, limits Lens messages to one plain-text input of 1–4,000 characters, and does not forward tool output.

## Start it on the Mac

Start the bridge from the project root in the same host environment that can reach the Codex App Server control socket:

```sh
RUNCODEX_PROJECT_ROOT="$PWD" \
RUNCODEX_BRIDGE_TOKEN="<private pairing token>" \
node Assets/RunCodexBridge/bridge.mjs
```

The token must match the local pairing value configured on `RunCodexExperience` in Lens Studio. Keep it private; do not commit or share it. If the host uses a non-default socket location, set `CODEX_APP_SERVER_SOCKET` to the already configured local Codex App Server socket. The bridge's default socket path is an internal Codex implementation detail, so a fresh setup must verify that the path exists and that it belongs to the intended Codex process before starting.

The bridge listens on port `8765` by default and accepts only loopback, private IPv4, and local IPv6 clients. It uses unencrypted WebSocket for local development, so use it only on a trusted local network. Do not port-forward it or expose it to the internet. Use `RUNCODEX_BRIDGE_HOST=127.0.0.1` for host-only testing; a Spectacles client on Wi-Fi needs a reachable private LAN address.

## Preview flow

1. Start the Codex App Server and bridge in the same local development session.
2. In Lens Studio, confirm that `RunCodexExperience` has the local bridge URL and private pairing token configured. Do not put these values in screenshots or public project copies.
3. For SPECS-specific APIs and the native keyboard in Preview, set the Preview simulation to **No Simulation**, then open Preview **Settings → Device Type Override → Spectacles**. Turn on **Interactive Preview Mode**. Snap documents that the keyboard is hidden in the Spectacles (2024) render simulation; without that render it can be tested in Preview.
4. Open the Interactive Preview and use its simulated pointer/interaction to activate **Open RunCodex**. Confirm the launcher changes to `LIVE CODEX · CONNECTED` and a project task is selected.
5. Choose **Compose**. The system keyboard should open in this Preview mode; enter a short prompt and press **Send** (or the keyboard's **Send** return key). The Lens shows the sent text and streams assistant text into the summary viewport.
6. Use **Approve** or **Reject** when a Codex approval appears. Use **Read summary** after completion. A disconnected bridge disables sending; reconnect by reopening RunCodex or using **Refresh Codex status**.

In the **Spectacles (2024) render simulation**, the system keyboard is not drawn. Switch to **No Simulation** plus **Device Type Override → Spectacles** to test the native keyboard in Preview, or use a physical Specs device. Preview interaction is simulated and may use a mouse interactor rather than live hand poses. The current scene already contains enabled `HandVisuals`, `LeftHandVisual`/`RightHandVisual`, and hand interactor objects, while `RunCodexUI` subscribes to SIK `HandInputData` pinch events. So missing visible hands in this Preview does not by itself prove those assets are absent or tracking is broken. Physical hand tracking and its visual feedback still need testing on Specs.

The currently observed bridge failure is separate from keyboard/input: the bridge reports `Codex app-server is not ready`. In this host environment, its default endpoint does not resolve to a Unix socket, and the bridge’s private socket override is not available from the project. Start/restore the intended Codex App Server endpoint in the same host session as the bridge, then verify `/healthz` returns `{"ok":true,...}` before testing sends. Do not guess a socket path; the bridge README explains how to supply a known local socket. The endpoint lifecycle/path is not documented as a stable public interface. No physical-device result or end-to-end send is claimed here.
