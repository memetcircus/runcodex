# Product Requirements Document

> Retrospective requirements reconstructed on 2026-10-27 from the approved design brief and the current implementation. They describe the product as built; they are not a claim that these exact requirements were authored before implementation.

## Product Summary

RunCodex is a SPECS Lens Studio experience for following a Codex task from a spatial work area. A local Node.js bridge relays bounded text, status, and approval events between one Lens client and the Codex App Server on a paired Mac. The Lens supports a clearly labeled sample mode when it is disconnected.

## Target User

A developer using Codex on a paired Mac who wants to glance at progress, send a reviewed dictated follow-up, and respond to approval requests without repeatedly returning to the laptop screen.

## Core User Journey

The user opens the world-locked launcher, views the selected project thread, dictates a follow-up, reviews the transcript, and explicitly sends it. The conversation updates as messages and turn status arrive. If Codex requests approval, the Lens shows the request and lets the user approve or reject it. When the bridge is unavailable, the Lens communicates that state and labels any sample content clearly.

## Epics And User Stories

### Epic 1: Spatial access and placement

- As a SPECS user, I want to open and close RunCodex from a world-locked launcher so that the conversation is available in my work area.
- As a SPECS user, I want to move or recenter the launcher and panel so that I can place the interface where it is comfortable to read and reach.

Acceptance criteria:

- The panel is hidden until opened from the launcher.
- The launcher and panel remain at their selected world placement rather than continuously following the head.
- A visible grab control can reposition the panel and launcher together.

### Epic 2: Conversation visibility

- As a developer, I want to see the selected Codex thread, turn status, recent user and assistant messages, and the completed response so that I can follow work without refreshing the Lens.
- As a developer, I want long messages to remain readable in a bounded viewport so that the controls stay available.

Acceptance criteria:

- The selected thread's recent messages appear in the conversation view.
- New user and assistant content and status events update the interface when received.
- Long content can be scrolled without moving the panel or its controls.

### Epic 3: Reviewed voice follow-up

- As a developer, I want to dictate a follow-up and review the recognized text before sending so that speech-recognition errors do not go to Codex unnoticed.

Acceptance criteria:

- Speak starts speech recognition and Stop ends it.
- The recognized text is visible as an editable/reviewable draft before Send.
- Send is unavailable while disconnected or while another send is pending.
- A new turn uses `turn/start`; a follow-up to an active turn uses `turn/steer` where supported.
- Failures and disconnects do not silently discard an unsent draft.

### Epic 4: Real approval handling

- As a developer, I want to see the full text of a real pending Codex approval and choose Approve or Reject so that I retain control over consequential actions.

Acceptance criteria:

- Only a pending request from the live Codex connection is represented as a live approval.
- The approval explanation remains readable and the decision controls remain reachable.
- A decision is returned for the corresponding pending request and the interface reflects its resolution.
- Sample mode never represents a sample approval as a live request.

### Epic 5: Safe local connection and disconnected state

- As a project owner, I want the bridge to authenticate one paired Lens client, limit thread access to the configured project, and forward bounded plain text so that the local development connection has a clear boundary.
- As a user, I want the disconnected/sample state to be obvious so that I do not mistake sample content for live Codex data.

Acceptance criteria:

- Pairing requires a private token configured locally.
- Thread discovery is scoped to the configured project root and only supported App Server methods are exposed.
- The bridge does not forward tool output or serve as an unrestricted shell.
- The README instructs users not to port-forward or expose the unencrypted WebSocket bridge to the public internet.

## Edge Cases

- Bridge is unavailable, pairing fails, or the socket cannot reach the intended App Server.
- The selected project has no available threads or the selected thread cannot be resumed.
- Speech recognition returns an empty or partial transcript, fails, or is interrupted by disconnect.
- A send is already pending, a turn is active, or a turn completes while the user is composing.
- Assistant or approval text is long enough to need scrolling or wrapping.
- An approval request is resolved elsewhere before the user acts in the Lens.
- The panel is in sample mode and must not imply a real Codex task or approval.

## What We Are Building

The spatial launcher and panel, conversation and status display, reviewed ASR composer, live message streaming, real approval controls, local bridge, project-scoped thread access, and explicit sample/disconnected state.

## What We Would Add With More Time

- Verify the complete live message and approval round trip in a fresh Preview session.
- Verify all hand interactions and speech input on physical SPECS hardware.
- Improve recovery and usability based on device testing, including placement comfort and long-session behavior.
- Record and review the complete submission demo on the target device or Preview setup.

## Submission Proof Points

- A public repository containing the Lens Studio project and English planning documents.
- A short screen recording showing the Lens running in Lens Studio Preview and accurately distinguishing live behavior from sample mode.
- Testing notes that state which paths were exercised in Preview and which remain unverified on device.
