export enum NodeType {
  Text = 'text',
  Prompt = 'prompt',
  Save = 'save',
  View = 'view',
  Merge = 'merge',
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
    public id: string,
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
  run(inputValues: (OutputState | null)[]): void;
}

// For nodes whose functions are asynchronous
export interface AsyncNode {
  asyncRun(inputValues: (OutputState | null)[]): Promise<void>;
}

export interface OutputState {
  stringValue: string | null;
  numberValue: number | null;
}

export abstract class BaseNode {
  public nodeId: string;
  public projectId: string;
  public authorId: string;
  public name: string;
  public type: string;
  public inputs: number;
  public outputs: number;
  public outputState: OutputState[] = [];
  public coordinates: Coordinates;
  public runsAutomatically: boolean;
  public properties: Record<string, NodeProperty> = {};
  public isDirty = false;

  constructor(
    nodeId: string,
    authorId: string,
    projectId: string,
    name: string,
    type: string,
    inputs: number,
    outputs: number,
    coordinates: Coordinates,
    runsAutomatically: boolean,
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
    this.runsAutomatically = runsAutomatically;
    this.properties = properties;
    this.outputState = outputState;

    // For new nodes, initialize the output state array
    if (outputState.length === 0) {
      for (let i = 0; i < this.outputs; i++) {
        this.outputState.push({
          stringValue: null,
          numberValue: null,
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

export class TextNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    public text: string = '',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Text', 'text', 0, 1, coordinates, true, {
      text: {
        type: 'string',
        label: 'Text',
        value: text,
        editable: true,
        displayed: true,
      },
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new TextNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.properties.text.value as string, object.outputState);
  }

  // Every node accepts an array of input values, but sometimes that array is empty
  run(inputValues: (OutputState | null)[]) {
    if (!this.isDirty) return;

    this.outputState[0] = {
      stringValue: this.properties.text.value as string,
      numberValue: null,
    };
    this.setClean();
  }
}

export class PromptNode extends BaseNode implements AsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    public prompt: string = '',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Prompt', 'prompt', 1, 1, coordinates, false, {
      prompt: {
        type: 'string',
        label: 'Prompt',
        value: prompt,
        editable: true,
        displayed: true,
      },
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new PromptNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.properties.prompt.value as string, object.outputState);
  }

  async asyncRun(inputValues: (OutputState | null)[]) {
    if (!inputValues[0]) return;

    this.outputState[0] = inputValues[0] as OutputState;
    // TODO: Implement
    // Call the LLM with the prompt and the input text
  }
}

export class SaveNode extends BaseNode implements AsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
  ) {
    super(id, authorId, projectId, 'Save', 'save', 1, 0, coordinates, false, {});
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new SaveNode(object.nodeId, object.authorId, object.projectId, object.coordinates);
  }

  async asyncRun(inputValues: (OutputState | null)[]) {
    // TODO: Implement
    // Save the input text to a file
  }
}

export class MergeNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Merge', 'merge', 2, 1, coordinates, true, {
      separator: {
        type: 'string',
        label: 'Separator',
        value: ' ',
        editable: true,
        displayed: true,
      },
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new MergeNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.outputState);
  }

  run(inputValues: (OutputState | null)[]) {
    // Merge the input texts into a single output text
    let mergedResult = '';
    let i = 0;
    for (const inputValue of inputValues) {
      if (inputValue) {
        if (i > 0) {
          mergedResult += this.properties.separator.value as string;
        }
        mergedResult += inputValue.stringValue as string;
        i++;
      }
    }

    this.outputState[0] = {
      stringValue: mergedResult,
      numberValue: null,
    };
  }
}

// There can only be one view node
// Connect an output port to the view node to display the output in the OutputView
export class ViewNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
  ) {
    super(id, authorId, projectId, 'View', 'view', 1, 0, coordinates, true, {
      content: {
        type: 'string',
        label: 'Content',
        value: '',
        editable: false,
        displayed: false,
      },
    });
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new ViewNode(object.nodeId, object.authorId, object.projectId, object.coordinates);
  }

  run(inputValues: (OutputState | null)[]) {
    // Copy the input to the content
    if (inputValues[0]) {
      this.properties.content.value = inputValues[0].stringValue as string;
    } else {
      this.properties.content.value = '';
    }
  }
}
