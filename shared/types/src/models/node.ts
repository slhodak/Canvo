export enum NodeType {
  Text = 'text',
  Prompt = 'prompt',
  Save = 'save',
  View = 'view',
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

export interface NodeProperty {
  type: 'string' | 'number';
  label: string;
  value: string | number;
  editable: boolean;
  displayed: boolean;
}

export interface Coordinates {
  x: number;
  y: number;
}

export class Connection {
  constructor(
    public connectionId: string,
    public authorId: string,
    public projectId: string,
    public fromNode: string,
    public fromOutput: number,
    public toNode: string,
    public toInput: number,
  ) { }
}

// For nodes whose functions are synchronous
export interface SyncNode {
  run(inputValues: (OutputState | null)[]): OutputState[];
}

// For nodes whose functions are asynchronous
export interface AsyncNode {
  asyncRun(inputValues: (OutputState | null)[]): Promise<OutputState[]>;
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

// cache-expensive: a node will only cache its output state if it is a node that does not run automatically
// run methods return their output state, and only cache them as a side effect, and only if the node does not run automatically
export abstract class BaseNode {
  public nodeId: string;
  public projectId: string;
  public authorId: string;
  public name: string;
  public type: NodeType;
  public inputs: number;
  public outputs: number;
  public outputState: OutputState[] = [];
  public coordinates: Coordinates;
  public nodeRunType: NodeRunType;
  public properties: Record<string, NodeProperty> = {};
  public isDirty = false;

  constructor(
    nodeId: string,
    authorId: string,
    projectId: string,
    name: string,
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

  public setDirty() {
    this.isDirty = true;
  }

  public setClean() {
    this.isDirty = false;
  }

  public setProperty(key: string, value: string | number) {
    this.properties[key].value = value;
    this.setDirty();
    // TODO: Work out how to change size of output array
  }
}
