import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {status, tap} from "./RunCodexLeafScenarios"

@component
export class RunCodexCriterion5CompletionSummary extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    await tap("RunCodexButton")
    await tap("AdvanceSampleButton")
    await tap("ApproveButton")
    await tap("AdvanceSampleButton")
    expect(status()).toBe("Done")
    expect(findSceneObjectByName("CompletionSummary").enabled).toBe(true)
    const readMore = findSceneObjectByName("ReadSummaryButton")
    const summaryText = findSceneObjectByName("CompletionSummary").getComponent("Component.Text") as Text
    if (summaryText.text.length > 68) {
      expect(readMore.enabled).toBe(true)
      const concisePage = summaryText.text
      await tap("ReadSummaryButton")
      expect(findSceneObjectByName("SummaryScrollControls").enabled).toBe(true)
      const firstPage = summaryText.text
      await tap("SummaryScrollDown")
      expect(summaryText.text).not.toBe(firstPage)
      await tap("ReadSummaryButton")
      expect(summaryText.text).toBe(concisePage)
    } else {
      expect(readMore.enabled).toBe(false)
      expect(summaryText.text).toBe("Updated 8 tests, removed 2 flaky waits, and all checks passed.")
    }
  }
}
