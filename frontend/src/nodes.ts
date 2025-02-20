import {
  NodeType,
  NodeRunType,
  BaseNode,
  BaseSyncNode,
  BaseAsyncNode,
  OutputState,
  Coordinates,
  OutputStateType,
  defaultOutputStates,
  NodePropertyType,
} from '../../shared/types/src/models/node';
import { SERVER_URL } from './constants';

export class TextNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    text: string = '',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Text', NodeType.Text, 0, 1, coordinates, NodeRunType.Source, {
      text: {
        type: NodePropertyType.String,
        label: 'Text',
        value: text,
        editable: true,
        displayed: true,
      },
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new TextNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.properties.text.value as string, object.outputState);
  }

  public override setProperty(key: string, value: string | number) {
    this.properties[key].value = value;
    this.outputState = [{
      stringValue: value as string,
      numberValue: null,
      stringArrayValue: null,
    }];
  }

  // Every node accepts an array of input values, but sometimes that array is empty
  _run(inputValues: (OutputState | null)[]): OutputState[] {
    return [{
      stringValue: this.properties.text.value as string,
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

export class PromptNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    prompt: string = '',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Prompt', NodeType.Prompt, 1, 1, coordinates, NodeRunType.Cache, {
      prompt: {
        type: NodePropertyType.String,
        label: 'Prompt',
        value: prompt,
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new PromptNode(
      object.nodeId, object.authorId, object.projectId, object.coordinates,
      object.properties.prompt.value as string, object.outputState);
  }

  async _run(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
    if (!inputValues[0]) return defaultOutputStates[OutputStateType.String];

    if (!this.properties.prompt.value || this.properties.prompt.value === '') {
      return defaultOutputStates[OutputStateType.String];
    }

    // Call the LLM with the prompt and the input text
    try {
      const response = await fetch(`${SERVER_URL}/api/run_prompt`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: this.projectId,
          nodeId: this.nodeId,
          prompt: this.properties.prompt.value as string,
          input: inputValues[0].stringValue as string,
        }),
      });
      const data: LLMResponse = await response.json() as LLMResponse;
      if (data.status === 'success') {
        return [{
          stringValue: data.result,
          numberValue: null,
          stringArrayValue: null,
        }];
      } else {
        console.error('Error running prompt:', data.error);
        return defaultOutputStates[OutputStateType.String];
      }
    } catch (error) {
      console.error('Error running prompt:', error);
      return defaultOutputStates[OutputStateType.String];
    }
  }
}

