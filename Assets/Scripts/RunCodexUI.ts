import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import {HandInputData} from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData"
import {BaseHand} from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/BaseHand"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

type TaskState = "Working" | "Needs approval" | "Done" | "Rejected"

const SAMPLE_LABEL = "SAMPLE DATA — NOT CONNECTED TO CODEX"
const TASK_NAME = "Refactor coffee ordering tests"
const SUMMARY = "Updated 8 tests, removed 2 flaky waits, and all checks passed."
const SUMMARY_VIEWPORT_HEIGHT = 15.5
const SUMMARY_VISIBLE_LINES = 11
const SUMMARY_LINE_WIDTH = 52
const USER_MESSAGE_MIN_HEIGHT = 2.8
const USER_MESSAGE_MAX_HEIGHT = 7.2
const USER_MESSAGE_VISIBLE_LINES = 4
const USER_MESSAGE_HORIZONTAL_PADDING = 1.15
const USER_MESSAGE_VERTICAL_PADDING = 0.75
const USER_MESSAGE_LINE_WIDTH = 49
const APPROVAL_VERTICAL_PADDING = 1.0
const APPROVAL_ROW_GAP = 0.9
const HAND_SWIPE_THRESHOLD_CM = 2.5
const PREVIEW_SWIPE_LINE_THRESHOLD = 0.018
const LIVE_CONNECTED_LABEL = "LIVE CODEX · CONNECTED"
const LIVE_CONNECTING_LABEL = "CONNECTING TO CODEX BRIDGE"
const LIVE_OFFLINE_LABEL = "CODEX BRIDGE OFFLINE"

@component
export class RunCodexUI extends BaseScriptComponent {
  @input
  @label("Local Codex bridge WebSocket URL")
  bridgeUrl: string = ""

  @input
  @label("Local Codex bridge pairing token")
  bridgeToken: string = ""

  private panel!: SceneObject
  private launcher!: SceneObject
  private cue!: SceneObject
  private state: TaskState = "Working"
  private contentFlex!: FlexLayout
  private feedbackText!: SceneObject
  private closeButton!: SceneObject
  private restartButton!: SceneObject
  private approvalButtonRow!: SceneObject
  private actionsRow!: SceneObject
  private flexRows: Array<{item: FlexItem, sceneObject: SceneObject}> = []
  private actionGroupSpacer: {item: FlexItem, sceneObject: SceneObject} | null = null
  private refreshToActionsSpacer: {item: FlexItem, sceneObject: SceneObject} | null = null
  private approved = false
  private statusText!: Text
  private statusTextObject!: SceneObject
  private statusBreathElapsed = 0
  private statusBreathOffsetX = 0
  private approvalText!: SceneObject
  private approvalTextComponent!: Text
  private approvalTextItem!: FlexItem
  private approvalTopSpacer: {item: FlexItem, sceneObject: SceneObject} | null = null
  private approvalBottomSpacer: {item: FlexItem, sceneObject: SceneObject} | null = null
  private summaryText!: SceneObject
  private summaryTextComponent!: Text
  private summaryMetaRow!: SceneObject
  private summaryViewport!: SceneObject
  private summaryViewportBackdrop!: SceneObject
  private summaryViewportSurface!: RoundedRectangle
  private summaryProgressText!: Text
  private summaryViewportHeight = SUMMARY_VIEWPORT_HEIGHT
  private summaryVisibleLineCount = SUMMARY_VISIBLE_LINES
  private userMessageViewport!: SceneObject
  private userMessageProgressText!: Text
  private userMessageSurface!: RoundedRectangle
  private userMessageItem!: FlexItem
  private userMessageRowLayout!: FlexLayout
  private userMessageVisibleLineCount = USER_MESSAGE_VISIBLE_LINES
  private userMessageBubbleHeight = USER_MESSAGE_MIN_HEIGHT
  private userMessageProgressGap = 0
  private approveButton!: SceneObject
  private rejectButton!: SceneObject
  private summaryLines: string[] = []
  private summaryLineOffset = 0
  private handProvider = HandInputData.getInstance()
  private cameraProvider = WorldCameraFinderProvider.getInstance()
  private handSwipe = {
    left: {active: false, target: "summary" as "summary" | "userMessage", startY: 0, smoothedDelta: 0, maxDelta: 0, startedAt: 0},
    right: {active: false, target: "summary" as "summary" | "userMessage", startY: 0, smoothedDelta: 0, maxDelta: 0, startedAt: 0}
  }
  private previewTouchActive = false
  private previewTouchTarget: "summary" | "userMessage" | null = null
  private previewTouchLastY = 0
  private previewTouchRemainder = 0
  private showingFullSummary = true
  private advanceButton!: SceneObject
  private refreshStatusButton!: SceneObject
  private liveComposeRow!: SceneObject
  private composeButton!: SceneObject
  private sendButton!: SceneObject
  private lastUserMessageRow!: SceneObject
  private lastUserMessageText!: Text
  private lastUserMessage = ""
  private userMessageLines: string[] = []
  private userMessageLineOffset = 0
  private displayedUserMessage = ""
  private messageDraft = ""
  private finalizedVoiceText = ""
  private composerOpen = false
  private wasShowingFullSummaryBeforeCompose = false
  private pendingSendRpcId: number | null = null
  private pendingSendText = ""
  private currentTurnId = ""
  private sendTimeoutEvent!: DelayedCallbackEvent
  private voiceCaptureActive = false
  private asrModule: AsrModule | null = null
  private surface!: RoundedRectangle
  private opaqueBackdrop!: SceneObject
  private liveMode = false
  private liveConnected = false
  private codexReady = false
  private liveDisconnectRequested = false
  private liveSocket: WebSocket | null = null
  private liveThreadId = ""
  private liveApprovalId: number | string | null = null
  private liveApprovalMethod = ""
  private liveSummary = ""
  private liveRpcId = 0
  private liveRpcMethods: {[id: string]: string} = {}
  private reconnectEvent!: DelayedCallbackEvent
  private launcherSampleLabel!: ElementContent

  onAwake(): void {
    this.createRunButton()
    this.createPanel()
    this.contentFlex.onLayoutComplete.add(() => this.positionSummaryViewportBackdrop())
    this.opaqueBackdrop = this.findObject("RunCodexOpaqueBackdrop")
    this.opaqueBackdrop.enabled = false
    this.refreshState()
    this.panel.enabled = false

    this.createEvent("UpdateEvent").bind(() => {
      this.updateHandSwipes()
      this.updateWorkingBreath()
    })
    this.createEvent("TouchStartEvent").bind((event: TouchStartEvent) => this.onPreviewTouchStart(event))
    this.createEvent("TouchMoveEvent").bind((event: TouchMoveEvent) => this.onPreviewTouchMove(event))
    this.createEvent("TouchEndEvent").bind((event: TouchEndEvent) => this.onPreviewTouchEnd(event))
    this.createEvent("OnStartEvent").bind(() => {
      this.onStart()
      const left = this.handProvider.getHand("left")
      const right = this.handProvider.getHand("right")
      left.onPinchDown.add(() => this.beginHandSwipe("left", left))
      left.onPinchUp.add(() => this.endHandSwipe("left"))
      left.onPinchCancel.add(() => this.endHandSwipe("left"))
      right.onPinchDown.add(() => this.beginHandSwipe("right", right))
      right.onPinchUp.add(() => this.endHandSwipe("right"))
      right.onPinchCancel.add(() => this.endHandSwipe("right"))
    })
    this.reconnectEvent = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    this.reconnectEvent.bind(() => this.connectLiveBridge())
    this.sendTimeoutEvent = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    this.sendTimeoutEvent.bind(() => {
      if (this.pendingSendRpcId === null) return
      this.pendingSendRpcId = null
      this.messageDraft = this.pendingSendText
      this.pendingSendText = ""
      this.findText("ApprovalFeedback").text = "Codex did not respond in time. Your draft is ready to retry."
      this.refreshState()
      this.updateLiveContentView()
    })
  }

  onStart(): void {
    const coolWhite = new vec4(0.94, 0.98, 1, 1)
    const cyan = new vec4(0.3, 0.88, 1, 1)
    this.setTextStyleTree(this.launcher, coolWhite)
    this.setTextStyleTree(this.findObject("ExternalSampleDataLabel"), cyan)
    this.setTextStyleTree(this.panel, coolWhite)
    this.findText("SampleDataLabel").textFill.color = cyan
    this.findText("TaskName").textFill.color = coolWhite
    this.findText("TaskStatus").textFill.color = cyan
    this.findText("ApprovalExplanation").textFill.color = coolWhite
    this.findText("ApprovalFeedback").textFill.color = cyan
    this.summaryTextComponent.textFill.color = coolWhite
    this.summaryTextComponent.depthTest = true
    this.summaryProgressText.textFill.color = cyan
    if (this.bridgeUrl.trim().length > 0 && this.bridgeToken.trim().length > 0) {
      this.liveMode = true
      this.setConnectionLabel(LIVE_CONNECTING_LABEL)
      this.connectLiveBridge()
    }
    this.refreshState()
  }

  private setTextStyleTree(root: SceneObject, color: vec4): void {
    const text = root.getComponent("Component.Text") as Text
    if (text) {
      text.depthTest = false
      text.textFill.color = color
    }
    for (let i = 0; i < root.getChildrenCount(); i++) {
      this.setTextStyleTree(root.getChild(i), color)
    }
  }

