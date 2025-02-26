export enum NodeType {
  // Sources
  Text = 'text',
  File = 'file',
  CSV = 'CSV',
  Fetch = 'fetch',

  // Basic text processing
  Merge = 'merge',
  Split = 'split',
  Join = 'join',
  Replace = 'replace',
  Edit = 'edit',

  // AI-Enabled
  Chat = 'chat',
  Prompt = 'prompt',
  Embed = 'embed',
  Search = 'search',

  // Special
  Cache = 'cache',
  Pick = 'pick',
  Stats = 'stats',

  // Output
  Save = 'save',
}

// Must add the node type here for it to be available in the Add Node Dropdown
export const NodeGroups = {
  Source: [NodeType.Text, NodeType.File, NodeType.CSV, NodeType.Fetch],
  Basic: [NodeType.Merge, NodeType.Split, NodeType.Join, NodeType.Replace, NodeType.Edit],
  Intelligent: [NodeType.Chat, NodeType.Prompt, NodeType.Embed, NodeType.Search],
  Utility: [NodeType.Cache, NodeType.Pick, NodeType.Stats],
  Output: [NodeType.Save],
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
  Boolean = 'boolean',
}

type NodePropertyValue = string | number | boolean;

export interface NodeProperty {
  type: NodePropertyType;
  label: string;
  value: NodePropertyValue;
  editable: boolean;
  displayed: boolean;
}

export interface Coordinates {
  x: number;
  y: number;
}

export enum IOStateType {
  String = 'string',
  Number = 'number',
  StringArray = 'stringArray',
  Table = 'table',
  Empty = 'empty',
}

export class IOState {
  public stringValue: string | null;
  public numberValue: number | null;
  public stringArrayValue: string[] | null;
  public tableValue: string[][] | null;
  public type: IOStateType;

  constructor({
    stringValue = null,
    numberValue = null,
    stringArrayValue = null,
    tableValue = null,
  }: {
    stringValue?: string | null;
    numberValue?: number | null;
    stringArrayValue?: string[] | null;
    tableValue?: string[][] | null;
  }) {
    this.stringValue = stringValue;
    this.numberValue = numberValue;
    this.stringArrayValue = stringArrayValue;
    this.tableValue = tableValue;
    this.type = this.inferType();
  }

  public static ofType(type: IOStateType): IOState {
    switch (type) {
      case IOStateType.String:
        return new IOState({ stringValue: '' });
      case IOStateType.Number:
        return new IOState({ numberValue: 0 });
      case IOStateType.StringArray:
        return new IOState({ stringArrayValue: [] });
      case IOStateType.Table:
        return new IOState({ tableValue: [] });
      case IOStateType.Empty:
        return new IOState({});
    }
  }

  public static fromObject(object: IOState): IOState {
    return new IOState({
      stringValue: object.stringValue,
      numberValue: object.numberValue,
      stringArrayValue: object.stringArrayValue,
      tableValue: object.tableValue,
    });
  }

  // For now, IOState can only have one type
  private inferType(): IOStateType {
    if (this.stringArrayValue !== null) {
      return IOStateType.StringArray;
    } else if (this.stringValue !== null) {
      return IOStateType.String;
    } else if (this.numberValue !== null) {
      return IOStateType.Number;
    } else if (this.tableValue !== null) {
      return IOStateType.Table;
    }

    return IOStateType.Empty;
  }

  public getValue(): string | number | string[] | string[][] | null {
    switch (this.type) {
      case IOStateType.String:
        return this.stringValue;
      case IOStateType.Number:
        return this.numberValue;
      case IOStateType.StringArray:
        return this.stringArrayValue;
      case IOStateType.Table:
        return this.tableValue;
      case IOStateType.Empty:
        return null;
    }
  }

  public getStateDict(): Record<string, (string | number | string[] | string[][] | null)> {
    return {
      stringValue: this.stringValue,
      numberValue: this.numberValue,
      stringArrayValue: this.stringArrayValue,
      tableValue: this.tableValue,
    };
  }

  public isEmpty(): boolean {
    if (this.stringValue !== null) {
      return false;
    }
    if (this.numberValue !== null) {
      return false;
    }
    if (this.stringArrayValue !== null) {
      return false;
    }
    if (this.tableValue !== null) {
      return false;
    }
    return true;
  }

  public appendString(string: string) {
    if (this.stringValue === null) {
      this.stringValue = string;
    } else {
      this.stringValue += string;
    }
  }
}

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
  public inputTypes: IOStateType[] = [];
  public outputState: IOState[] = [];
  public coordinates: Coordinates;
  public nodeRunType: NodeRunType;
  public properties: Record<string, NodeProperty> = {};
  // The indexSelections array is used to select an element from an array input if the node expects a string input
  public indexSelections: (number | null)[] = [];

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
    inputTypes: IOStateType[] = [],
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
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
    this.inputTypes = inputTypes;
    this.indexSelections = indexSelections;

    // For new nodes, initialize the output state array
    if (outputState.length === 0) {
      this.resetOutputState();
    }

    // For new nodes, initialize the index selections array
    if (indexSelections.length === 0) {
      for (let i = 0; i < this.inputs; i++) {
        // When doing index selection, the value at the input index is not null
        this.indexSelections.push(null);
      }
    }
  }

  public static fromObject(object: BaseNode): BaseNode {
    throw new Error('Not implemented');
  }

  public setProperty(key: string, value: NodePropertyValue) {
    this.properties[key].value = value;
  }

  public cacheOrClearIOState(runResult: IOState[]) {
    switch (this.nodeRunType) {
      case NodeRunType.Source:
      case NodeRunType.Cache:
        this.outputState = runResult;
        break;
      case NodeRunType.Run:
        // To make a Run node displayable, cache its output state
        if (this.display) {
          this.outputState = runResult;
        } else {
          // When not displaying a Run node, reset its output state
          this.resetOutputState();
        }
        break;
    }
  }

  protected abstract resetOutputState(): void;
}

// Return a set of input values that pick elements from arrays wherever a node's input expects a string
function selectInputsByIndices(inputValues: IOState[], indexSelections: (number | null)[]): IOState[] {
  const selectedInputValues: IOState[] = [];
  for (let i = 0; i < inputValues.length; i++) {
    const selectedIndexForInput = indexSelections[i];
    const inputValue = inputValues[i];
    if (selectedIndexForInput === null || inputValue === null) {
      selectedInputValues.push(inputValue); // In case the selectedIndex is null
      continue;
    }

    // For now we only care about stringArrayValue
    const inputStringArrayValue = inputValue.stringArrayValue;
    if (inputStringArrayValue === null) {
      selectedInputValues.push(inputValue);
      continue;
    }

    selectedInputValues.push(new IOState({
      stringValue: inputStringArrayValue[selectedIndexForInput],
    }));
  }
  return selectedInputValues;
}

export abstract class BaseSyncNode extends BaseNode {
  public run(inputValues: IOState[]): IOState[] {
    const selectedInputValues = selectInputsByIndices(inputValues, this.indexSelections);
    const runResult = this._run(selectedInputValues);
    this.cacheOrClearIOState(runResult);
    return runResult;
  }

  public abstract _run(inputValues: IOState[]): IOState[];
}

export abstract class BaseAsyncNode extends BaseNode {
  public async run(inputValues: IOState[]): Promise<IOState[]> {
    const selectedInputValues = selectInputsByIndices(inputValues, this.indexSelections);
    const runResult = await this._run(selectedInputValues);
    this.cacheOrClearIOState(runResult);
    return runResult;
  }

  public abstract _run(inputValues: IOState[]): Promise<IOState[]>;
}
