import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {
  RunCodexCriterion1SpatialAnchor,
} from "./RunCodexLeafScenarios"
import {RunCodexCriterion2OpenOnPinch} from "./RunCodexCriterion2OpenOnPinch"
import {RunCodexCriterion3WorkingState} from "./RunCodexCriterion3WorkingState"
import {RunCodexCriterion4ApprovalFlow} from "./RunCodexCriterion4ApprovalFlow"
import {RunCodexCriterion5CompletionSummary} from "./RunCodexCriterion5CompletionSummary"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "runcodex-criterion-1-spatial-anchor", typename: RunCodexCriterion1SpatialAnchor.getTypeName()},
    {id: "runcodex-criterion-2-open-on-pinch", typename: RunCodexCriterion2OpenOnPinch.getTypeName()},
    {id: "runcodex-criterion-3-working-state", typename: RunCodexCriterion3WorkingState.getTypeName()},
    {id: "runcodex-criterion-4-approval-flow", typename: RunCodexCriterion4ApprovalFlow.getTypeName()},
    {id: "runcodex-criterion-5-completion-summary", typename: RunCodexCriterion5CompletionSummary.getTypeName()},
  ]
}
