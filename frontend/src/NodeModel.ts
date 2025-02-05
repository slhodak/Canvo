export interface NodeProperty {
  type: 'string' | 'number';
  label: string;
  value: string | number;
  editable: boolean;
  displayed: boolean;
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
  }

  public setProperty(key: string, value: string | number) {
    this.properties[key].value = value;
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
        editable: true,
        displayed: true,
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
        editable: true,
        displayed: true,
      },
    });
  }
}

export class SaveNode extends BaseNode {
  constructor(
    id: string,
  ) {
    super(id, 'Save', 'save', 1, 0);
  }
}
