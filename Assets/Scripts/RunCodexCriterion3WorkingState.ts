import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {status, tap} from "./RunCodexLeafScenarios"

@component
export class RunCodexCriterion3WorkingState extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    await tap("RunCodexButton")
    expect(findSceneObjectByName("SampleDataLabel").enabled).toBe(true)
    expect((findSceneObjectByName("TaskName").getComponent("Component.Text") as Text).text).toBe("Refactor coffee ordering tests")
    expect(status()).toBe("Working")
    expect(findSceneObjectByName("NeedsApprovalCue").enabled).toBe(false)
  }
}
