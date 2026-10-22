import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {tap} from "./RunCodexLeafScenarios"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"

@component
export class RunCodexCriterion2OpenOnPinch extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const panel = findSceneObjectByName("RunCodexStatusPanel")
    expect(panel.enabled).toBe(false)
    expect((findSceneObjectByName("ExternalSampleDataLabel").getComponent(ElementContent.getTypeName()) as ElementContent).text).toBe("SAMPLE DATA — NOT CONNECTED TO CODEX")
    await tap("RunCodexButton", true)
    expect(panel.enabled).toBe(true)
  }
}
