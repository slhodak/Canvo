import {
  BaseNode,
  NodeType,
  NodeRunType,
  SyncNode,
  AsyncNode,
  OutputState,
  Coordinates,
  OutputStateType,
  defaultOutputStates
} from '../../shared/types/src/models/node';
import { SERVER_URL } from './constants';

// cache-expensive: run methods will return their outputs, and only cache them as a side effect if and only if the node does not run automatically
export class TextNode extends BaseNode implements SyncNode {
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
  run(inputValues: (OutputState | null)[]): OutputState[] {
    if (!this.isDirty) return defaultOutputStates[OutputStateType.String];

    console.debug('Running TextNode:', this.nodeId);

    // Cache because this is a source node
    this.outputState[0] = {
      stringValue: this.properties.text.value as string,
      numberValue: null,
      stringArrayValue: null,
    };

    this.setClean();
    return this.outputState;
  }
}

export class PromptNode extends BaseNode implements AsyncNode {
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
        type: 'string',
        label: 'Prompt',
        value: prompt,
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new PromptNode(
      object.nodeId, object.authorId, object.projectId, object.coordinates,
      object.properties.prompt.value as string, object.outputState);
  }

  async asyncRun(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
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
        this.outputState[0] = {
          stringValue: data.result,
          numberValue: null,
          stringArrayValue: null,
        };
        return this.outputState;
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

export class SaveNode extends BaseNode implements AsyncNode {
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
        type: 'string',
        label: 'Filename',
        value: filename,
        editable: true,
        displayed: true,
      },
      status: {
        type: 'string',
        label: 'Status',
        value: '',
        editable: false,
        displayed: true,
      }
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new SaveNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.filename.value as string,
      object.outputState
    );
  }

  async asyncRun(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
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

export class MergeNode extends BaseNode implements SyncNode {
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
        type: 'string',
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new MergeNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.properties.separator.value as string, object.outputState);
  }

  run(inputValues: (OutputState | null)[]): OutputState[] {
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
export class ViewNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
  ) {
    super(id, authorId, projectId, 'View', NodeType.View, 1, 0, coordinates, NodeRunType.None, {
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

  // View Node just passes through the input to the output
  run(inputValues: (OutputState | null)[]): OutputState[] {
    return [{
      stringValue: inputValues[0]?.stringValue as string || '',
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

export class SplitNode extends BaseNode implements SyncNode {
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
        type: 'string',
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new SplitNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.properties.separator.value as string, object.outputState);
  }

  run(inputValues: (OutputState | null)[]): OutputState[] {
    // Split the input text into two parts
    const separator = this.properties.separator.value as string;
    const inputText = inputValues[0]?.stringValue as string;
    if (!inputText) {
      return defaultOutputStates[OutputStateType.String];
    }

    const parts = inputText.split(separator);
    // Join all the parts from the second to the end
    const remainingParts = parts.slice(1).join(separator);
    this.outputState[0] = {
      stringValue: parts[0],
      numberValue: null,
      stringArrayValue: null,
    };
    this.outputState[1] = {
      stringValue: remainingParts,
      numberValue: null,
      stringArrayValue: null,
    };

    return this.outputState;
  }
}

export class FileNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    content: string = '',
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'File', NodeType.File, 0, 1, coordinates, NodeRunType.Source, {
      content: {
        type: 'string',
        label: 'Content',
        value: content,
        editable: false,
        displayed: true,
      },
      filename: {
        type: 'string',
        label: 'Filename',
        value: '',
        editable: false,
        displayed: true,
      }
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new FileNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.content.value as string,
      object.outputState
    );
  }

  run(inputValues: (OutputState | null)[]): OutputState[] {
    this.outputState[0] = {
      stringValue: this.properties.content.value as string,
      numberValue: null,
      stringArrayValue: null,
    };

    return this.outputState;
  }

  async handleFileSelect(file: File) {
    const content = await file.text();
    this.properties.content.value = content;
    this.properties.filename.value = file.name;
    this.setDirty();
    this.run([]);
  }
}

export class EditNode extends BaseNode implements SyncNode {
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
        type: 'string',
        label: 'Content',
        value: content,
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new EditNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.content.value as string,
      object.outputState
    );
  }

  run(inputValues: (OutputState | null)[]): OutputState[] {
    // If there's no input or the node isn't dirty, don't update the content
    if (!inputValues[0] && !this.isDirty) return defaultOutputStates[OutputStateType.String];

    // If there's new input and the content hasn't been edited yet, copy the input
    if (inputValues[0] && !this.isDirty) {
      this.properties.content.value = inputValues[0].stringValue as string;
    }

    // Cache the output because this is a cache node
    this.outputState[0] = {
      stringValue: this.properties.content.value as string,
      numberValue: null,
      stringArrayValue: null,
    };

    this.setClean();
    return this.outputState;
  }
}