export class SaveNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    filename: string = 'output.txt',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Save', NodeType.Save, 1, 0, coordinates, NodeRunType.None, {
      filename: {
        type: NodePropertyType.String,
        label: 'Filename',
        value: filename,
        editable: true,
        displayed: true,
      },
      status: {
        type: NodePropertyType.String,
        label: 'Status',
        value: '',
        editable: false,
        displayed: true,
      }
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new SaveNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.filename.value as string,
      object.outputState
    );
  }

  async _run(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
    const inputText = inputValues[0]?.stringValue;
    if (!inputText) {
      this.properties.status.value = 'No input to save';
      return defaultOutputStates[OutputStateType.String];
    }

    try {
      const blob = new Blob([inputText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = this.properties.filename.value as string;

      // Using click() directly is cleaner than appendChild/removeChild
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Cleanup can happen on next tick to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 0);

      this.properties.status.value = 'File saved successfully';
    } catch (error) {
      console.error('Error saving file:', error);
      this.properties.status.value = `Error saving file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return defaultOutputStates[OutputStateType.String];
  }
}

export class MergeNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    separator: string = ' ',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Merge', NodeType.Merge, 2, 1, coordinates, NodeRunType.Run, {
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new MergeNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.properties.separator.value as string, object.outputState);
  }

  _run(inputValues: (OutputState | null)[]): OutputState[] {
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

    return [{
      stringValue: mergedResult,
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

// There can only be one view node
// Connect an output port to the view node to display the output in the OutputView
export class ViewNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
  ) {
    super(id, authorId, projectId, 'View', NodeType.View, 1, 0, coordinates, NodeRunType.None, {
      content: {
        type: NodePropertyType.String,
        label: 'Content',
        value: '',
        editable: false,
        displayed: false,
      },
    });
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new ViewNode(object.nodeId, object.authorId, object.projectId, object.coordinates);
  }

  // View Node just passes through the input to the output
  _run(inputValues: (OutputState | null)[]): OutputState[] {
    return [{
      stringValue: inputValues[0]?.stringValue as string || '',
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

export class SplitNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    separator: string = ' ',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Split', NodeType.Split, 1, 2, coordinates, NodeRunType.Run, {
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new SplitNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.properties.separator.value as string, object.outputState);
  }

  _run(inputValues: (OutputState | null)[]): OutputState[] {
    // Split the input text into two parts
    const separator = this.properties.separator.value as string;
    const inputText = inputValues[0]?.stringValue as string;
    if (!inputText) {
      return defaultOutputStates[OutputStateType.String];
    }

    const parts = inputText.split(separator);
    // Join all the parts from the second to the end
    const remainingParts = parts.slice(1).join(separator);
    return [{
      stringValue: parts[0],
      numberValue: null,
      stringArrayValue: null,
    }, {
      stringValue: remainingParts,
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

export class FileNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    filename: string = '',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'File', NodeType.File, 0, 1, coordinates, NodeRunType.Source, {
      filename: {
        type: NodePropertyType.String,
        label: 'Filename',
        value: filename,
        editable: false,
        displayed: true,
      },
      file: {
        type: NodePropertyType.File,
        label: 'File',
        value: '',
        editable: false,
        displayed: true,
      }
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new FileNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.filename.value as string,
      object.outputState
    );
  }

  _run(inputValues: (OutputState | null)[]): OutputState[] {
    return this.outputState;
  }

  // Kind of unusual behavior to have the input computed here instead of '_run',
  // but I don't want to save the File object to a property so 'runNode' can access it later.
  async handleFileSelect(file: File) {
    this.outputState[0] = {
      stringValue: await file.text(),
      numberValue: null,
      stringArrayValue: null,
    };
    this.properties.filename.value = file.name;
  }
}

export class EditNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    content: string = '',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Edit', NodeType.Edit, 1, 1, coordinates, NodeRunType.Cache, {
      content: {
        type: NodePropertyType.String,
        label: 'Content',
        value: content,
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new EditNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.content.value as string,
      object.outputState
    );
  }

  _run(inputValues: (OutputState | null)[]): OutputState[] {
    if (!inputValues[0]) {
      return defaultOutputStates[OutputStateType.String];
    }

    this.properties.content.value = inputValues[0].stringValue as string;
    return [{
      stringValue: this.properties.content.value as string,
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

export class EmbedNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    chunkSize: number = 100,
    overlap: number = 20,
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Embed', NodeType.Embed, 1, 1, coordinates, NodeRunType.Cache, {
      documentId: {
        type: NodePropertyType.String,
        label: 'Document ID',
        value: '',
        editable: false,
        displayed: true,
      },
      chunkSize: {
        type: NodePropertyType.Number,
        label: 'Chunk Size',
        value: chunkSize,
        editable: true,
        displayed: true,
      },
      overlap: {
        type: NodePropertyType.Number,
        label: 'Overlap',
        value: overlap,
        editable: true,
        displayed: true,
      },
      status: {
        type: NodePropertyType.String,
        label: 'Status',
        value: '',
        editable: false,
        displayed: true,
      }
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new EmbedNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.chunkSize.value as number,
      object.properties.overlap.value as number,
      object.outputState
    );
  }

  async _run(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
    if (!inputValues[0]?.stringValue) return defaultOutputStates[OutputStateType.String];

    try {
      this.properties.status.value = 'Processing...';

      const response = await fetch(`${SERVER_URL}/api/embed`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: inputValues[0].stringValue,
          chunk_size: this.properties.chunkSize.value as number,
          chunk_overlap: this.properties.overlap.value as number,
        }),
      });

      if (!response.ok) {
        this.properties.status.value = `Error: ${response.statusText}`;
        return defaultOutputStates[OutputStateType.String];
      }

      const result = await response.json();
      if (result.status === 'error') {
        this.properties.status.value = `Error: ${result.error}`;
        return defaultOutputStates[OutputStateType.String];
      }

      // Set success status with chunk count
      this.properties.documentId.value = result.document_id;
      this.properties.status.value = `Success: Created ${result.num_embeddings} embeddings`;

      // Pass on the document ID to the next node
      return [{
        stringValue: this.properties.documentId.value as string,
        numberValue: null,
        stringArrayValue: null,
      }];
    } catch (error: unknown) {
      console.error('Error in EmbedNode:', error);
      this.properties.status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.properties.documentId.value = '';
      return defaultOutputStates[OutputStateType.String];
    }
  }
}

export class SearchNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    outputState: OutputState[] = [],
  ) {
    // Actually this is not expensive and perhaps should be a Run node. But that's just because
    // we currently use a pretty low-dimension embedding model.
    super(id, authorId, projectId, 'Search', NodeType.Search, 1, 1, coordinates, NodeRunType.Cache, {
      documentId: {
        type: NodePropertyType.String,
        label: 'Document ID',
        value: '',
        editable: false,
        displayed: true,
      },
      status: {
        type: NodePropertyType.String,
        label: 'Status',
        value: '',
        editable: false,
        displayed: true,
      },
      query: {
        type: NodePropertyType.String,
        label: 'Query',
        value: '',
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new SearchNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.outputState
    );
  }

  async _run(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
    if (!inputValues[0]?.stringValue) return defaultOutputStates[OutputStateType.StringArray];

    this.properties.documentId.value = inputValues[0].stringValue as string;
    try {
      this.properties.status.value = 'Searching...';

      const aiResponse = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: this.properties.documentId.value as string,
          query: this.properties.query.value as string,
          top_k: 3
        }),
      });

      if (!aiResponse.ok) {
        this.properties.status.value = `Error: ${aiResponse.statusText}`;
        return defaultOutputStates[OutputStateType.StringArray];
      }

      const result = await aiResponse.json();
      this.properties.status.value = `Found ${result.search_results.length} results`;

      // Output the results as a string array
      return [{
        stringValue: null,
        numberValue: null,
        stringArrayValue: result.search_results,
      }];
    } catch (error: unknown) {
      console.error('Error in SearchNode:', error);
      this.properties.status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return defaultOutputStates[OutputStateType.StringArray];
    }
  }
}

export class JoinNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    separator: string = '\n',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Join', NodeType.Join, 1, 1, coordinates, NodeRunType.Run, {
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new JoinNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.separator.value as string,
      object.outputState
    );
  }

  _run(inputValues: (OutputState | null)[]): OutputState[] {
    if (!inputValues[0]?.stringArrayValue) {
      return defaultOutputStates[OutputStateType.String];
    }

    // Join the array elements with the separator
    const joinedString = inputValues[0].stringArrayValue.join(
      this.properties.separator.value as string
    );

    return [{
      stringValue: joinedString,
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

// Write a Replace node that finds and replaces all elements of a string in an input
export class ReplaceNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Replace', NodeType.Replace, 1, 1, coordinates, NodeRunType.Run, {
      search: {
        type: NodePropertyType.String,
        label: 'Search',
        value: '',
        editable: true,
        displayed: true,
      },
      replace: {
        type: NodePropertyType.String,
        label: 'Replace',
        value: '',
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new ReplaceNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.outputState
    );
  }

  _run(inputValues: (OutputState | null)[]): OutputState[] {
    if (!inputValues[0]?.stringValue) return defaultOutputStates[OutputStateType.String];

    const search = this.properties.search.value as string;
    const replace = this.properties.replace.value as string;

    const replacedString = inputValues[0].stringValue.replaceAll(search, replace);

    return [{
      stringValue: replacedString,
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

type LLMResponse = {
  status: 'success' | 'error';
  result: string;
  error?: string;
}

