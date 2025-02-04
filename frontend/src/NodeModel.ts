interface NodeProperty {
  type: 'string' | 'number';
  label: string;
  value: string | number;
}

export class BaseNode {
  public properties: Record<string, NodeProperty> = {};

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
      },
      name: {
        type: 'string',
        label: 'Name',
        value: name,
      },
      type: {
        type: 'string',
        label: 'Type',
        value: type,
      },
      inputs: {
        type: 'number',
        label: 'Inputs',
        value: inputs,
      },
      outputs: {
        type: 'number',
        label: 'Outputs',
        value: outputs,
      },
      ...customProperties,
    };
  }
}

export class TextNode extends BaseNode {
  constructor(
    id: string,
    public text: string = ''
  ) {
    super(id, 'Text', 'text', 0, 1, {
      text: {
        type: 'string',
        label: 'Text',
        value: text,
      },
    });
  }
}

export class PromptNode extends BaseNode {
  constructor(
    id: string,
    public prompt: string = ''
  ) {
    super(id, 'Prompt', 'prompt', 1, 1, {
      prompt: {
        type: 'string',
        label: 'Prompt',
        value: prompt,
      },
    });
  }
}

export class OutputNode extends BaseNode {
  constructor(
    id: string,
  ) {
    super(id, 'Output', 'output', 0, 1);
  }
}
