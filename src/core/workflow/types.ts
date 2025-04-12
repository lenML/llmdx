export interface IWorkflowStep {
  name: string;
  value: any;
  entries: IWorkflowStep[];
}
export interface IWorkflowNode {
  name: string;
  steps: IWorkflowStep[];
}
export interface IWorkflow {
  nodes: IWorkflowNode[];
}