  private connectLiveBridge(): void {
    if (!this.liveMode || this.liveSocket?.readyState === 1 || this.liveSocket?.readyState === 0) return
    const internet = require("LensStudio:InternetModule") as InternetModule
    const separator = this.bridgeUrl.indexOf("?") >= 0 ? "&" : "?"
    const url = this.bridgeUrl.trim() + separator + "token=" + encodeURIComponent(this.bridgeToken.trim())
    try {
      const socket = internet.createWebSocket(url)
      this.liveSocket = socket
      socket.onopen = () => {
        this.liveConnected = true
        this.codexReady = false
        this.setConnectionLabel(LIVE_CONNECTING_LABEL)
        this.sendLiveRpc("initialize", {
          clientInfo: {name: "runcodex_specs", title: "RunCodex for SPECS", version: "0.1.0"}
        })
      }
      socket.onmessage = (event: WebSocketMessageEvent) => {
        if (typeof event.data === "string") this.handleLiveMessage(event.data)
      }
      socket.onerror = () => {
        this.handleBridgeDisconnected()
      }
      socket.onclose = () => {
        this.liveThreadId = ""
        this.liveApprovalId = null
        this.handleBridgeDisconnected()
        if (!this.liveDisconnectRequested) this.reconnectEvent.reset(4)
      }
    } catch (error) {
      this.handleBridgeDisconnected()
      print("[RunCodex] Bridge connection failed: " + error)
      this.reconnectEvent.reset(4)
    }
  }

  private handleBridgeDisconnected(): void {
    this.liveConnected = false
    this.codexReady = false
    this.currentTurnId = ""
    this.setConnectionLabel(LIVE_OFFLINE_LABEL)
    if (this.pendingSendRpcId !== null) {
      this.pendingSendRpcId = null
      this.messageDraft = this.pendingSendText
      this.pendingSendText = ""
      this.findText("ApprovalFeedback").text = "Bridge disconnected. Your draft is ready to retry."
    }
    if (this.liveMode && this.contentFlex) {
      this.refreshState()
      this.updateLiveContentView()
    }
  }

  private sendLiveRpc(method: string, params: any = {}): number {
    if (!this.liveSocket || this.liveSocket.readyState !== 1) return -1
    const id = ++this.liveRpcId
    this.liveRpcMethods[String(id)] = method
    this.liveSocket.send(JSON.stringify({id, method, params}))
    return id
  }

  private handleLiveMessage(raw: string): void {
    let message: any
    try { message = JSON.parse(raw) }
    catch (error) { print("[RunCodex] Ignored invalid bridge message: " + error); return }

    if (message.method === "item/commandExecution/requestApproval" || message.method === "item/fileChange/requestApproval") {
      if (message.params?.threadId && message.params.threadId !== this.liveThreadId) return
      this.liveApprovalId = message.id
      this.liveApprovalMethod = message.method
      const reason = this.formatApprovalValue(message.params?.reason)
      const detail = reason ||
        (message.method === "item/fileChange/requestApproval" ? "Codex requests approval to change files." : "Codex requests approval to run a command.")
      const maxApprovalTextLength = 240
      const visibleDetail = detail.length > maxApprovalTextLength ? detail.slice(0, maxApprovalTextLength - 1).trimEnd() + "…" : detail
      const approvalExplanation = this.findText("ApprovalExplanation")
      approvalExplanation.text = "LIVE CODEX APPROVAL\n" + visibleDetail
      approvalExplanation.size = 48
      approvalExplanation.layoutRect = Rect.create(-11.9, 11.9, -0.75, 0.75)
      this.findText("ApprovalFeedback").text = "Review the request, then choose Approve or Reject."
      this.state = "Needs approval"
      this.refreshState()
      return
    }

    if (message.id !== undefined && this.liveRpcMethods[String(message.id)]) {
      const rpcId = String(message.id)
      const method = this.liveRpcMethods[rpcId]
      delete this.liveRpcMethods[rpcId]
      if (message.error) {
        if (method === "initialize" && String(message.error.message || "").toLowerCase().includes("already initialized")) {
          this.codexReady = true
          this.sendLiveRpc("thread/list", {limit: 50})
          return
        }
        print("[RunCodex] Codex bridge RPC failed (" + method + "): " + message.error.message)
        if (method === "initialize") {
          this.codexReady = false
          this.setConnectionLabel(LIVE_OFFLINE_LABEL)
          this.refreshState()
        }
        if (method === "thread/list") this.setConnectionLabel("NO TASK IN THIS PROJECT")
        if ((method === "turn/start" || method === "turn/steer") && this.pendingSendRpcId === Number(message.id)) {
          this.pendingSendRpcId = null
          this.messageDraft = this.pendingSendText
          this.pendingSendText = ""
          this.findText("ApprovalFeedback").text = "Could not send: " + String(message.error.message || "Codex rejected the message").slice(0, 110)
          this.refreshState()
          this.updateLiveContentView()
        }
        return
      }
      if (method === "initialize") {
        this.codexReady = true
        this.liveSocket?.send(JSON.stringify({method: "initialized", params: {}}))
        this.sendLiveRpc("thread/list", {limit: 50})
      } else if (method === "thread/list") {
        const threads = message.result?.data || []
        if (threads.length === 0) {
          this.liveThreadId = ""
          this.setConnectionLabel("NO TASK IN THIS PROJECT")
          this.refreshState()
          return
        }
        // Prefer an approval that is already waiting in this project. The
        // first item can be an unrelated, recently active task and hide it.
        const thread = threads.find((candidate: any) =>
          Array.isArray(candidate.status?.activeFlags) && candidate.status.activeFlags.includes("waitingOnApproval")
        ) || threads[0]
        this.liveThreadId = thread.id
        this.setConnectionLabel(LIVE_CONNECTED_LABEL)
        this.findText("TaskName").text = thread.name || "Codex task"
        this.syncThreadStatus(thread.status)
        this.sendLiveRpc("thread/resume", {threadId: thread.id, excludeTurns: true})
        this.sendLiveRpc("thread/turns/list", {threadId: thread.id, limit: 5, sortDirection: "desc", itemsView: "full"})
      } else if (method === "thread/turns/list") {
        this.readLiveTurnSummary(message.result?.data || [])
      } else if ((method === "turn/start" || method === "turn/steer") && this.pendingSendRpcId === Number(message.id)) {
        const sentText = this.pendingSendText
        const returnedTurnId = message.result?.turn?.id || message.result?.turnId
        if (returnedTurnId) this.currentTurnId = returnedTurnId
        this.pendingSendRpcId = null
        this.sendTimeoutEvent.reset(0)
        this.pendingSendText = ""
        this.messageDraft = ""
        this.composerOpen = false
        this.lastUserMessage = sentText
        this.lastUserMessageText.text = sentText
        this.liveSummary = ""
        this.summaryLines = []
        this.summaryLineOffset = 0
        this.showingFullSummary = true
        this.state = "Working"
        this.findText("ApprovalFeedback").text = "Message sent to Codex."
        this.refreshState()
        this.updateLiveContentView()
        if (this.voiceCaptureActive) this.stopVoiceCapture("Message sent to Codex.")
      }
      return
    }

    if (!message.method) return
    const params = message.params || {}
    if (params.threadId && params.threadId !== this.liveThreadId) return
    if (message.method === "turn/started") {
      this.currentTurnId = params.turn?.id || this.currentTurnId
      this.liveSummary = ""
      this.summaryLines = []
      this.summaryLineOffset = 0
      this.showingFullSummary = true
      this.state = "Working"
      this.refreshState()
      this.updateLiveContentView()
    } else if (message.method === "turn/completed") {
      const turnStatus = params.turn?.status
      this.currentTurnId = ""
      this.showingFullSummary = true
      if (turnStatus === "completed") this.state = "Done"
      else this.state = "Working"
      this.refreshState()
    } else if (message.method === "item/agentMessage/delta") {
      this.liveSummary += params.delta || ""
      this.summaryLines = this.wrapSummaryLines(this.liveSummary)
      this.showingFullSummary = true
      this.summaryLineOffset = Math.max(0, this.summaryLines.length - this.summaryVisibleLineCount)
      this.updateSummaryView()
      this.refreshState()
    } else if (message.method === "item/completed" && params.item?.type === "agentMessage") {
      const finalText = this.messageText(params.item)
      if (finalText) {
        this.setLiveSummary(finalText)
        if (this.state === "Done") this.showingFullSummary = true
        this.refreshState()
      }
    } else if (message.method === "serverRequest/resolved") {
      const resolvedRequestId = params.requestId
      if (resolvedRequestId !== undefined && this.liveApprovalId !== null && String(resolvedRequestId) === String(this.liveApprovalId)) {
        this.liveApprovalId = null
        this.liveApprovalMethod = ""
        if (this.state === "Needs approval") {
          this.state = "Working"
          this.findText("ApprovalFeedback").text = "This approval request is no longer pending."
          this.refreshState()
        }
      }
    }
  }

  private syncThreadStatus(status: any): void {
    const type = status?.type || "idle"
    this.state = type === "active" ? "Working" : "Done"
    this.refreshState()
  }

