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
  private approvalText!: SceneObject
  private summaryText!: SceneObject
  private summaryTextComponent!: Text
  private summaryHeadingRow!: SceneObject
  private summaryViewport!: SceneObject
  private summaryViewportBackdrop!: SceneObject
  private summaryViewportSurface!: RoundedRectangle
  private summaryProgressText!: Text
  private approveButton!: SceneObject
  private rejectButton!: SceneObject
  private readSummaryButton!: SceneObject
  private summaryLines: string[] = []
  private summaryLineOffset = 0
  private handProvider = HandInputData.getInstance()
  private cameraProvider = WorldCameraFinderProvider.getInstance()
  private handSwipe = {
    left: {active: false, startY: 0, smoothedDelta: 0, maxDelta: 0, startedAt: 0},
    right: {active: false, startY: 0, smoothedDelta: 0, maxDelta: 0, startedAt: 0}
  }
  private previewTouchActive = false
  private previewTouchLastY = 0
  private previewTouchRemainder = 0
  private showingFullSummary = false
  private advanceButton!: SceneObject
  private surface!: RoundedRectangle
  private opaqueBackdrop!: SceneObject
  private liveMode = false
  private liveConnected = false
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

    this.createEvent("UpdateEvent").bind(() => this.updateHandSwipes())
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
    this.findText("TaskDescription").textFill.color = new vec4(0.72, 0.86, 0.95, 1)
    this.findText("ApprovalExplanation").textFill.color = coolWhite
    this.findText("ApprovalFeedback").textFill.color = cyan
    this.summaryTextComponent.textFill.color = coolWhite
    this.summaryTextComponent.depthTest = true
    this.findText("SummaryHeading").textFill.color = new vec4(0.72, 0.88, 0.98, 1)
    this.summaryProgressText.textFill.color = cyan
    if (this.bridgeUrl.trim().length > 0 && this.bridgeToken.trim().length > 0) {
      this.liveMode = true
      this.setConnectionLabel(LIVE_CONNECTING_LABEL)
      this.connectLiveBridge()
    }
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
        this.setConnectionLabel(LIVE_CONNECTED_LABEL)
        this.sendLiveRpc("initialize", {
          clientInfo: {name: "runcodex_specs", title: "RunCodex for SPECS", version: "0.1.0"}
        })
      }
      socket.onmessage = (event: WebSocketMessageEvent) => {
        if (typeof event.data === "string") this.handleLiveMessage(event.data)
      }
      socket.onerror = () => {
        this.liveConnected = false
        this.setConnectionLabel(LIVE_OFFLINE_LABEL)
      }
      socket.onclose = () => {
        this.liveConnected = false
        this.liveThreadId = ""
        this.liveApprovalId = null
        this.setConnectionLabel(LIVE_OFFLINE_LABEL)
        this.reconnectEvent.reset(4)
      }
    } catch (error) {
      this.liveConnected = false
      this.setConnectionLabel(LIVE_OFFLINE_LABEL)
      print("[RunCodex] Bridge connection failed: " + error)
      this.reconnectEvent.reset(4)
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
      const detail = message.params?.reason || message.params?.command || (message.method === "item/fileChange/requestApproval" ? "Codex requests approval to change files." : "Codex requests approval to run a command.")
      this.findText("ApprovalExplanation").text = "LIVE CODEX APPROVAL\n" + String(detail).slice(0, 110)
      this.findText("ApprovalFeedback").text = "Review the request, then choose Approve or Reject."
      this.state = "Needs approval"
      this.refreshState()
      return
    }

    if (message.id !== undefined && this.liveRpcMethods[String(message.id)]) {
      const method = this.liveRpcMethods[String(message.id)]
      delete this.liveRpcMethods[String(message.id)]
      if (message.error) {
        if (method === "initialize" && String(message.error.message || "").toLowerCase().includes("already initialized")) {
          this.sendLiveRpc("thread/list", {limit: 50})
          return
        }
        print("[RunCodex] Codex bridge RPC failed (" + method + "): " + message.error.message)
        if (method === "thread/list") this.setConnectionLabel("NO TASK IN THIS PROJECT")
        return
      }
      if (method === "initialize") {
        this.liveSocket?.send(JSON.stringify({method: "initialized", params: {}}))
        this.sendLiveRpc("thread/list", {limit: 50})
      } else if (method === "thread/list") {
        const threads = message.result?.data || []
        if (threads.length === 0) {
          this.setConnectionLabel("NO TASK IN THIS PROJECT")
          return
        }
        const thread = threads[0]
        this.liveThreadId = thread.id
        this.findText("TaskName").text = thread.name || "Codex task"
        this.findText("TaskDescription").text = "Live Codex session · this project"
        this.syncThreadStatus(thread.status)
        this.sendLiveRpc("thread/resume", {threadId: thread.id, excludeTurns: true})
        this.sendLiveRpc("thread/turns/list", {threadId: thread.id, limit: 1, sortDirection: "desc", itemsView: "full"})
      } else if (method === "thread/turns/list") {
        this.readLiveTurnSummary(message.result?.data || [])
      }
      return
    }

    if (!message.method) return
    const params = message.params || {}
    if (params.threadId && params.threadId !== this.liveThreadId) return
    if (message.method === "turn/started") {
      this.state = "Working"
      this.refreshState()
    } else if (message.method === "turn/completed") {
      const turnStatus = params.turn?.status
      if (turnStatus === "completed") this.state = "Done"
      else this.state = "Working"
      this.refreshState()
    } else if (message.method === "item/agentMessage/delta") {
      this.liveSummary += params.delta || ""
      this.summaryLines = this.wrapSummaryLines(this.liveSummary)
      this.updateSummaryView()
    } else if (message.method === "item/completed" && params.item?.type === "agentMessage") {
      const finalText = this.messageText(params.item)
      if (finalText) this.setLiveSummary(finalText)
    } else if (message.method === "serverRequest/resolved" && this.liveApprovalId !== null) {
      this.liveApprovalId = null
      this.liveApprovalMethod = ""
    }
  }

  private syncThreadStatus(status: any): void {
    const type = status?.type || "idle"
    this.state = type === "active" ? "Working" : "Done"
    this.refreshState()
  }

  private readLiveTurnSummary(turns: any[]): void {
    if (!turns.length) return
    const turn = turns[0].turn || turns[0]
    const items = turn.items || turns[0].items || []
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]?.type === "agentMessage") {
        const text = this.messageText(items[i])
        if (text) {
          this.setLiveSummary(text)
          if (turn.status === "completed") {
            this.state = "Done"
            this.refreshState()
          }
          return
        }
      }
    }
  }

  private messageText(item: any): string {
    if (typeof item?.text === "string") return item.text
    if (Array.isArray(item?.content)) {
      return item.content.map((part: any) => typeof part?.text === "string" ? part.text : "").filter((part: string) => part.length > 0).join("\n")
    }
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
    button.onTriggerUp.add(() => { this.panel.enabled = true; this.launcher.enabled = false })

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
    this.opaqueBackdrop.getTransform().setLocalScale(new vec3(32, 44, 1))
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
    this.surface.size = new vec2(32, 44)
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
    flex.height = 42
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
    this.summaryViewportSurface.size = new vec2(27, SUMMARY_VIEWPORT_HEIGHT)
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

    this.addText(flex, "SampleDataLabel", SAMPLE_LABEL, 27, 2.2, 52)
    this.addText(flex, "TaskName", TASK_NAME, 27, 2.1, 62)
    this.statusText = this.addText(flex, "TaskStatus", "Working", 27, 2, 61)
    this.addText(flex, "TaskDescription", "Small coding task · Preview sample", 27, 1.7, 43)

    this.approvalText = this.addText(flex, "ApprovalExplanation", "Codex needs permission to update the project configuration.", 27, 6, 43).getSceneObject()
    const approvalButtons = this.createButtonRow(flex, "ApprovalButtonsRow", 27, 5)
    this.approvalButtonRow = approvalButtons.getSceneObject()
    this.approveButton = this.addButton(approvalButtons, "ApproveButton", "Approve", 12.8, () => this.approve(), 5)
    this.rejectButton = this.addButton(approvalButtons, "RejectButton", "Reject", 12.8, () => this.reject(), 5)
    this.feedbackText = this.addText(flex, "ApprovalFeedback", "", 27, 2.7, 42).getSceneObject()
    const summaryHeading = this.createButtonRow(flex, "SummaryHeadingRow", 27, 3.2)
    this.summaryHeadingRow = summaryHeading.getSceneObject()
    const heading = this.addText(summaryHeading, "SummaryHeading", "SUMMARY", 13, 3.2, 35)
    heading.textFill.color = new vec4(0.72, 0.88, 0.98, 1)
    this.readSummaryButton = this.addButton(summaryHeading, "ReadSummaryButton", "Read summary", 8, () => this.toggleFullSummary(), 2.8, 36)

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

    this.summaryProgressText = this.addText(summaryHeading, "SummaryProgress", "1–7 / 32", 7, 3.2, 24)
    this.summaryProgressText.horizontalAlignment = HorizontalAlignment.Right
    const spacerObject = global.scene.createSceneObject("SummaryToActionsSpacer")
    spacerObject.setParent(flex.getSceneObject())
    spacerObject.enabled = false
    const spacerItem = spacerObject.createComponent(FlexItem.getTypeName()) as FlexItem
    spacerItem.overrideWidth = 29
    spacerItem.overrideHeight = 0
    this.actionGroupSpacer = {item: spacerItem, sceneObject: spacerObject}
    this.flexRows.push(this.actionGroupSpacer)
    this.advanceButton = this.addButton(flex, "AdvanceSampleButton", "Advance sample task", 27, () => this.advance(), 5)
    const refreshSpacerObject = global.scene.createSceneObject("RefreshToActionsSpacer")
    refreshSpacerObject.setParent(flex.getSceneObject())
    refreshSpacerObject.enabled = false
    const refreshSpacerItem = refreshSpacerObject.createComponent(FlexItem.getTypeName()) as FlexItem
    refreshSpacerItem.overrideWidth = 29
    refreshSpacerItem.overrideHeight = 2.2
    this.refreshToActionsSpacer = {item: refreshSpacerItem, sceneObject: refreshSpacerObject}
    this.flexRows.push(this.refreshToActionsSpacer)
    const actions = this.createButtonRow(flex, "PanelActionsRow", 27, 7)
    this.actionsRow = actions.getSceneObject()
    this.closeButton = this.addButton(actions, "ClosePanelButton", "Close panel", 12.8, () => { this.panel.enabled = false; this.opaqueBackdrop.enabled = false; this.launcher.enabled = true }, 5)
    this.restartButton = this.addButton(actions, "RestartSampleButton", "Restart sample", 12.8, () => this.restart(), 5)
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
    const quietControl = name === "ClosePanelButton" || name === "ReadSummaryButton"
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
      if (this.liveConnected) this.sendLiveRpc("thread/list", {limit: 50})
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
    this.showingFullSummary = false
    this.refreshState()
  }

  private refreshState(): void {
    this.statusText.text = this.state
    this.cue.enabled = this.state === "Needs approval"
    this.approvalText.enabled = this.state === "Needs approval"
    this.approvalButtonRow.enabled = this.state === "Needs approval"
    this.approveButton.enabled = this.state === "Needs approval"
    this.rejectButton.enabled = this.state === "Needs approval"
    this.feedbackText.enabled = (this.feedbackText.getComponent("Component.Text") as Text).text.length > 0
    this.readSummaryButton.enabled = this.state === "Done"
    this.summaryHeadingRow.enabled = this.state === "Done"
    this.summaryViewport.enabled = this.state === "Done"
    this.showingFullSummary = false
    this.summaryText.enabled = this.state === "Done"
    this.summaryViewportBackdrop.enabled = this.state === "Done"
    this.summaryLineOffset = 0
    this.updateSummaryView()
    this.advanceButton.enabled = this.liveMode || this.state === "Working"
    this.closeButton.enabled = true
    this.restartButton.enabled = true
    this.actionsRow.enabled = true
    this.layoutRows()
    this.resizeSurface()
    const advanceLabel = this.advanceButton.getComponent(ElementContent.getTypeName()) as ElementContent
    advanceLabel.text = this.liveMode ? "Refresh Codex status" : "Advance sample task"
    const restartLabel = this.restartButton.getComponent(ElementContent.getTypeName()) as ElementContent
    restartLabel.text = this.liveMode ? "Close RunCodex" : "Restart sample"
  }

  private resizeSurface(): void {
    const width = 32
    const height = 44
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

  private toggleFullSummary(): void {
    this.showingFullSummary = !this.showingFullSummary
    this.summaryLineOffset = 0
    this.updateSummaryView()
    this.layoutRows()
  }

  private updateSummaryProgress(): void {
    const firstLine = Math.min(this.summaryLines.length, this.summaryLineOffset + 1)
    const lastLine = Math.min(this.summaryLines.length, this.summaryLineOffset + SUMMARY_VISIBLE_LINES)
    this.summaryProgressText.text = firstLine + "–" + lastLine + " / " + this.summaryLines.length
  }

  private updateSummaryView(): void {
    const summary = this.liveMode ? this.liveSummary : SUMMARY
    if (this.showingFullSummary) {
      const visible = this.summaryLines.slice(this.summaryLineOffset, this.summaryLineOffset + SUMMARY_VISIBLE_LINES)
      this.summaryTextComponent.text = visible.join("\n")
    } else {
      const conciseLines = this.wrapSummaryLines(summary.slice(0, 110))
      this.summaryTextComponent.text = conciseLines.slice(0, 2).join("\n") + "…"
    }
    this.summaryTextComponent.verticalAlignment = VerticalAlignment.Top
    this.summaryTextComponent.verticalOverflow = VerticalOverflow.Truncate
    this.summaryTextComponent.horizontalOverflow = HorizontalOverflow.Wrap
    const buttonLabel = this.readSummaryButton.getComponent(ElementContent.getTypeName()) as ElementContent
    buttonLabel.text = this.showingFullSummary ? "Show less" : "Read summary"
    this.updateSummaryProgress()
  }

  private wrapSummaryLines(value: string): string[] {
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
        if (line.length > 0 && line.length + separator.length + word.length > SUMMARY_LINE_WIDTH) {
          lines.push(line)
          line = continuation + word
        } else {
          line += separator + word
        }
      }
      if (line.length > 0) lines.push(line)
      previousWasBlank = false
    }
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop()
    return lines
  }

  private isPointInSummaryViewport(worldPosition: vec3): boolean {
    const local = this.summaryViewport.getTransform().getInvertedWorldTransform().multiplyPoint(worldPosition)
    return Math.abs(local.x) <= 13.5 && Math.abs(local.y) <= SUMMARY_VIEWPORT_HEIGHT * 0.5
  }

  private beginHandSwipe(handType: "left" | "right", hand: BaseHand): void {
    if (!this.showingFullSummary || this.state !== "Done" || !hand.isTracked()) return
    // Use the pinch center to hit-test the text area; wrist position is the
    // steadier signal for motion once the gesture has started.
    const pinchCenter = hand.indexTip.position.add(hand.thumbTip.position).uniformScale(0.5)
    if (!this.isPointInSummaryViewport(pinchCenter)) return
    const local = this.summaryViewport.getTransform().getInvertedWorldTransform().multiplyPoint(hand.wrist.position)
    const swipe = this.handSwipe[handType]
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
    const local = this.summaryViewport.getTransform().getInvertedWorldTransform().multiplyPoint(hand.wrist.position)
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
    this.moveSummaryLines(swipe.maxDelta > 0 ? lines : -lines)
  }

  private onPreviewTouchStart(event: TouchStartEvent): void {
    if (!this.showingFullSummary || this.state !== "Done" || !this.isScreenPointInSummaryViewport(event.getTouchPosition())) return
    this.previewTouchActive = true
    this.previewTouchLastY = event.getTouchPosition().y
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
      this.moveSummaryLines(lineSteps)
      this.previewTouchRemainder -= lineSteps * PREVIEW_SWIPE_LINE_THRESHOLD
    }
  }

  private onPreviewTouchEnd(event: TouchEndEvent): void {
    if (!this.previewTouchActive) return
    this.applyPreviewTouchPosition(event.getTouchPosition())
    this.previewTouchActive = false
    this.previewTouchRemainder = 0
  }

  private isScreenPointInSummaryViewport(point: vec2): boolean {
    const transform = this.summaryViewport.getTransform()
    const world = transform.getWorldTransform()
    const camera = this.cameraProvider.getComponent()
    const corners = [
      world.multiplyPoint(new vec3(-13.5, -SUMMARY_VIEWPORT_HEIGHT * 0.5, 0)),
      world.multiplyPoint(new vec3(-13.5, SUMMARY_VIEWPORT_HEIGHT * 0.5, 0)),
      world.multiplyPoint(new vec3(13.5, -SUMMARY_VIEWPORT_HEIGHT * 0.5, 0)),
      world.multiplyPoint(new vec3(13.5, SUMMARY_VIEWPORT_HEIGHT * 0.5, 0))
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
    const maxOffset = Math.max(0, this.summaryLines.length - SUMMARY_VISIBLE_LINES)
    this.summaryLineOffset = Math.max(0, Math.min(maxOffset, this.summaryLineOffset + delta))
    this.updateSummaryView()
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
    this.contentFlex.clearItems()
    this.contentFlex.addItems(this.flexRows.filter(row => row.sceneObject.enabled).map(row => row.item))
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
