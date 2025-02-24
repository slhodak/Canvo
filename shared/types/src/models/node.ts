import * as tf from '@tensorflow/tfjs';

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
  Pick = 'pick',
  Cache = 'cache',
  CSV = 'CSV',
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

export enum IOStateType {
  String = 'string',
  Number = 'number',
  StringArray = 'stringArray',
  Tensor = 'tensor',
  Empty = 'empty',
}

export class IOState {
  public stringValue: string | null;
  public numberValue: number | null;
  public stringArrayValue: string[] | null;
  public tensor: tf.Tensor | null;
  public type: IOStateType;

  constructor({
    stringValue = null,
    numberValue = null,
    stringArrayValue = null,
    tensor = null,
  }: {
    stringValue?: string | null;
    numberValue?: number | null;
    stringArrayValue?: string[] | null;
    tensor?: tf.Tensor | null;
  }) {
    this.stringValue = stringValue;
    this.numberValue = numberValue;
    this.stringArrayValue = stringArrayValue;
    this.tensor = tensor;
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
      case IOStateType.Tensor:
        return new IOState({ tensor: tf.tensor2d([], [0, 0]) });
      case IOStateType.Empty:
        return new IOState({});
    }
  }

  // For now, IOState can only have one type
  private inferType(): IOStateType {
    if (this.stringArrayValue !== null) {
      return IOStateType.StringArray;
    } else if (this.stringValue !== null) {
      return IOStateType.String;
    } else if (this.numberValue !== null) {
      return IOStateType.Number;
    } else if (this.tensor !== null) {
      return IOStateType.Tensor;
    }

    return IOStateType.Empty;
  }

  public getValue(): string | number | string[] | tf.Tensor | null {
    switch (this.type) {
      case IOStateType.String:
        return this.stringValue;
      case IOStateType.Number:
        return this.numberValue;
      case IOStateType.StringArray:
        return this.stringArrayValue;
      case IOStateType.Tensor:
        return this.tensor;
      case IOStateType.Empty:
        return null;
    }
  }
}

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
  public inputTypes: IOStateType[] = [];
  public outputState: IOState[] = [];
  public coordinates: Coordinates;
  public nodeRunType: NodeRunType;
  public properties: Record<string, NodeProperty> = {};
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

  public setProperty(key: string, value: string | number) {
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
