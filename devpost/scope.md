# Project Scope

> Retrospective record reconstructed on 2026-10-27 from the approved design brief, current project files, and implementation notes. The original time budget and complete contemporaneous interview notes were not preserved; this document does not invent them.

## Project Name Candidates

- RunCodex (selected): a spatial Codex conversation companion for Specs.
- Codex Workbench: a more task-oriented alternative; not selected because the experience centers on the existing Codex conversation.

## One-Line Summary

RunCodex brings a project-scoped Codex conversation into a Specs work area, where a developer can review streamed progress, dictate and send a follow-up, and respond to a real approval request.

## Target User

Developers who use Codex on a paired Mac and want to keep an eye on a coding task while looking away from the laptop. The Lens Studio project targets Specs glasses through the manifest's `Spectacles` enum and has been run in Preview with SPECS 27 selected; physical-device behavior is not claimed as verified.

## Problem

Following a coding task and responding to its approval requests currently pulls the developer back to a laptop display. RunCodex explores a glanceable, hands-free spatial companion while keeping Codex execution on the paired Mac.

## Core Workflow

1. Open the RunCodex launcher in the work area.
2. Select a project-scoped Codex thread and review its status and recent messages.
3. Dictate a follow-up, review the recognized text, and send it.
4. Read streamed user and assistant messages as the turn progresses.
5. Review and approve or reject a genuine pending request from the connected Codex session.
6. Move or recenter the launcher and panel when needed; use clearly labeled sample mode when no live bridge is available.

## What We Are Building

- A world-locked Specs Lens with a launcher and movable conversation panel.
- A readable task status and recent conversation view with bounded scrolling.
- Speak/Stop speech recognition with a visible draft and explicit Send action.
- Live user-message, assistant-message, turn-status, and approval updates.
- A local development bridge between one paired Lens client and the Codex App Server on the Mac.
- Clear disconnected/sample states so sample content cannot be mistaken for a real task or approval.

## What We Are Not Building

- A public cloud service, multi-user relay, arbitrary shell, or remote project-file browser.
- A custom virtual keyboard, code editor, or spoken assistant response.
- Automatic approval or invented sample approvals presented as real.
- A claim of physical Specs device, comfort, or on-device interaction verification.

## Inspiration And References

- The existing Codex thread and approval workflow, adapted to a spatial interface rather than reproduced as a desktop chat window.
- Specs hand interaction and speech input patterns documented by Snap.
- See [design-brief.md](design-brief.md) and [two-way-codex-plan.md](two-way-codex-plan.md) for the project-specific design and implementation record.

## Demo Path

In Lens Studio Preview with SPECS 27 selected, open the launcher, show the conversation panel, and demonstrate the composer, message layout, live Codex messaging, and approval handling. The participant reports that the full RunCodex experience works in this Preview setup. Explain the local bridge flow. Identify sample content as sample-only and do not present it as live functionality.

## Submission Story

RunCodex tests whether a developer can stay oriented to a coding task while returning attention to their physical workspace. The differentiator is a spatial, movable conversation surface paired with reviewed voice input and human approval controls, backed by a deliberately local relay.
