import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {status, tap} from "./RunCodexLeafScenarios"

@component
export class RunCodexCriterion4ApprovalFlow extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    await tap("RunCodexButton")
    await tap("AdvanceSampleButton")
    expect(status()).toBe("Needs approval")
    expect(findSceneObjectByName("NeedsApprovalCue").enabled).toBe(true)
    expect(findSceneObjectByName("ExternalSampleDataLabel").enabled).toBe(true)
    expect(findSceneObjectByName("ApprovalExplanation").enabled).toBe(true)
    await tap("RejectButton")
    expect(status()).toBe("Rejected")
    expect((findSceneObjectByName("ApprovalFeedback").getComponent("Component.Text") as Text).text).toBe("Rejected — waiting for your next instruction.")
    await tap("RestartSampleButton")
    await tap("AdvanceSampleButton")
    await tap("ApproveButton")
    expect(status()).toBe("Working")
    expect((findSceneObjectByName("ApprovalFeedback").getComponent("Component.Text") as Text).text).toBe("Approved — Codex is working again")
  }
}