export class EmbedNode extends BaseNode implements AsyncNode {
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
      chunkSize: {
        type: 'number',
        label: 'Chunk Size',
        value: chunkSize,
        editable: true,
        displayed: true,
      },
      overlap: {
        type: 'number',
        label: 'Overlap',
        value: overlap,
        editable: true,
        displayed: true,
      },
      status: {
        type: 'string',
        label: 'Status',
        value: '',
        editable: false,
        displayed: true,
      }
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
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

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;

    while (i < text.length) {
      // Get chunk with specified size
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);

      // Move forward by chunkSize - overlap
      i += chunkSize - overlap;
    }

    return chunks;
  }

  async asyncRun(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
    if (!inputValues[0]?.stringValue) return defaultOutputStates[OutputStateType.StringArray];

    try {
      this.properties.status.value = 'Processing...';

      const chunks = this.chunkText(
        inputValues[0].stringValue,
        this.properties.chunkSize.value as number,
        this.properties.overlap.value as number
      );

      const response = await fetch(`${SERVER_URL}/api/embed`, {
        method: 'POST',
        credentials: 'include', // Important for sending auth cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chunks }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Set success status with chunk count
      this.properties.status.value = `Success: Created ${chunks.length} embeddings`;

      // Output the chunks array
      this.outputState[0] = {
        stringValue: null,
        numberValue: null,
        stringArrayValue: chunks,
      };

      return this.outputState;
    } catch (error: unknown) {
      console.error('Error in EmbedNode:', error);
      this.properties.status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      // Clear output on error
      this.outputState = defaultOutputStates[OutputStateType.StringArray];
      return this.outputState;
    }
  }
}

export class SearchNode extends BaseNode implements AsyncNode {
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
      status: {
        type: 'string',
        label: 'Status',
        value: '',
        editable: false,
        displayed: true,
      },
      query: {
        type: 'string',
        label: 'Query',
        value: '',
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new SearchNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.outputState
    );
  }

  async asyncRun(inputValues: (OutputState | null)[]): Promise<OutputState[]> {
    try {
      this.properties.status.value = 'Searching...';

      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: this.properties.query.value as string,
          top_k: 3
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Extract snippets from results
      const chunks = result.results.map((r: { chunk: string }) => r.chunk);

      this.properties.status.value = `Found ${chunks.length} results`;

      // Output the results as a string array
      this.outputState[0] = {
        stringValue: null,
        numberValue: null,
        stringArrayValue: chunks,
      };

      return this.outputState;
    } catch (error: unknown) {
      console.error('Error in SearchNode:', error);
      this.properties.status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      // Clear output on error
      this.outputState = defaultOutputStates[OutputStateType.StringArray];
      return this.outputState;
    }
  }
}

export class JoinNode extends BaseNode implements SyncNode {
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
        type: 'string',
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new JoinNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.properties.separator.value as string,
      object.outputState
    );
  }

  run(inputValues: (OutputState | null)[]): OutputState[] {
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
export class ReplaceNode extends BaseNode implements SyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    outputState: OutputState[] = [],
  ) {
    super(id, authorId, projectId, 'Replace', NodeType.Replace, 1, 1, coordinates, NodeRunType.Run, {
      search: {
        type: 'string',
        label: 'Search',
        value: '',
        editable: true,
        displayed: true,
      },
      replace: {
        type: 'string',
        label: 'Replace',
        value: '',
        editable: true,
        displayed: true,
      }
    }, outputState);
  }

  public static fromObject(object: BaseNode): BaseNode {
    return new ReplaceNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.outputState
    );
  }

  run(inputValues: (OutputState | null)[]): OutputState[] {
    if (!inputValues[0]?.stringValue) return defaultOutputStates[OutputStateType.String];

    const search = this.properties.search.value as string;
    const replace = this.properties.replace.value as string;

    const replacedString = inputValues[0].stringValue.replace(search, replace);

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

