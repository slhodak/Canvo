export class BaseNode {
  constructor(
    public id: string,
    public name: string,
    public type: string,
    public inputs: number,
    public outputs: number
  ) { }
}

export class TextNode extends BaseNode {
  constructor(
    id: string,
    public text: string = ''
  ) {
    super(id, 'Text', 'text', 1, 1);
  }
}

export class PromptNode extends BaseNode {
  constructor(
    id: string,
    public prompt: string = ''
  ) {
    super(id, 'Prompt', 'prompt', 2, 1);
  }
}

export class OutputNode extends BaseNode {
  constructor(
    id: string,
  ) {
    super(id, 'Output', 'output', 1, 0);
  }
}