  private readLiveTurnSummary(turns: any[]): void {
    if (!turns.length) return
    const newestTurn = turns[0].turn || turns[0]
    if (newestTurn.status === "inProgress" || newestTurn.status === "in_progress") this.currentTurnId = newestTurn.id || ""
    let newestUserText = ""
    let newestAgentText = ""
    for (const entry of turns) {
      const turn = entry.turn || entry
      const items = turn.items || entry.items || []
      for (let i = items.length - 1; i >= 0; i--) {
        if (!newestUserText && items[i]?.type === "userMessage") newestUserText = this.messageText(items[i])
        if (!newestAgentText && items[i]?.type === "agentMessage") newestAgentText = this.messageText(items[i])
      }
      if (newestUserText && newestAgentText) break
    }
    if (newestUserText) this.lastUserMessage = newestUserText
    if (newestAgentText) this.setLiveSummary(newestAgentText)
    if (newestTurn.status === "completed") this.state = "Done"
    else if (this.currentTurnId) this.state = "Working"
    this.refreshState()
  }

  private messageText(item: any): string {
    if (typeof item?.text === "string") return item.text
    if (Array.isArray(item?.content)) {
      return item.content.map((part: any) => typeof part?.text === "string" ? part.text : "").filter((part: string) => part.length > 0).join("\n")
    }
    return ""
  }

  private formatApprovalValue(value: any): string {
    if (typeof value === "string") return value.trim()
    if (Array.isArray(value)) return value.map((part) => this.formatApprovalValue(part)).filter((part) => part.length > 0).join(" ")
    if (value && typeof value === "object") return JSON.stringify(value)
    return ""
  }

  private setLiveSummary(summary: string): void {
    this.liveSummary = summary.slice(-12000)
    this.summaryLines = this.wrapSummaryLines(this.liveSummary)
    this.summaryLineOffset = 0
    this.updateSummaryView()
  }

  private setConnectionLabel(label: string): void {
    const panelLabel = this.findText("SampleDataLabel")
    panelLabel.text = label
    this.launcherSampleLabel.text = label
  }

  private answerLiveApproval(decision: "accept" | "decline"): void {
    if (!this.liveSocket || this.liveSocket.readyState !== 1 || this.liveApprovalId === null) return
    this.liveSocket.send(JSON.stringify({id: this.liveApprovalId, result: {decision}}))
    this.liveApprovalId = null
    this.liveApprovalMethod = ""
    this.findText("ApprovalFeedback").text = decision === "accept" ? "Approval sent to Codex." : "Request declined in Codex."
    this.state = decision === "accept" ? "Working" : "Rejected"
    this.refreshState()
  }

  private createRunButton(): void {
    const root = global.scene.createSceneObject("RunCodexButton")
    this.launcher = root
    root.getTransform().setWorldPosition(new vec3(-27, 2, -97))
    root.createComponent("Component.Canvas")
    root.createComponent(Billboard.getTypeName())
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setTheme("SnapOS3", "Prism")
    button.size = new vec3(29, 8, 0.6)
    const label = root.createComponent(ElementContent.getTypeName()) as ElementContent
    label.text = "Open RunCodex"
    label.textSize = 56
    label.sizeOverride = new vec2(27, 7)
    label.contentAlignment = "center"
    button.onTriggerUp.add(() => {
      this.panel.enabled = true
      this.launcher.enabled = false
    if (this.liveMode && (!this.liveConnected || !this.codexReady)) {
        this.liveDisconnectRequested = false
        if (this.liveConnected) this.sendLiveRpc("initialize", {
          clientInfo: {name: "runcodex_specs", title: "RunCodex for SPECS", version: "0.1.0"}
        })
        else this.connectLiveBridge()
      }
    })

    const sampleTag = global.scene.createSceneObject("ExternalSampleDataLabel")
    sampleTag.setParent(root)
    sampleTag.getTransform().setLocalPosition(new vec3(0, -8.2, 0.3))
    this.launcherSampleLabel = sampleTag.createComponent(ElementContent.getTypeName()) as ElementContent
    this.launcherSampleLabel.text = SAMPLE_LABEL
    this.launcherSampleLabel.textSize = 62
    this.launcherSampleLabel.sizeOverride = new vec2(40, 6)
    this.launcherSampleLabel.contentAlignment = "center"

    const cue = global.scene.createSceneObject("NeedsApprovalCue")
    cue.setParent(root)
    cue.getTransform().setLocalPosition(new vec3(0, 5.5, 0.2))
    const text = cue.createComponent("Component.Text") as Text
    text.text = "●  Needs approval"
    text.size = 40
    text.depthTest = false
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.layoutRect = Rect.create(-15, 15, -2.5, 2.5)
    this.cue = cue
  }

