# RunCodex Project Notes

## Local Codex bridge

Problem 1: RunCodex shows **CODEX BRIDGE OFFLINE** when the local relay is not listening on its configured port.

Solution 1: Start the bridge from the project root on the Mac running Codex. Set `RUNCODEX_PROJECT_ROOT` to this project directory and set `RUNCODEX_BRIDGE_TOKEN` to the same private pairing token already configured for this Lens, then run `node Assets/RunCodexBridge/bridge.mjs`. The relay listens on port `8765` by default and connects to Codex through its local app-server Unix socket. Keep the pairing token private; do not paste it into project notes, source control, chat, or logs.

Problem 2: The bridge process cannot start because port `8765` is already in use.

Solution 2: Identify the process listening on port `8765`, stop the old RunCodex bridge process, then start the bridge again from the project root. Confirm the new process is listening on `8765` and that its startup output reports a connection to the local Codex app-server. Do not stop an unrelated process that owns the port.

Problem 3: Preview connects briefly and then returns to offline because the Codex app-server sends a large WebSocket frame.

Solution 3: `Assets/RunCodexBridge/bridge.mjs` allows frames up to 32 MB. After changing the bridge source, stop and restart the running bridge so Node loads the updated file. Frames larger than 32 MB are still rejected to keep memory use bounded.

Problem 4: The relay is running, but the Lens does not pair with it.

Solution 4: Use the LAN WebSocket address printed by the bridge at startup in the RunCodex component's bridge URL setting, with the `/runcodex` path. Keep the Lens and Mac on a reachable local network and use the already-configured private pairing token. Do not expose the development-only relay to the public internet. In Preview, use the small refresh icon in the panel's upper-right corner to retry the connection; reopening or refreshing Preview also causes the Lens to reconnect.

Problem 5: The RunCodex TypeScript changes compile, but the live bridge still appears offline.

Solution 5: Check the bridge terminal output for the first protocol or socket error, then check Lens Studio's Preview logs for the matching connection failure. Confirm the relay process is still listening on port `8765` and connected to the Codex app-server. Restart only the RunCodex bridge after correcting its failure; do not change the scene's private bridge settings as part of routine restarts.
