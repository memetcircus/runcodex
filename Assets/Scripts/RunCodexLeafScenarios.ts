import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"

export async function tap(name: string, ik: boolean = false): Promise<void> {
  const target = findInteractableByName(name)
  if (!target) throw new Error(`Interactable not found: ${name}`)
  if (ik) await createIKInteractor().trigger(target)
  else await new DefaultLeafInteractor().trigger(target)
  await sleep(450)
}

export function status(): string {
  return (findSceneObjectByName("TaskStatus").getComponent("Component.Text") as Text).text
}

@component
export class RunCodexCriterion1SpatialAnchor extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const counter = findSceneObjectByName("Counter")
    const mug = findSceneObjectByName("Mug")
    const maker = findSceneObjectByName("CoffeeMaker")
    const button = findSceneObjectByName("RunCodexButton")
    expect(counter.enabled).toBe(true)
    expect(mug.enabled).toBe(true)
    expect(maker.enabled).toBe(true)
    expect(counter.getParent() === null).toBe(true)
    expect(mug.getParent() === null).toBe(true)
    expect(maker.getParent() === null).toBe(true)
    expect(button.getParent() === null).toBe(true)
    expect(button.getTransform().getWorldPosition().z < -80).toBe(true)
  }
}