  private createPanel(): void {
    this.panel = global.scene.createSceneObject("RunCodexStatusPanel")
    this.panel.getTransform().setWorldPosition(new vec3(-27, 2, -97))
    this.panel.createComponent("Component.Canvas")
    this.panel.createComponent(Billboard.getTypeName())
    this.opaqueBackdrop = this.findObject("RunCodexOpaqueBackdrop")
    this.opaqueBackdrop.setParent(this.panel)
    this.opaqueBackdrop.getTransform().setLocalPosition(new vec3(0, 0, 0.05))
    this.opaqueBackdrop.getTransform().setLocalScale(new vec3(32, 54, 1))
    this.opaqueBackdrop.enabled = false
    const opaqueVisual = this.opaqueBackdrop.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    // This backdrop material can have no main pass in the recovered scene.
    // The backdrop is disabled for the normal panel, so skip the optional depth override.
    if (opaqueVisual && opaqueVisual.mainPass) {
      opaqueVisual.mainPass.depthTest = false
    }
    const backdrop = global.scene.createSceneObject("RunCodexBackdrop")
    backdrop.setParent(this.panel)
    backdrop.getTransform().setLocalPosition(new vec3(0, 0, 0))
    this.surface = backdrop.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    this.surface.initialize()
    this.surface.size = new vec2(32, 54)
    this.surface.setBackgroundGradient({
      enabled: true,
      type: "Linear",
      start: new vec2(-1, 1),
      end: new vec2(1, -1),
      stop0: {enabled: true, color: new vec4(0.006, 0.018, 0.044, 1), percent: 0},
      stop1: {enabled: true, color: new vec4(0.016, 0.064, 0.12, 1), percent: 1}
    })
    this.surface.border = true
    this.surface.borderType = "Color"
    this.surface.borderColor = new vec4(0.12, 0.66, 0.92, 1)
    this.surface.borderSize = 0.09
    this.surface.opacity = 1
    this.surface.renderMeshVisual.enabled = true

    const content = global.scene.createSceneObject("RunCodexContent")
    content.setParent(this.panel)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = 29
    flex.height = 52
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.rowGap = 0.12
    flex.paddingTop = 0.7
    flex.paddingBottom = 0.7
    flex.paddingLeft = 1.5
    flex.paddingRight = 1.5
    this.contentFlex = flex

    this.summaryViewportBackdrop = global.scene.createSceneObject("SummaryViewportBackdrop")
    this.summaryViewportBackdrop.setParent(content)
    this.summaryViewportBackdrop.getTransform().setLocalPosition(new vec3(0, 0, 0.45))
    this.summaryViewportSurface = this.summaryViewportBackdrop.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    this.summaryViewportSurface.initialize()
    this.summaryViewportSurface.size = new vec2(27, this.summaryViewportHeight)
    this.summaryViewportSurface.setBackgroundGradient({
      enabled: true,
      type: "Linear",
      start: new vec2(-1, 1),
      end: new vec2(1, -1),
      stop0: {enabled: true, color: new vec4(0.004, 0.012, 0.026, 1), percent: 0},
      stop1: {enabled: true, color: new vec4(0.01, 0.028, 0.05, 1), percent: 1}
    })
    this.summaryViewportSurface.border = true
    this.summaryViewportSurface.borderType = "Color"
    this.summaryViewportSurface.borderColor = new vec4(0.08, 0.32, 0.48, 1)
    this.summaryViewportSurface.borderSize = 0.045
    this.summaryViewportSurface.opacity = 1

    const panelHeader = this.createButtonRow(flex, "PanelHeaderRow", 27, 5)
    this.addText(panelHeader, "SampleDataLabel", SAMPLE_LABEL, 22, 4.5, 39)
    this.refreshStatusButton = this.addButton(panelHeader, "RefreshCodexStatusButton", "↻", 4.4, () => this.advance(), 4.4, 68)
    this.addText(flex, "TaskName", TASK_NAME, 27, 2.1, 62)
    this.statusText = this.addText(flex, "TaskStatus", "Working", 27, 2, 61)
    this.statusTextObject = this.statusText.getSceneObject()
    const userMessageRow = global.scene.createSceneObject("UserMessageRow")
    userMessageRow.setParent(flex.getSceneObject())
    userMessageRow.enabled = false
    const userMessageRowLayout = userMessageRow.createComponent(FlexLayout.getTypeName()) as FlexLayout
    userMessageRowLayout.autoDiscoverItemsOnStart = false
    userMessageRowLayout.width = 27
    userMessageRowLayout.height = USER_MESSAGE_MIN_HEIGHT + 0.3
    userMessageRowLayout.direction = FlexDirection.Row
    userMessageRowLayout.justifyContent = FlexJustify.End
    userMessageRowLayout.alignItems = FlexAlign.Center
    const userMessageRowItem = userMessageRow.createComponent(FlexItem.getTypeName()) as FlexItem
    userMessageRowItem.overrideWidth = 27
    userMessageRowItem.overrideHeight = USER_MESSAGE_MIN_HEIGHT + 0.3
    this.flexRows.push({item: userMessageRowItem, sceneObject: userMessageRow})
    flex.addItems([userMessageRowItem])
    this.lastUserMessageRow = userMessageRow

    const userBubble = global.scene.createSceneObject("UserMessageBubble")
    userBubble.setParent(userMessageRow)
    userBubble.getTransform().setLocalPosition(new vec3(0, 0, 0.42))
    this.userMessageViewport = userBubble
    const userBubbleSurface = userBubble.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    userBubbleSurface.initialize()
    userBubbleSurface.size = new vec2(22, USER_MESSAGE_MIN_HEIGHT)
    userBubbleSurface.setBackgroundGradient({
      enabled: true,
      type: "Linear",
      start: new vec2(-1, 1),
      end: new vec2(1, -1),
      stop0: {enabled: true, color: new vec4(0.015, 0.22, 0.34, 1), percent: 0},
      stop1: {enabled: true, color: new vec4(0.02, 0.12, 0.22, 1), percent: 1}
    })
    userBubbleSurface.border = true
    userBubbleSurface.borderType = "Color"
    userBubbleSurface.borderColor = new vec4(0.12, 0.66, 0.92, 1)
    userBubbleSurface.borderSize = 0.035
    userBubbleSurface.opacity = 1
    const userBubbleTextObject = global.scene.createSceneObject("UserMessageText")
    userBubbleTextObject.setParent(userBubble)
    userBubbleTextObject.getTransform().setLocalPosition(new vec3(0, 0, 0.16))
    this.lastUserMessageText = userBubbleTextObject.createComponent("Component.Text") as Text
    this.lastUserMessageText.text = ""
    this.lastUserMessageText.size = 42
    this.lastUserMessageText.lineSpacing = 1.08
    this.lastUserMessageText.weight = 500
    this.lastUserMessageText.depthTest = true
    this.lastUserMessageText.textFill.color = new vec4(0.94, 0.98, 1, 1)
    this.lastUserMessageText.horizontalAlignment = HorizontalAlignment.Left
    this.lastUserMessageText.verticalAlignment = VerticalAlignment.Top
    this.lastUserMessageText.horizontalOverflow = HorizontalOverflow.Wrap
    this.lastUserMessageText.verticalOverflow = VerticalOverflow.Truncate
    this.lastUserMessageText.layoutRect = Rect.create(-9.85, 9.85, -0.65, 0.65)
    const userBubbleProgressObject = global.scene.createSceneObject("UserMessageProgress")
    userBubbleProgressObject.setParent(userBubble)
    userBubbleProgressObject.getTransform().setLocalPosition(new vec3(6.5, USER_MESSAGE_MIN_HEIGHT * 0.5 - 0.35, 0.18))
    this.userMessageProgressText = userBubbleProgressObject.createComponent("Component.Text") as Text
    this.userMessageProgressText.text = ""
    this.userMessageProgressText.size = 19
    this.userMessageProgressText.depthTest = true
    this.userMessageProgressText.textFill.color = new vec4(0.42, 0.86, 1, 1)
    this.userMessageProgressText.horizontalAlignment = HorizontalAlignment.Right
    this.userMessageProgressText.verticalAlignment = VerticalAlignment.Center
    this.userMessageProgressText.layoutRect = Rect.create(-3.3, 3.3, -0.35, 0.35)
    const userBubbleItem = userBubble.createComponent(FlexItem.getTypeName()) as FlexItem
    userBubbleItem.overrideWidth = 22
    userBubbleItem.overrideHeight = USER_MESSAGE_MIN_HEIGHT
    userMessageRowLayout.addItems([userBubbleItem])

    this.userMessageSurface = userBubbleSurface
    this.userMessageItem = userBubbleItem
    this.userMessageRowLayout = userMessageRowLayout

    const approvalTopSpacerObject = global.scene.createSceneObject("ApprovalConversationGap")
    approvalTopSpacerObject.setParent(flex.getSceneObject())
    approvalTopSpacerObject.enabled = false
    const approvalTopSpacerItem = approvalTopSpacerObject.createComponent(FlexItem.getTypeName()) as FlexItem
    approvalTopSpacerItem.overrideWidth = 27
    approvalTopSpacerItem.overrideHeight = APPROVAL_ROW_GAP
    this.approvalTopSpacer = {item: approvalTopSpacerItem, sceneObject: approvalTopSpacerObject}
    this.flexRows.push(this.approvalTopSpacer)

    this.approvalTextComponent = this.addText(flex, "ApprovalExplanation", "Codex needs permission to update the project configuration.", 27, 3.5, 48)
    this.approvalText = this.approvalTextComponent.getSceneObject()
    this.approvalTextItem = this.approvalText.getComponent(FlexItem.getTypeName()) as FlexItem
    this.approvalTextComponent.verticalAlignment = VerticalAlignment.Top
    this.approvalTextComponent.layoutRect = Rect.create(-11.9, 11.9, -0.75, 0.75)
    this.approvalBottomSpacer = this.createFlexSpacer(flex, "ApprovalActionsGap", APPROVAL_ROW_GAP)
    const approvalButtons = this.createButtonRow(flex, "ApprovalButtonsRow", 27, 5)
    this.approvalButtonRow = approvalButtons.getSceneObject()
    this.approveButton = this.addButton(approvalButtons, "ApproveButton", "Approve", 12.8, () => this.approve(), 5)
    this.rejectButton = this.addButton(approvalButtons, "RejectButton", "Reject", 12.8, () => this.reject(), 5)
    this.feedbackText = this.addText(flex, "ApprovalFeedback", "", 27, 2.7, 42).getSceneObject()
    const summaryMeta = this.createButtonRow(flex, "ConversationProgressRow", 27, 1.4)
    summaryMeta.justifyContent = FlexJustify.End
    this.summaryMetaRow = summaryMeta.getSceneObject()
    this.summaryTextComponent = this.addText(flex, "CompletionSummary", "", 27, SUMMARY_VIEWPORT_HEIGHT, 44)
    this.summaryText = this.summaryTextComponent.getSceneObject()
    this.summaryTextComponent.weight = 500
    this.summaryTextComponent.lineSpacing = 1.08
    this.summaryTextComponent.layoutRect = Rect.create(
      -13.5 + 1.4,
      13.5 - 1.4,
      -SUMMARY_VIEWPORT_HEIGHT * 0.5 + 1.1,
      SUMMARY_VIEWPORT_HEIGHT * 0.5 - 1.1
    )
    this.summaryViewport = this.summaryText
    this.summaryTextComponent.verticalAlignment = VerticalAlignment.Top
    this.summaryTextComponent.verticalOverflow = VerticalOverflow.Truncate
    this.summaryTextComponent.horizontalOverflow = HorizontalOverflow.Wrap
    this.summaryLines = this.wrapSummaryLines(SUMMARY)

    this.summaryProgressText = this.addText(summaryMeta, "SummaryProgress", "1–7 / 32", 7, 1.4, 24)
    this.summaryProgressText.horizontalAlignment = HorizontalAlignment.Right
    const spacerObject = global.scene.createSceneObject("SummaryToActionsSpacer")
    spacerObject.setParent(flex.getSceneObject())
    spacerObject.enabled = false
    const spacerItem = spacerObject.createComponent(FlexItem.getTypeName()) as FlexItem
    spacerItem.overrideWidth = 29
    spacerItem.overrideHeight = 0
    this.actionGroupSpacer = {item: spacerItem, sceneObject: spacerObject}
    this.flexRows.push(this.actionGroupSpacer)
    const liveCompose = this.createButtonRow(flex, "LiveConversationActionsRow", 27, 5)
    this.liveComposeRow = liveCompose.getSceneObject()
    this.composeButton = this.addButton(liveCompose, "ComposeMessageButton", "Speak", 12.8, () => this.openComposer(), 5, 32)
    this.sendButton = this.addButton(liveCompose, "SendMessageButton", "Send", 12.8, () => this.sendLiveMessage(), 5, 34)
    this.advanceButton = this.addButton(flex, "AdvanceSampleButton", "Advance sample task", 27, () => this.advance(), 5)
    const refreshSpacerObject = global.scene.createSceneObject("RefreshToActionsSpacer")
    refreshSpacerObject.setParent(flex.getSceneObject())
    refreshSpacerObject.enabled = false
    const refreshSpacerItem = refreshSpacerObject.createComponent(FlexItem.getTypeName()) as FlexItem
    refreshSpacerItem.overrideWidth = 29
    refreshSpacerItem.overrideHeight = 0.65
    this.refreshToActionsSpacer = {item: refreshSpacerItem, sceneObject: refreshSpacerObject}
    this.flexRows.push(this.refreshToActionsSpacer)
    const actions = this.createButtonRow(flex, "PanelActionsRow", 27, 5)
    this.actionsRow = actions.getSceneObject()
    this.closeButton = this.addButton(actions, "ClosePanelButton", "Close panel", 12.8, () => this.closePanel(), 5)
    this.restartButton = this.addButton(actions, "RestartSampleButton", "Restart sample", 12.8, () => {
      if (this.liveMode) this.closeRunCodex()
      else this.restart()
    }, 5)
  }

