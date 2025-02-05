export interface NodeProperty {
  type: 'string' | 'number';
  label: string;
  value: string | number;
  editable: boolean;
  displayed: boolean;
}

export class Connection {
  constructor(
    public fromNode: string,
    public fromOutput: number,
    public toNode: string,
    public toInput: number,
  ) {}
}

// For nodes whose functions are synchronous
export interface SyncNode {
  run(): void;
}

// For nodes whose functions are asynchronous
export interface AsyncNode {
  asyncRun(): Promise<void>;
}

export abstract class BaseNode {
  public properties: Record<string, NodeProperty> = {};
  public state = {
    input: Array<string>(),
    output: Array<string>(),
  }
  public isDirty = false;

  constructor(
    public id: string,
    public name: string,
    public type: string,
    public inputs: number,
    public outputs: number,
    public customProperties: Record<string, NodeProperty> = {}
  ) {
    this.properties = {
      id: {
        type: 'string',
        label: 'ID',
        value: id,
        editable: false,
        displayed: false,
      },
      name: {
        type: 'string',
        label: 'Name',
        value: name,
        editable: false,
        displayed: true,
      },
      type: {
        type: 'string',
        label: 'Type',
        value: type,
        editable: false,
        displayed: false,
      },
      inputs: {
        type: 'number',
        label: 'Inputs',
        value: inputs,
        editable: false,
        displayed: false,
      },
      outputs: {
        type: 'number',
        label: 'Outputs',
        value: outputs,
        editable: true,
        displayed: true,
      },
      ...customProperties,
    };

    // Initialize the input and output arrays
    for (let i = 0; i < this.inputs; i++) {
      this.state.input.push('');
    }

    for (let i = 0; i < this.outputs; i++) {
      this.state.output.push('');
    }
  }

  public setDirty() {
    this.isDirty = true;
  }

  public setClean() {
    this.isDirty = false;
  }

  public setProperty(key: string, value: string | number) {
    this.properties[key].value = value;
    // TODO: Work out how to change size of input and output arrays
  }
}

export class TextNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
    public text: string = ''
  ) {
    super(id, 'Text', 'text', 0, 1, {
      text: {
        type: 'string',
        label: 'Text',
        value: text,
        editable: true,
        displayed: true,
      },
    });
  }

  run() {
    if (!this.isDirty) return;

    this.state.output[0] = this.properties.text.value as string;
    this.setClean();
  }

  // Some nodes run automatically when their properties are changed
  setDirty() {
    super.setDirty();
    this.run();
  }
}

export class PromptNode extends BaseNode implements AsyncNode {
  constructor(
    id: string,
    public prompt: string = ''
  ) {
    super(id, 'Prompt', 'prompt', 1, 1, {
      prompt: {
        type: 'string',
        label: 'Prompt',
        value: prompt,
        editable: true,
        displayed: true,
      },
    });

  }

  async asyncRun() {
    this.state.output[0] = this.state.input[0];
    // TODO: Implement
    // Call the LLM with the prompt and the input text
  }
}

export class SaveNode extends BaseNode implements AsyncNode {
  constructor(
    id: string,
  ) {
    super(id, 'Save', 'save', 1, 0);
  }

  async asyncRun() {
    // TODO: Implement
    // Save the input text to a file
  }
}

export class MergeNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
  ) {
    super(id, 'Merge', 'merge', 2, 1, {
      separator: {
        type: 'string',
        label: 'Separator',
        value: ' ',
        editable: true,
        displayed: true,
      },
    });
  }

  run() {
    // Merge the input texts into a single output text
    const mergedResult = Object.values(this.state.input).join(
      this.properties.separator.value as string
    );

    this.state.output[0] = mergedResult;
  }
}

// There can only be one view node
// Connect an output port to the view node to display the output in the OutputView
export class ViewNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
  ) {
    super(id, 'View', 'view', 1, 0, {
      content: {
        type: 'string',
        label: 'Content',
        value: '',
        editable: false,
        displayed: false,
      },
    });
  }

  run() {
    // Copy the input to the content
    this.properties.content.value = this.state.input[0];
  }
}
