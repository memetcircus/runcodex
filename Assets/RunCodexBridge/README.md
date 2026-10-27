# RunCodex local bridge

The bridge is a development-only relay between the RunCodex Lens and a Codex App Server on the paired Mac. It is not a public endpoint, cloud service, or general-purpose shell interface.

The relay accepts one paired Lens client at a time. It filters thread discovery to `RUNCODEX_PROJECT_ROOT`, permits a limited set of App Server methods, validates plain-text turns (1–4,000 characters), and omits tool output from the Lens response.

## Requirements

- Node.js on the Mac running Lens Studio.
- A Codex App Server process reachable through its local WebSocket-over-Unix-socket endpoint.
- Lens Studio Preview and the RunCodex project open on the same Mac or reachable trusted private network.

## Start the bridge

From the project root, start the bridge with a private pairing token supplied through the local environment:

```sh
RUNCODEX_PROJECT_ROOT="$PWD" \
RUNCODEX_BRIDGE_TOKEN="<private local pairing token>" \
node Assets/RunCodexBridge/bridge.mjs
```

The default listener port is `8765`. The default listener host is `0.0.0.0`; the bridge checks that clients use loopback, private IPv4, or local IPv6 addresses, and requires the pairing token for the `/runcodex` WebSocket route. Set `RUNCODEX_BRIDGE_HOST=127.0.0.1` for host-only testing. A Lens client on another device needs a reachable private-LAN address.

The bridge's default Codex socket path is an implementation detail. If it does not resolve in your environment, set `CODEX_APP_SERVER_SOCKET` to a socket path that you have independently verified belongs to the intended Codex App Server. Do not guess or scan for a replacement socket. The bridge reports upstream connection errors in its terminal and provides a local `/healthz` endpoint.

## Pair Lens Studio

1. Start the bridge in the same development session as the intended Codex App Server.
2. In Lens Studio, select the `RunCodexExperience` object's `RunCodexUI` component.
3. Set its bridge URL to `ws://<mac-lan-address>:8765/runcodex` (use `127.0.0.1` for host-only Preview) and enter the same private token locally.
4. Do not commit or share the token, and keep it out of screenshots and logs.
5. Open the RunCodex launcher. A live project task and **LIVE CODEX · CONNECTED** indicate the client connected. If no bridge credentials are configured, the interface uses its explicitly labeled sample flow.

## Use the conversation

- In live mode, choose **Speak**, dictate a message, choose **Stop**, review the transcript, and select **Send**.
- The Lens uses SPECS ASR speech recognition; it does not include the native system keyboard or a custom keyboard. ASR availability depends on the Preview/device configuration, permission, account, and network.
- Codex responses appear in the conversation viewport and stream while the selected turn is active. Long messages stay in their bounded viewport and can be scrolled.
- **Approve** and **Reject** appear only for a pending approval received from the live Codex connection. The sample flow is clearly marked and is not a live approval.

## Security and limitations

- WebSocket traffic is unencrypted. Use a trusted private network only. Do not port-forward the bridge or expose it to the public internet.
- The bridge is designed for one paired Lens client. It validates the client address and pairing token, restricts thread access to the configured project root, and limits forwarded methods and text size.
- The App Server socket location and lifecycle are not a stable public integration surface. The participant-confirmed SPECS 27 Preview run exercised the configured connection successfully; when using another host, configure and confirm that host's intended local App Server socket.
- The participant reports that RunCodex was exercised successfully in Lens Studio Preview with SPECS 27 selected, including live message exchange and real approval handling. Physical Specs device behavior has not been verified.

## Troubleshooting

### The Lens says the bridge is offline

Check the bridge terminal for its upstream App Server connection status. Confirm that the URL in Lens Studio uses the bridge's reachable private-LAN address, port `8765`, and `/runcodex` path; verify that both sides use the same local token; then use the refresh icon in the RunCodex panel or reopen the Lens.

### The bridge reports that Codex App Server is not ready

The relay is running but has not completed the local App Server socket handshake. Start or restore the intended App Server in the same host environment. Set `CODEX_APP_SERVER_SOCKET` only when you know the correct socket path; do not infer it from unrelated Codex sockets.

### Voice input is unavailable

Check the Preview/device ASR support, microphone permission, account availability, and network access. RunCodex keeps the draft when transcription fails. SPECS 27 Preview use has been exercised; physical Specs device behavior has not been verified.