  private createButtonRow(parent: FlexLayout, name: string, width: number, height: number): FlexLayout {
    const rowObject = global.scene.createSceneObject(name)
    rowObject.setParent(parent.getSceneObject())
    const rowLayout = rowObject.createComponent(FlexLayout.getTypeName()) as FlexLayout
    rowLayout.autoDiscoverItemsOnStart = false
    rowLayout.width = width
    rowLayout.height = height
    rowLayout.direction = FlexDirection.Row
    rowLayout.justifyContent = FlexJustify.SpaceBetween
    rowLayout.alignItems = FlexAlign.Center
    const rowItem = rowObject.createComponent(FlexItem.getTypeName()) as FlexItem
    rowItem.overrideWidth = width
    rowItem.overrideHeight = height
    this.flexRows.push({item: rowItem, sceneObject: rowObject})
    parent.addItems([rowItem])
    return rowLayout
  }

  private addText(layout: FlexLayout, name: string, value: string, width: number, height: number, size: number): Text {
    const so = global.scene.createSceneObject(name)
    so.setParent(layout.getSceneObject())
    const text = so.createComponent("Component.Text") as Text
    text.text = value
    text.size = size
    text.depthTest = true
    text.horizontalAlignment = HorizontalAlignment.Left
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.layoutRect = Rect.create(-width / 2 + 2, width / 2 - 2, -height / 2, height / 2)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    if (layout === this.contentFlex) this.flexRows.push({item, sceneObject: so})
    layout.addItems([item])
    return text
  }

