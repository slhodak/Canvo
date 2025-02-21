export enum NodeType {
  Text = 'text',
  Fetch = 'fetch',
  Prompt = 'prompt',
  Save = 'save',
  Merge = 'merge',
  Split = 'split',
  File = 'file',
  Edit = 'edit',
  Embed = 'embed',
  Search = 'search',
  Join = 'join',
  Replace = 'replace',
}

// A source node is not dependent on other nodes, and will cache its output state
// A cache node runs an expensive or non-deterministic function, and will cache its output state
// A run node runs a cheap and deterministic function, and will not cache its output state
// A None node has no outputs, like a Save node
// When traversing the DAG, read from Cache and Source nodes, and run Run nodes
// Cache nodes can only be run manually
export enum NodeRunType {
  Source = 'source',
  Cache = 'cache',
  Run = 'run',
  None = 'none',
}

export enum NodePropertyType {
  String = 'string',
  Number = 'number',
  File = 'file',
}

export interface NodeProperty {
  type: NodePropertyType;
  label: string;
  value: string | number;
  editable: boolean;
  displayed: boolean;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface OutputState {
  stringValue: string | null;
  numberValue: number | null;
  stringArrayValue: string[] | null;
}

export enum OutputStateType {
  String = 'string',
  Number = 'number',
  StringArray = 'stringArray',
}

export const defaultOutputStates: Record<OutputStateType, OutputState[]> = {
  [OutputStateType.String]: [{
    stringValue: '',
    numberValue: null,
    stringArrayValue: null,
  }],
  [OutputStateType.Number]: [{
    stringValue: null,
    numberValue: null,
    stringArrayValue: null,
  }],
  [OutputStateType.StringArray]: [{
    stringValue: null,
    numberValue: null,
    stringArrayValue: [],
  }],
};

// index-selector: the node may need to do index selection on its input.
// this means that it expects a string input
// but is receiving a string[] input
// and it will have to pick an index to read from
export abstract class BaseNode {
  public nodeId: string;
  public projectId: string;
  public authorId: string;
  public name: string;
  public label: string;
  public display: boolean;
  public type: NodeType;
  public inputs: number;
  public outputs: number;
  public outputState: OutputState[] = [];
  public coordinates: Coordinates;
  public nodeRunType: NodeRunType;
  public properties: Record<string, NodeProperty> = {};

  constructor(
    nodeId: string,
    authorId: string,
    projectId: string,
    name: string,
    label: string,
    display: boolean,
    type: NodeType,
    inputs: number,
    outputs: number,
    coordinates: Coordinates,
    nodeRunType: NodeRunType,
    properties: Record<string, NodeProperty> = {},
    outputState: OutputState[] = [],
  ) {
    this.nodeId = nodeId;
    this.authorId = authorId;
    this.projectId = projectId;
    this.name = name;
    this.label = label;
    this.display = display;
    this.type = type;
    this.inputs = inputs;
    this.outputs = outputs;
    this.coordinates = coordinates;
    this.nodeRunType = nodeRunType;
    this.properties = properties;
    this.outputState = outputState;

    // For new nodes, initialize the output state array
    if (outputState.length === 0) {
      for (let i = 0; i < this.outputs; i++) {
        this.outputState.push({
          stringValue: null,
          numberValue: null,
          stringArrayValue: null,
        });
      }
    }
  }

  public static fromObject(object: BaseNode): BaseNode {
    throw new Error('Not implemented');
  }

  public setProperty(key: string, value: string | number) {
    this.properties[key].value = value;
  }

  public cacheOrClearOutputState(runResult: OutputState[]) {
    switch (this.nodeRunType) {
      case (NodeRunType.Source, NodeRunType.Cache):
        this.outputState = runResult;
        break;
      case (NodeRunType.Run, NodeRunType.Cache):
        // To make a Run node displayable, cache its output state
        if (this.display) {
          this.outputState = runResult;
        } else {
          // When not displaying a Run node, erase its output state
          this.outputState = [];
        }
        break;
    }
  }
}

export abstract class BaseSyncNode extends BaseNode {
  public run(inputValues: (OutputState | null)[]): OutputState[] {
    // index-selector: if the node is doing index selection, pick the index
    // from each outputState in the array
    // index selection will be per input. selectedIndices
    const runResult = this._run(inputValues);
    this.cacheOrClearOutputState(runResult);
    return runResult;
  }

  public abstract _run(inputValues: (OutputState | null)[]): OutputState[];
}

export abstract class BaseAsyncNode extends BaseNode {
  public async run(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
    const runResult = await this._run(inputValues);
    this.cacheOrClearOutputState(runResult);
    return runResult;
  }

  public abstract _run(inputValues: (OutputState | null)[]): Promise<OutputState[]>;
}
