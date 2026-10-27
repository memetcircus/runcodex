---
status: approved
---

# Design brief: RunCodex

## The one spatial moment
The user asks Codex to handle a coding task, then continues with their day. RunCodex keeps a compact launcher and conversation panel in the user's forward view, so they can dictate a follow-up, watch Codex respond, answer a real approval request, and read the completed response without returning to the Mac.

## Why it belongs on glasses
- Uses: keeps the current Codex conversation available in a glanceable, hands-free spatial interface, with voice dictation and pinch interactions.
- Why it's useful on glasses: The user can continue a Codex exchange while looking up and moving around, instead of repeatedly returning to a laptop screen. The launcher and panel stay at a chosen work-area location and can be moved into view on request.

## Product or overlay
- Type: a spatial Codex conversation client with task status and approval controls.
- What it connects to: a local development bridge relays text and supported status/approval events between the Lens and Codex App Server on the paired Mac. The bridge is development-only, not a public cloud service or arbitrary shell interface. Sample mode remains available when no live bridge is configured.
- Input and response: the Specs text-input/ASR mechanism supplies dictated text; the user reviews and sends it from the panel. Codex text appears in the conversation view, with long content scrollable inside its viewport.
- Trust cues: show the live connection state when paired. In sample mode, clearly label sample task data as “SAMPLE DATA — NOT CONNECTED TO CODEX”; never present sample approvals as live requests.

## Where things live
- Environment: the current experience is focused on the RunCodex interface in the user's Codex work area, with no decorative room set dressing competing with the conversation.
- RunCodex launcher: a compact world-space control placed once in the user's Codex work area at a comfortable, reachable glance height. It remains fixed in the room as the user turns or moves.
- Status and conversation panel: opens at the launcher's world-locked placement and remains there while open. It uses a compact, high-contrast surface, readable text, a message history, task status, and approval controls. It does not follow the user's head or rotate to face the camera continuously.
- Drag to reposition: a highlighted grab bar sits beneath the open panel. The user pinches and drags it to move the panel and launcher together, then releases to leave them fixed at the new world position.
- Attention cue: shown with the launcher/panel state when a real approval is pending; the panel does not replace or invent a Codex approval.

## Hands and input
- Open/close: pinch the launcher and use the panel's close controls.
- Compose: use the supported Specs text-input/ASR path to dictate a message, review it in the composer, then select Send. Sending is disabled while disconnected or while a send is already pending.
- Respond to a real approval: review its full text in the approval card and pinch Approve or Reject. The card disappears when the request is resolved; feedback stays in the conversation.
- Read responses: assistant text is displayed directly in the conversation/summary viewport and can be scrolled with the supported hand gesture. Long user messages also remain readable in their bounded viewport.
- Controls provide clear visual feedback and remain reachable at the selected workspace placement.

## When things show
- Launcher: a small, calm status/approval indicator remains visible at the selected workspace location so the user can open RunCodex.
- Panel: hidden on startup; opens when the launcher is selected. It shows the current bridge state, selected Codex task/conversation, recent user and assistant messages, and the composer. The full interface is not continuously in view.
- Approval: only a pending approval event from the live Codex connection opens the live approval card. Its explanation wraps within the card, with Approve and Reject fixed below it. Sample approval flows are clearly sample-only.
- Completion: when Codex completes a turn, show the response in the conversation viewport. The user can scroll long text; no separate “Read summary” action is required in the current interface.
- Offline state: make bridge disconnection clear and disable live message sending until the connection recovers.

## Done criteria
Check these in Lens Studio Preview where the required bridge and Specs input simulation are available; distinguish mock/sample checks from live protocol checks.
1. The launcher stays fixed at its selected world placement; the panel opens at the same work area and remains readable without clipping as the user turns.
2. The composer accepts reviewed text through the supported input mechanism; Send shows clear sending, success, offline, and error behavior.
3. User messages and Codex responses appear as separate conversation messages; long content scrolls without moving the rest of the panel.
4. A real pending approval displays its complete request in one approval card. Approve and Reject send the corresponding response, and the card hides when resolved.
5. Turn status and the completed Codex response update from the connected conversation. Sample mode remains explicitly labeled and cannot be mistaken for a live Codex approval.

## Out of scope
- Public cloud hosting, multi-user access, unrestricted shell access, or exposing the local bridge to the internet.
- Claiming physical-device keyboard, voice, comfort, or hand-tracking behavior as verified without a Specs device test.
- Voice commands that control the interface, spoken response playback, code editing, or arbitrary Codex session discovery beyond the bridge's supported project-scoped flow.
- Any UI or demo text in a language other than English.

## Risks and open questions
- The local Codex bridge depends on the paired Mac's Codex App Server being available; the bridge is not a public or always-on service.
- Physical-device speech recognition, hand tracking, long-term comfort, and placement comfort are not verified by Preview testing.
- The participant reports that the full RunCodex experience works in Lens Studio Preview with SPECS 27 selected, including live Codex message sending/receiving and a real approval request handled with Approve/Reject. This does not verify physical Specs device behavior.

## Build notes for CLAD
- Build for the Specs glasses platform. The current project manifest uses the `Spectacles` target-platform enum, and the participant reports successful Preview runs with SPECS 27 selected; physical-device verification is not claimed.
- Use Spectacles Interaction Kit (SIK) and UI Kit package names for interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Place the launcher and panel once in the near-field arm-reach zone, slightly below the display boresight, then keep them world-locked until the user drags the grab bar. Keep targets large enough for comfortable direct hand interaction and use the SIK InteractionPlane for the panel's near-field targeting.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Do not record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Move and look around.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Confirm the launcher and open panel stay fixed at their selected world placement as the view changes; pinch-drag the handle beneath the panel to move both together.
3. **Ask the three questions.**
   - Does the chosen work-area placement make the Codex conversation easy to find and read without becoming a face-locked website?
   - Does voice dictation plus glanceable status/approval keep the user from returning to the laptop for each step?
   - Does the panel leave enough of the real scene visible and keep the user's hands available?
   - Would it be just as good on a phone? If so, what value do voice input and spatial glanceability add on glasses?
4. **Check comfort.**
   - The compact launcher is easy to relocate; the panel stays at a comfortable work-area position without blocking too much of the real scene.
   - Every control is within easy pinch reach at the current placement; the highlighted bottom handle makes relocation discoverable.
   - Text reads easily at the intended viewing distance, and the panel stays compact.
   - Approval and connection feedback appear when needed; the panel can be closed when the user wants an unobstructed view.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the RunCodex panel 15 cm lower in the work area. Make the approval targets larger. Re-run the checks." If a fix takes under a minute, like nudging the panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