  private addButton(layout: FlexLayout, name: string, labelText: string, width: number, action: () => void, height: number, textSize: number = 40): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(layout.getSceneObject())
    const button = so.createComponent(Button.getTypeName()) as Button
    const primary = name === "ApproveButton" || name === "AdvanceSampleButton"
    const quietControl = name === "ClosePanelButton"
    button.setTheme("SnapOS3", primary ? "Prism" : quietControl ? "Ghost" : "Secondary")
    button.size = new vec3(width, height, 1)
    button.onTriggerUp.add(action)
    const label = so.createComponent(ElementContent.getTypeName()) as ElementContent
    label.text = labelText
    label.textSize = textSize
    label.sizeOverride = new vec2(width - 1, height - 1)
    label.contentAlignment = "center"
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    if (layout === this.contentFlex) this.flexRows.push({item, sceneObject: so})
    layout.addItems([item])
    return so
  }

  private approve(): void {
    if (this.liveMode) {
      this.answerLiveApproval("accept")
      return
    }
    this.approved = true
    this.state = "Working"
    const feedback = this.findText("ApprovalFeedback")
    feedback.text = "Approved — Codex is working again"
    this.refreshState()
  }

  private reject(): void {
    if (this.liveMode) {
      this.answerLiveApproval("decline")
      return
    }
    this.state = "Rejected"
    this.findText("ApprovalFeedback").text = "Rejected — waiting for your next instruction."
    this.refreshState()
  }

  private advance(): void {
    if (this.liveMode) {
      if (this.liveConnected && this.codexReady) this.sendLiveRpc("thread/list", {limit: 50})
      else if (this.liveConnected) this.sendLiveRpc("initialize", {
        clientInfo: {name: "runcodex_specs", title: "RunCodex for SPECS", version: "0.1.0"}
      })
      else this.connectLiveBridge()
      return
    }
    if (this.state === "Working") this.state = this.approved ? "Done" : "Needs approval"
    else if (this.state === "Needs approval") return
    else if (this.state === "Done") return
    this.refreshState()
  }

  private restart(): void {
    if (this.liveMode) {
      this.panel.enabled = false
      this.launcher.enabled = true
      return
    }
    this.state = "Working"
    this.approved = false
    this.findText("ApprovalFeedback").text = ""
    this.summaryText.enabled = false
    this.showingFullSummary = true
    this.refreshState()
  }

  private closePanel(): void {
    if (this.composerOpen) this.cancelComposer()
    this.panel.enabled = false
    this.opaqueBackdrop.enabled = false
    this.launcher.enabled = true
  }

  private closeRunCodex(): void {
    if (this.composerOpen) this.cancelComposer()
    this.liveDisconnectRequested = true
    if (this.liveSocket) {
      this.liveSocket.close()
      this.liveSocket = null
    }
    this.liveConnected = false
    this.codexReady = false
    this.liveThreadId = ""
    this.liveApprovalId = null
    this.liveApprovalMethod = ""
    this.setConnectionLabel(LIVE_OFFLINE_LABEL)
    this.closePanel()
  }

  private refreshState(): void {
    const liveSessionUsable = this.liveMode && this.liveConnected && this.codexReady && this.liveThreadId.length > 0
    this.statusText.text = this.state
    if (this.state !== "Working") this.resetWorkingBreath()
    const approvalVisible = this.state === "Needs approval" && (!this.liveMode || (liveSessionUsable && this.liveApprovalId !== null))
    this.cue.enabled = approvalVisible
    this.approvalText.enabled = approvalVisible
    this.approvalButtonRow.enabled = approvalVisible
    this.approveButton.enabled = approvalVisible
    this.rejectButton.enabled = approvalVisible
    const feedback = this.feedbackText.getComponent("Component.Text") as Text
    if (this.state !== "Needs approval" && feedback.text === "Review the request, then choose Approve or Reject.") {
      feedback.text = ""
    }
    this.feedbackText.enabled = feedback.text.length > 0 && (!this.liveMode || liveSessionUsable)
    const showConversation = liveSessionUsable && (this.composerOpen || this.liveSummary.length > 0 || this.state === "Done")
    const showSummary = this.liveMode ? showConversation : this.state === "Done"
    this.summaryMetaRow.enabled = showSummary
    this.summaryViewport.enabled = showSummary
    this.summaryText.enabled = showSummary
    this.summaryViewportBackdrop.enabled = showSummary
    const visibleUserMessage = this.composerOpen ? this.messageDraft : this.lastUserMessage
    this.lastUserMessageRow.enabled = liveSessionUsable && visibleUserMessage.length > 0
    this.updateUserMessageView(visibleUserMessage)
    this.updateSummaryView()
    this.advanceButton.enabled = !this.liveMode && this.state === "Working"
    this.refreshStatusButton.enabled = this.liveMode
    this.liveComposeRow.enabled = liveSessionUsable
    this.findObject("TaskName").enabled = !this.liveMode || liveSessionUsable
    this.findObject("TaskStatus").enabled = !this.liveMode || liveSessionUsable
    const composeButton = this.composeButton.getComponent(Button.getTypeName()) as Button
    composeButton.inactive = !liveSessionUsable || this.pendingSendRpcId !== null
    const sendButton = this.sendButton.getComponent(Button.getTypeName()) as Button
    sendButton.inactive = !liveSessionUsable || this.pendingSendRpcId !== null || this.messageDraft.trim().length === 0
    this.closeButton.enabled = true
    this.restartButton.enabled = true
    this.actionsRow.enabled = true
    this.layoutRows()
    this.resizeSurface()
    const composeLabel = this.composeButton.getComponent(ElementContent.getTypeName()) as ElementContent
    composeLabel.text = this.voiceCaptureActive ? "Stop" : "Speak"
    const sendLabel = this.sendButton.getComponent(ElementContent.getTypeName()) as ElementContent
    sendLabel.text = this.pendingSendRpcId !== null ? "Sending…" : "Send"
    const restartLabel = this.restartButton.getComponent(ElementContent.getTypeName()) as ElementContent
    restartLabel.text = this.liveMode ? "Close RunCodex" : "Restart sample"
  }

  private updateWorkingBreath(): void {
    if (this.state !== "Working") return
    // A calm 4.8-second breathing loop: gently expand, then settle back.
    this.statusBreathElapsed += getDeltaTime()
    const breath = (Math.sin((this.statusBreathElapsed / 4.8) * Math.PI * 2 - Math.PI / 2) + 1) * 0.5
    const scale = 0.98 + breath * 0.04
    const alpha = 0.82 + breath * 0.18
    // The Flex text object is left-aligned inside a wide row. Its visual
    // center sits about 7.5 cm left of the transform origin, so counter-shift
    // the object as it scales to keep the word centered in place.
    const nextOffsetX = -7.5 * (1 - scale)
    const currentPosition = this.statusTextObject.getTransform().getLocalPosition()
    this.statusTextObject.getTransform().setLocalPosition(
      new vec3(currentPosition.x + nextOffsetX - this.statusBreathOffsetX, currentPosition.y, currentPosition.z)
    )
    this.statusBreathOffsetX = nextOffsetX
    this.statusTextObject.getTransform().setLocalScale(new vec3(scale, scale, 1))
    this.statusText.textFill.color = new vec4(0.3, 0.88, 1, alpha)
  }

  private resetWorkingBreath(): void {
    this.statusBreathElapsed = 0
    if (!this.statusTextObject) return
    const currentPosition = this.statusTextObject.getTransform().getLocalPosition()
    this.statusTextObject.getTransform().setLocalPosition(
      new vec3(currentPosition.x - this.statusBreathOffsetX, currentPosition.y, currentPosition.z)
    )
    this.statusBreathOffsetX = 0
    this.statusTextObject.getTransform().setLocalScale(new vec3(1, 1, 1))
    this.statusText.textFill.color = new vec4(0.3, 0.88, 1, 1)
  }

  private resizeSurface(): void {
    const width = 32
    const height = 54
    this.surface.size = new vec2(width, height)
    this.opaqueBackdrop.getTransform().setLocalPosition(new vec3(0, 0, 0.05))
    this.opaqueBackdrop.getTransform().setLocalScale(new vec3(width, height, 1))
  }

  private positionSummaryViewportBackdrop(): void {
    const viewportPosition = this.summaryViewport.getTransform().getLocalPosition()
    this.summaryViewportBackdrop.getTransform().setLocalPosition(
      new vec3(viewportPosition.x, viewportPosition.y, viewportPosition.z - 0.12)
    )
  }

  private updateSummaryProgress(): void {
    const firstLine = Math.min(this.summaryLines.length, this.summaryLineOffset + 1)
    const lastLine = Math.min(this.summaryLines.length, this.summaryLineOffset + this.summaryVisibleLineCount)
    this.summaryProgressText.text = firstLine + "–" + lastLine + " / " + this.summaryLines.length
  }

  private updateSummaryView(): void {
    const summary = this.liveMode ? this.liveSummary : SUMMARY
    this.summaryLines = this.wrapSummaryLines(summary)
    if (this.showingFullSummary) {
      const visible = this.summaryLines.slice(this.summaryLineOffset, this.summaryLineOffset + this.summaryVisibleLineCount)
      this.summaryTextComponent.text = visible.join("\n")
    } else {
      const conciseLines = this.wrapSummaryLines(summary.slice(0, 110))
      this.summaryTextComponent.text = conciseLines.slice(0, 2).join("\n") + "…"
    }
    this.summaryTextComponent.verticalAlignment = VerticalAlignment.Top
    this.summaryTextComponent.verticalOverflow = VerticalOverflow.Truncate
    this.summaryTextComponent.horizontalOverflow = HorizontalOverflow.Wrap
    this.updateSummaryProgress()
  }

  private updateUserMessageView(message: string): void {
    if (message !== this.displayedUserMessage) {
      this.displayedUserMessage = message
      this.userMessageLines = this.wrapSummaryLines(message, USER_MESSAGE_LINE_WIDTH)
      this.userMessageLineOffset = this.composerOpen
        ? Math.max(0, this.userMessageLines.length - this.userMessageVisibleLineCount)
        : 0
    }
    const lineHeight = this.textLineHeight(this.lastUserMessageText)
    const visibleWithoutProgress = Math.max(1, Math.floor((USER_MESSAGE_MAX_HEIGHT - USER_MESSAGE_VERTICAL_PADDING * 2) / lineHeight))
    this.userMessageProgressGap = this.userMessageLines.length > visibleWithoutProgress ? 0.55 : 0
    const maxVisibleLines = Math.max(1, Math.floor((USER_MESSAGE_MAX_HEIGHT - USER_MESSAGE_VERTICAL_PADDING * 2 - this.userMessageProgressGap) / lineHeight))
    this.userMessageVisibleLineCount = Math.min(maxVisibleLines, Math.max(1, this.userMessageLines.length))
    this.userMessageBubbleHeight = Math.max(USER_MESSAGE_MIN_HEIGHT, Math.min(
      USER_MESSAGE_MAX_HEIGHT,
      this.userMessageVisibleLineCount * lineHeight + USER_MESSAGE_VERTICAL_PADDING * 2 + this.userMessageProgressGap
    ))
    this.userMessageSurface.size = new vec2(22, this.userMessageBubbleHeight)
    this.userMessageItem.overrideHeight = this.userMessageBubbleHeight
    this.userMessageRowLayout.height = this.userMessageBubbleHeight + 0.3
    const rowItem = this.lastUserMessageRow.getComponent(FlexItem.getTypeName()) as FlexItem
    rowItem.overrideHeight = this.userMessageBubbleHeight + 0.3
    this.lastUserMessageText.layoutRect = Rect.create(
      -11 + USER_MESSAGE_HORIZONTAL_PADDING,
      11 - USER_MESSAGE_HORIZONTAL_PADDING,
      -this.userMessageBubbleHeight * 0.5 + USER_MESSAGE_VERTICAL_PADDING,
      this.userMessageBubbleHeight * 0.5 - USER_MESSAGE_VERTICAL_PADDING - this.userMessageProgressGap
    )
    this.userMessageProgressText.getSceneObject().getTransform().setLocalPosition(
      new vec3(6.5, this.userMessageBubbleHeight * 0.5 - 0.35, 0.18)
    )
    const maxOffset = Math.max(0, this.userMessageLines.length - this.userMessageVisibleLineCount)
    this.userMessageLineOffset = Math.max(0, Math.min(maxOffset, this.userMessageLineOffset))
    const firstLine = Math.min(this.userMessageLines.length, this.userMessageLineOffset + 1)
    const visibleLines = this.userMessageLines.slice(
      this.userMessageLineOffset,
      this.userMessageLineOffset + this.userMessageVisibleLineCount
    )
    this.lastUserMessageText.text = visibleLines.join("\n")
    this.userMessageProgressText.text = this.userMessageLines.length > this.userMessageVisibleLineCount
      ? firstLine + "–" + Math.min(this.userMessageLines.length, this.userMessageLineOffset + this.userMessageVisibleLineCount) + " / " + this.userMessageLines.length
      : ""
    this.updateApprovalLayout()
  }

  private openComposer(): void {
    if (!this.liveMode || this.pendingSendRpcId !== null) return
    if (this.voiceCaptureActive) {
      this.stopVoiceCapture("Recording stopped. Review the transcript, then tap Send.")
      return
    }
    if (!this.composerOpen) {
      this.composerOpen = true
      this.wasShowingFullSummaryBeforeCompose = this.showingFullSummary
      this.messageDraft = ""
      this.finalizedVoiceText = ""
    }
    this.finalizedVoiceText = this.messageDraft.trim()
    this.showingFullSummary = true
    this.summaryLineOffset = 0
    this.findText("ApprovalFeedback").text = this.liveConnected && this.codexReady && this.liveThreadId
      ? "Tap Speak, say your message, review it, then Send."
      : "Speak your message. The transcript will stay here until Codex reconnects."
    this.refreshState()
    this.updateLiveContentView()
    try {
      this.asrModule = require("LensStudio:AsrModule") as AsrModule
      const options = AsrModule.AsrTranscriptionOptions.create()
      options.mode = AsrModule.AsrMode.HighAccuracy
      options.silenceUntilTerminationMs = 1000
      options.onTranscriptionUpdateEvent.add((event: AsrModule.TranscriptionUpdateEvent) => {
        if (!this.voiceCaptureActive) return
        const segment = event.text.trim()
        this.messageDraft = [this.finalizedVoiceText, segment].filter(Boolean).join(" ")
        this.findText("ApprovalFeedback").text = event.isFinal
          ? (this.liveConnected && this.codexReady && this.liveThreadId
            ? "Phrase captured. Keep speaking or tap Stop to review."
            : "Phrase captured. Keep speaking or tap Stop; Codex is offline.")
          : "Listening… tap Stop when you are done speaking."
        if (event.isFinal) this.finalizedVoiceText = this.messageDraft
        this.updateLiveContentView()
        this.refreshState()
      })
      options.onTranscriptionErrorEvent.add((code: AsrModule.AsrStatusCode) => {
        this.voiceCaptureActive = false
        this.messageDraft = this.messageDraft.trim()
        const message = code === AsrModule.AsrStatusCode.NoInternet
          ? "Voice transcription needs an internet connection. Your draft is kept."
          : code === AsrModule.AsrStatusCode.Unauthenticated
            ? "Speech recognition is unavailable for this account. Your draft is kept."
            : "Speech recognition failed. Your draft is kept; tap Speak to retry."
        this.findText("ApprovalFeedback").text = message
        this.refreshState()
        this.updateLiveContentView()
        try { this.asrModule?.stopTranscribing() } catch {}
      })
      this.voiceCaptureActive = true
      this.asrModule.startTranscribing(options)
      this.findText("ApprovalFeedback").text = "Listening… tap Stop when you are done speaking."
      this.refreshState()
    } catch (error) {
      this.voiceCaptureActive = false
      this.composerOpen = false
      this.findText("ApprovalFeedback").text = "Speech input is available on SPECS only. " + String(error).slice(0, 80)
      this.refreshState()
      this.updateLiveContentView()
    }
  }

  private stopVoiceCapture(feedback: string): void {
    if (this.voiceCaptureActive) {
      this.voiceCaptureActive = false
      try {
        this.asrModule?.stopTranscribing().catch((error: any) => {
          print("[RunCodex] ASR stop failed: " + error)
        })
      } catch (error) {
        print("[RunCodex] ASR stop failed: " + error)
      }
    }
    this.findText("ApprovalFeedback").text = this.messageDraft.trim().length > 0
      ? (this.liveConnected && this.codexReady && this.liveThreadId
        ? feedback
        : feedback.replace("then tap Send", "Send is available when Codex reconnects"))
      : "No speech captured. Tap Speak to try again."
    this.refreshState()
    this.updateLiveContentView()
  }

  private cancelComposer(): void {
    if (!this.composerOpen) return
    this.composerOpen = false
    this.findText("ApprovalFeedback").text = "Draft kept. Tap Speak to record again, or Send to Codex."
    this.showingFullSummary = this.wasShowingFullSummaryBeforeCompose
    if (this.voiceCaptureActive) this.stopVoiceCapture("Draft kept. Tap Speak to continue.")
    this.refreshState()
    this.updateLiveContentView()
  }

  private sendLiveMessage(): void {
    if (!this.liveConnected || !this.codexReady || !this.liveThreadId || this.pendingSendRpcId !== null) return
    if (this.voiceCaptureActive) this.stopVoiceCapture("Sending transcript to Codex…")
    const text = this.messageDraft.trim()
    if (!text) {
      this.findText("ApprovalFeedback").text = "Enter a message before sending."
      this.refreshState()
      return
    }
    if (text.length > 4000) {
      this.findText("ApprovalFeedback").text = "Messages are limited to 4,000 characters."
      return
    }
    this.pendingSendText = text
    const params: any = {threadId: this.liveThreadId, input: [{type: "text", text}]}
    const method = this.currentTurnId ? "turn/steer" : "turn/start"
    if (method === "turn/steer") params.expectedTurnId = this.currentTurnId
    this.pendingSendRpcId = this.sendLiveRpc(method, params)
    if (this.pendingSendRpcId < 0) {
      this.pendingSendRpcId = null
      this.messageDraft = text
      this.findText("ApprovalFeedback").text = "Bridge disconnected. Draft kept for retry."
      this.refreshState()
      return
    }
    this.findText("ApprovalFeedback").text = "Sending message to Codex…"
    this.sendTimeoutEvent.reset(20)
    this.refreshState()
  }

  private updateLiveContentView(): void {
    this.updateSummaryView()
  }

  private wrapSummaryLines(value: string, lineWidth: number = SUMMARY_LINE_WIDTH): string[] {
    const lines: string[] = []
    const sourceLines = value.replace(/\r/g, "").split("\n")
    let previousWasBlank = true
    for (const sourceLine of sourceLines) {
      let content = sourceLine.trim()
      if (!content) {
        if (lines.length > 0 && !previousWasBlank) lines.push("")
        previousWasBlank = true
        continue
      }

      let prefix = ""
      const heading = content.match(/^#{1,6}\s+(.*)$/)
      const bullet = content.match(/^[-*+]\s+(.*)$/)
      const numbered = content.match(/^(\d+[.)])\s+(.*)$/)
      const quote = content.match(/^>\s*(.*)$/)
      if (heading) {
        content = heading[1]
        prefix = "▸ "
      } else if (bullet) {
        content = bullet[1]
        prefix = "• "
      } else if (numbered) {
        content = numbered[2]
        prefix = numbered[1] + " "
      } else if (quote) {
        content = quote[1]
        prefix = "› "
      }
      // Lens Text renders plain text here, so remove common Markdown emphasis
      // delimiters while keeping the authored headings and list structure.
      content = content
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        .replace(/`([^`]+)`/g, "$1")

      const words = content.split(/\s+/).filter(word => word.length > 0)
      const continuation = prefix.length > 0 ? "  " : ""
      let line = prefix
      for (const word of words) {
        const separator = line.length > 0 && line !== prefix && line !== continuation ? " " : (line === prefix && prefix.length > 0 ? " " : "")
        const candidate = line + separator + word
        if (line.length > 0 && this.measureWrappedText(candidate, lineWidth) > this.wrapWidth(lineWidth)) {
          lines.push(line)
          line = continuation + word
        } else {
          line = candidate
        }
      }
      if (line.length > 0) lines.push(line)
      previousWasBlank = false
    }
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop()
    return lines
  }

  private wrapWidth(lineWidth: number): number {
    return lineWidth === USER_MESSAGE_LINE_WIDTH ? 19.7 : 24.2
  }

  private measureWrappedText(value: string, lineWidth: number): number {
    const component = lineWidth === USER_MESSAGE_LINE_WIDTH ? this.lastUserMessageText : this.summaryTextComponent
    if (!component) return value.length * 0.5
    // Estimate the rendered advance from glyph classes and the active font
    // size. This follows the actual content width/font scale without raw
    // character-count wrapping or rate-limited per-word Text measurements.
    const em = component.size / 43.886
    let advance = 0
    for (const character of value) {
      if (/\s/.test(character)) advance += 0.29
      else if (/[ilI|!.,:;'`]/.test(character)) advance += 0.27
      else if (/[MW@#%&]/.test(character)) advance += 0.82
      else if (/[A-Z0-9]/.test(character)) advance += 0.61
      else if (/[()[\]{}<>?*]/.test(character)) advance += 0.38
      else advance += 0.52
    }
    return advance * em
  }

  private textLineHeight(component: Text): number {
    return Math.max(0.6, (component.size / 43.886) * (component.lineSpacing || 1.08))
  }

  private updateApprovalLayout(): void {
    if (!this.approvalTextComponent || !this.approvalTextItem) return
    const approvalText = this.approvalTextComponent.text
    const lines = this.wrapTextToWidth(approvalText, this.approvalTextComponent, 23.8)
    this.approvalTextComponent.text = lines.join("\n")
    const height = Math.max(3.1, lines.length * this.textLineHeight(this.approvalTextComponent) + APPROVAL_VERTICAL_PADDING * 2)
    this.approvalTextItem.overrideHeight = height
    this.approvalTextComponent.layoutRect = Rect.create(
      -11.9,
      11.9,
      -height * 0.5 + APPROVAL_VERTICAL_PADDING,
      height * 0.5 - APPROVAL_VERTICAL_PADDING
    )
    if (this.approvalTopSpacer) {
      const showGap = this.state === "Needs approval" && this.lastUserMessageRow.enabled
      this.approvalTopSpacer.sceneObject.enabled = showGap
      this.approvalTopSpacer.item.overrideHeight = showGap ? APPROVAL_ROW_GAP : 0
    }
    if (this.approvalBottomSpacer) {
      this.approvalBottomSpacer.sceneObject.enabled = this.state === "Needs approval"
      this.approvalBottomSpacer.item.overrideHeight = APPROVAL_ROW_GAP
    }
  }

  private wrapTextToWidth(value: string, component: Text, width: number): string[] {
    const lines: string[] = []
    for (const sourceLine of value.replace(/\r/g, "").split("\n")) {
      if (!sourceLine.trim()) { lines.push(""); continue }
      let line = ""
      for (const word of sourceLine.split(/\s+/)) {
        const candidate = line ? line + " " + word : word
        if (line && this.measureComponentText(candidate, component) > width) {
          lines.push(line)
          line = word
        } else line = candidate
      }
      if (line) lines.push(line)
    }
    return lines
  }

  private measureComponentText(value: string, component: Text): number {
    const em = component.size / 43.886
    let advance = 0
    for (const character of value) {
      if (/\s/.test(character)) advance += 0.29
      else if (/[ilI|!.,:;'`]/.test(character)) advance += 0.27
      else if (/[MW@#%&]/.test(character)) advance += 0.82
      else if (/[A-Z0-9]/.test(character)) advance += 0.61
      else if (/[()[\]{}<>?*]/.test(character)) advance += 0.38
      else advance += 0.52
    }
    return advance * em
  }

  private createFlexSpacer(layout: FlexLayout, name: string, height: number): {item: FlexItem, sceneObject: SceneObject} {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(layout.getSceneObject())
    sceneObject.enabled = false
    const item = sceneObject.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = 27
    item.overrideHeight = height
    this.flexRows.push({item, sceneObject})
    layout.addItems([item])
    return {item, sceneObject}
  }

  private isPointInSummaryViewport(worldPosition: vec3): boolean {
    const local = this.summaryViewport.getTransform().getInvertedWorldTransform().multiplyPoint(worldPosition)
    return Math.abs(local.x) <= 13.5 && Math.abs(local.y) <= this.summaryViewportHeight * 0.5
  }

  private beginHandSwipe(handType: "left" | "right", hand: BaseHand): void {
    if (!hand.isTracked()) return
    // Use the pinch center to hit-test the text area; wrist position is the
    // steadier signal for motion once the gesture has started.
    const pinchCenter = hand.indexTip.position.add(hand.thumbTip.position).uniformScale(0.5)
    const swipe = this.handSwipe[handType]
    if (this.showingFullSummary && this.state === "Done" && this.isPointInSummaryViewport(pinchCenter)) {
      swipe.target = "summary"
    } else if (
      this.lastUserMessageRow.enabled &&
      this.userMessageLines.length > this.userMessageVisibleLineCount &&
      this.isPointInUserMessageViewport(pinchCenter)
    ) {
      swipe.target = "userMessage"
    } else {
      return
    }
    const viewport = swipe.target === "summary" ? this.summaryViewport : this.userMessageViewport
    const local = viewport.getTransform().getInvertedWorldTransform().multiplyPoint(hand.wrist.position)
    swipe.active = true
    swipe.startY = local.y
    swipe.smoothedDelta = 0
    swipe.maxDelta = 0
    swipe.startedAt = getTime()
  }

  private updateHandSwipes(): void {
    this.updateHandSwipe("left", this.handProvider.getHand("left"))
    this.updateHandSwipe("right", this.handProvider.getHand("right"))
  }

  private updateHandSwipe(handType: "left" | "right", hand: BaseHand): void {
    const swipe = this.handSwipe[handType]
    if (!swipe.active) return
    if (!hand.isTracked()) {
      this.endHandSwipe(handType)
      return
    }
    const viewport = swipe.target === "summary" ? this.summaryViewport : this.userMessageViewport
    const local = viewport.getTransform().getInvertedWorldTransform().multiplyPoint(hand.wrist.position)
    const delta = local.y - swipe.startY
    swipe.smoothedDelta = swipe.smoothedDelta * 0.65 + delta * 0.35
    if (Math.abs(swipe.smoothedDelta) > Math.abs(swipe.maxDelta)) swipe.maxDelta = swipe.smoothedDelta
  }

  private endHandSwipe(handType: "left" | "right"): void {
    const swipe = this.handSwipe[handType]
    if (!swipe.active) return
    swipe.active = false
    // SPECS swipe convention: a short pinch initiated on the viewport, then a
    // quick vertical wrist movement. Longer holds are ignored as drags.
    if (getTime() - swipe.startedAt > 0.75) return
    if (Math.abs(swipe.maxDelta) < HAND_SWIPE_THRESHOLD_CM) return
    const lines = Math.max(1, Math.round(Math.abs(swipe.maxDelta) / HAND_SWIPE_THRESHOLD_CM))
    const delta = swipe.maxDelta > 0 ? lines : -lines
    if (swipe.target === "summary") this.moveSummaryLines(delta)
    else this.moveUserMessageLines(delta)
  }

  private onPreviewTouchStart(event: TouchStartEvent): void {
    const position = event.getTouchPosition()
    if (this.showingFullSummary && this.state === "Done" && this.isScreenPointInSummaryViewport(position)) {
      this.previewTouchTarget = "summary"
    } else if (
      this.lastUserMessageRow.enabled &&
      this.userMessageLines.length > this.userMessageVisibleLineCount &&
      this.isScreenPointInUserMessageViewport(position)
    ) {
      this.previewTouchTarget = "userMessage"
    } else {
      return
    }
    this.previewTouchActive = true
    this.previewTouchLastY = position.y
    this.previewTouchRemainder = 0
  }

  private onPreviewTouchMove(event: TouchMoveEvent): void {
    this.applyPreviewTouchPosition(event.getTouchPosition())
  }

  private applyPreviewTouchPosition(position: vec2): void {
    if (!this.previewTouchActive) return
    const currentY = position.y
    this.previewTouchRemainder += this.previewTouchLastY - currentY
    this.previewTouchLastY = currentY
    const lineSteps = Math.trunc(this.previewTouchRemainder / PREVIEW_SWIPE_LINE_THRESHOLD)
    if (lineSteps !== 0) {
      if (this.previewTouchTarget === "summary") this.moveSummaryLines(lineSteps)
      else if (this.previewTouchTarget === "userMessage") this.moveUserMessageLines(lineSteps)
      this.previewTouchRemainder -= lineSteps * PREVIEW_SWIPE_LINE_THRESHOLD
    }
  }

  private onPreviewTouchEnd(event: TouchEndEvent): void {
    if (!this.previewTouchActive) return
    this.applyPreviewTouchPosition(event.getTouchPosition())
    this.previewTouchActive = false
    this.previewTouchTarget = null
    this.previewTouchRemainder = 0
  }

  private isScreenPointInSummaryViewport(point: vec2): boolean {
    const transform = this.summaryViewport.getTransform()
    const world = transform.getWorldTransform()
    const camera = this.cameraProvider.getComponent()
    const corners = [
      world.multiplyPoint(new vec3(-13.5, -this.summaryViewportHeight * 0.5, 0)),
      world.multiplyPoint(new vec3(-13.5, this.summaryViewportHeight * 0.5, 0)),
      world.multiplyPoint(new vec3(13.5, -this.summaryViewportHeight * 0.5, 0)),
      world.multiplyPoint(new vec3(13.5, this.summaryViewportHeight * 0.5, 0))
    ].map((corner) => camera.worldSpaceToScreenSpace(corner))
    const minX = Math.min(...corners.map((p) => p.x))
    const maxX = Math.max(...corners.map((p) => p.x))
    const minY = Math.min(...corners.map((p) => p.y))
    const maxY = Math.max(...corners.map((p) => p.y))
    const inRect = (y: number): boolean => point.x >= minX && point.x <= maxX && y >= minY && y <= maxY
    return inRect(point.y) || inRect(1 - point.y)
  }

  private isPointInUserMessageViewport(worldPosition: vec3): boolean {
    const local = this.userMessageViewport.getTransform().getInvertedWorldTransform().multiplyPoint(worldPosition)
    return Math.abs(local.x) <= 11 && Math.abs(local.y) <= this.userMessageBubbleHeight * 0.5
  }

  private isScreenPointInUserMessageViewport(point: vec2): boolean {
    const world = this.userMessageViewport.getTransform().getWorldTransform()
    const camera = this.cameraProvider.getComponent()
    const halfHeight = this.userMessageBubbleHeight * 0.5
    const corners = [
      world.multiplyPoint(new vec3(-11, -halfHeight, 0)),
      world.multiplyPoint(new vec3(-11, halfHeight, 0)),
      world.multiplyPoint(new vec3(11, -halfHeight, 0)),
      world.multiplyPoint(new vec3(11, halfHeight, 0))
    ].map((corner) => camera.worldSpaceToScreenSpace(corner))
    const minX = Math.min(...corners.map((p) => p.x))
    const maxX = Math.max(...corners.map((p) => p.x))
    const minY = Math.min(...corners.map((p) => p.y))
    const maxY = Math.max(...corners.map((p) => p.y))
    const inRect = (y: number): boolean => point.x >= minX && point.x <= maxX && y >= minY && y <= maxY
    return inRect(point.y) || inRect(1 - point.y)
  }

  private moveSummaryLines(delta: number): void {
    if (!this.showingFullSummary) return
    const maxOffset = Math.max(0, this.summaryLines.length - this.summaryVisibleLineCount)
    this.summaryLineOffset = Math.max(0, Math.min(maxOffset, this.summaryLineOffset + delta))
    this.updateSummaryView()
  }

  private moveUserMessageLines(delta: number): void {
    const maxOffset = Math.max(0, this.userMessageLines.length - this.userMessageVisibleLineCount)
    this.userMessageLineOffset = Math.max(0, Math.min(maxOffset, this.userMessageLineOffset + delta))
    this.updateUserMessageView(this.displayedUserMessage)
  }

  private layoutRows(): void {
    if (this.actionGroupSpacer) {
      this.actionGroupSpacer.sceneObject.enabled = this.state === "Done"
      if (this.state === "Done") {
        const fixedRows = this.flexRows.filter(row => row !== this.actionGroupSpacer && row.sceneObject.enabled)
        // Preserve the existing summary-to-refresh gap while the taller
        // bottom action row spends some of the panel's unused lower space.
        this.actionGroupSpacer.item.overrideHeight = fixedRows.length > 0 ? 1.7 : 0
      }
    }
    if (this.refreshToActionsSpacer) {
      this.refreshToActionsSpacer.sceneObject.enabled = this.state === "Done"
    }
    const activeRows = this.flexRows.filter(row => row.sceneObject.enabled)
    const summaryItem = this.summaryText.getComponent(FlexItem.getTypeName()) as FlexItem
    const summaryVisible = this.summaryText.enabled
    if (summaryVisible) {
      const otherHeight = activeRows
        .filter(row => row.item !== summaryItem)
        .reduce((sum, row) => sum + row.item.overrideHeight, 0)
      const gaps = Math.max(0, activeRows.length - 1) * this.contentFlex.rowGap
      const available = this.contentFlex.height - this.contentFlex.paddingTop - this.contentFlex.paddingBottom - otherHeight - gaps
      this.summaryViewportHeight = Math.max(4.5, Math.min(SUMMARY_VIEWPORT_HEIGHT, available))
      summaryItem.overrideHeight = this.summaryViewportHeight
      this.summaryTextComponent.layoutRect = Rect.create(
        -13.5 + 1.4,
        13.5 - 1.4,
        -this.summaryViewportHeight * 0.5 + 1.1,
        this.summaryViewportHeight * 0.5 - 1.1
      )
      this.summaryViewportSurface.size = new vec2(27, this.summaryViewportHeight)
      this.summaryVisibleLineCount = Math.max(1, Math.floor((this.summaryViewportHeight - 2.2) / this.textLineHeight(this.summaryTextComponent)))
      this.summaryLineOffset = Math.max(0, Math.min(this.summaryLineOffset, this.summaryLines.length - this.summaryVisibleLineCount))
      this.updateSummaryView()
    }
    this.contentFlex.clearItems()
    this.contentFlex.addItems(activeRows.map(row => row.item))
  }

  private findText(name: string): Text {
    const text = this.findTextComponent(this.findObject(name))
    if (!text) throw new Error(`Missing UI text component: ${name}`)
    return text
  }

  private findTextComponent(root: SceneObject): Text | null {
    const text = root.getComponent("Component.Text") as Text
    if (text) return text
    for (let i = 0; i < root.getChildrenCount(); i++) {
      const found = this.findTextComponent(root.getChild(i))
      if (found) return found
    }
    return null
  }

  private findObject(name: string): SceneObject {
    const rootCount = global.scene.getRootObjectsCount()
    for (let i = 0; i < rootCount; i++) {
      const found = this.findChild(global.scene.getRootObject(i), name)
      if (found) return found
    }
    throw new Error(`Missing UI object: ${name}`)
  }

  private findChild(parent: SceneObject, name: string): SceneObject | null {
    if (parent.name === name) return parent
    for (let i = 0; i < parent.getChildrenCount(); i++) {
      const found = this.findChild(parent.getChild(i), name)
      if (found) return found
    }
    return null
  }
}
