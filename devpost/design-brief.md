---
status: approved
---

# Design brief: RunCodex

## The one spatial moment
After asking Codex to handle a small coding task, the user steps away from the desk to make coffee. RunCodex gives them a glanceable status beside their mug, lets them respond to an approval request, and shows a brief completion summary.

## Why it belongs on glasses
- Uses: draws in the world; leaves your body free.
- Why it's better than the phone or laptop version: The user can check a task and respond while away from the desk, with hands available for making coffee and eyes kept on the room.

## Product or overlay
- Type: product: RunCodex is the virtual status and approval interface.
- What the real version would sense: Nothing in the physical room. A live Codex connection would provide task status and approval information, but it is outside this Preview prototype.
- Stand-in for the preview: Clearly labeled sample task data with Working, Needs approval, and Done states. Show a persistent, readable “SAMPLE DATA — NOT CONNECTED TO CODEX” label anywhere task status or approval information appears. Simulated Approve and Reject actions demonstrate the response flow; no live Codex control is required.

## Where things live
- Where the user is looking during the main task: Toward the counter, mug, and coffee maker while making coffee.
- RunCodex button: Beside the mug, slightly off to one side of the coffee maker; stays anchored to that spot as the user moves. Keep it reachable and clear of the user's hands and coffee maker. Button size: large enough for a forgiving pinch (default).
- Attention cue: Subtle and beside the mug, near the RunCodex button.
- Status panel: Just above the counter beside the mug, slightly off to one side of the coffee maker, at a comfortable glance height and clear of the user's hands and coffee maker. It remains anchored in the room and does not follow the user or sit in the center of their view. Use a virtual counter, mug, and coffee maker in Preview. Placement distance: about 1 m from the user (default). Panel dimensions: compact, readable at that distance (default).

## Hands and input
- Open panel: Pinch the RunCodex button beside the mug.
- Respond to an approval request: Pinch the separate Approve or Reject button in the panel. Give clear visual feedback so the user can tell the pinch registered.
- Request the completion summary: Pinch the clearly labeled Read summary button. Show the summary as text in Preview; spoken playback is an optional enhancement if available.
- Targets are big and highlight when aimed at.
- Voice: The intended voice-first experience can ask to open RunCodex or hear the summary. In Preview, the RunCodex button and Read summary button provide the corresponding hand actions.

## When things show
- RunCodex button: Visible beside the mug so the user can open the panel when they choose.
- Status panel: Hidden until the user pinches the RunCodex button or the Needs approval cue. It stays closed until opened by the user. Show the persistent “SAMPLE DATA — NOT CONNECTED TO CODEX” label, the sample task name, and one clear status: Working, Needs approval, or Done.
- Approval cue: When the sample task needs approval, show a subtle cue beside the mug and wait for the user to open the panel with a pinch; do not open it automatically.
- Approval details: After the user opens the panel in Needs approval, show a short explanation and separate Approve and Reject buttons.
- After Approve: Clear the cue, keep the panel open, show “Approved — Codex is working again,” then show the Working state.
- After Reject: Clear the cue, keep the sample task paused, and show “Rejected — waiting for your next instruction.”
- Completion summary: In the Done state, show a brief summary and the Read summary button. Pinching it displays the summary text in Preview; spoken playback is optional.
- If something needs attention out of view: The cue stays beside the mug, next to the anchored RunCodex button; no sound or arrow is needed.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. I can see a virtual counter, mug, and coffee maker, with the RunCodex button staying beside the mug when I move around.
2. A simulated hand pinch on the button opens the panel; it stays closed until I choose to open it.
3. With sample data, Working shows the task name and status without an approval cue.
4. Needs approval shows a subtle cue beside the mug. Pinching it opens a brief explanation with separate Approve and Reject buttons.
5. Done shows a short completion summary. Pinching Read summary displays the text in Preview, with speech as an optional enhancement.

## Out of scope
- A live Codex connection or control of real Codex tasks; use clearly labeled sample data for the Preview prototype, with “SAMPLE DATA — NOT CONNECTED TO CODEX” visible wherever task status appears.
- Reliable voice commands or spoken playback in Preview; hand controls and visible summary text carry the demo.
- Any UI or demo text in a language other than English.

## Risks and open questions
- Live Codex connection and spoken playback are not demonstrated in this Preview prototype.
- Whether the anchored controls remain comfortable and easy to reach over time is feel unproven on real glasses.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
