import {
  NodeType,
  NodeRunType,
  BaseNode,
  BaseSyncNode,
  BaseAsyncNode,
  IOState,
  Coordinates,
  IOStateType,
  defaultIOStates,
  NodePropertyType,
} from '../../shared/types/src/models/node';
import { LLMResponse } from '../../shared/types/src/models/LLMResponse';
import { updateNode } from './api';
import { SERVER_URL } from './constants';

export class TextNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'text',
    display: boolean = false,
    text: string = '',
    outputState: IOState[] = [],
  ) {
    super(id, authorId, projectId, 'Text', label, display, NodeType.Text, 0, 1, coordinates, NodeRunType.Source, {
      text: {
        type: NodePropertyType.String,
        label: 'Text',
        value: text,
        editable: true,
        displayed: true,
      },
    }, [], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new TextNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.text.value as string,
      object.outputState
    );
  }

  public override setProperty(key: string, value: string | number) {
    this.properties[key].value = value;
    this.outputState = [{
      stringValue: value as string,
      numberValue: null,
      stringArrayValue: null,
    }];
    updateNode(this.projectId, this);
  }

  // Every node accepts an array of input values, but sometimes that array is empty
  _run(inputValues: (IOState | null)[]): IOState[] {
    return [{
      stringValue: this.properties.text.value as string,
      numberValue: null,
      stringArrayValue: null,
    }];
  }
}

export class FetchNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'fetch',
    display: boolean = false,
    url: string = '',
    outputState: IOState[] = [],
  ) {
    super(id, authorId, projectId, 'Fetch', label, display, NodeType.Fetch, 0, 1, coordinates, NodeRunType.Cache, {
      url: {
        type: NodePropertyType.String,
        label: 'URL',
        value: url,
        editable: true,
        displayed: true,
      }
    }, [], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new FetchNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.url.value as string,
      object.outputState
    );
  }

  async _run(inputValues: (IOState | null)[]): Promise<IOState[]> {
    const url = this.properties.url.value as string;
    if (!url) {
      console.warn(`Will not run FetchNode, no URL provided for node ${this.nodeId}`);
      return [defaultIOStates[IOStateType.String]];
    }

    const response = await fetch(`${SERVER_URL}/api/run_fetch`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    if (data.status === 'success') {
      return [{
        stringValue: data.text,
        numberValue: null,
        stringArrayValue: null,
      }];
    } else {
      console.error('Error running fetch:', data.error);
      return [defaultIOStates[IOStateType.String]];
    }
  }
}

export class PromptNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'prompt',
    display: boolean = false,
    prompt: string = '',
    outputState: IOState[] = [defaultIOStates[IOStateType.String]],
  ) {
    super(id, authorId, projectId, 'Prompt', label, display, NodeType.Prompt, 1, 1, coordinates, NodeRunType.Cache, {
      prompt: {
        type: NodePropertyType.String,
        label: 'Prompt',
        value: prompt,
        editable: true,
        displayed: true,
      }
    }, [IOStateType.String], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new PromptNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.prompt.value as string,
      object.outputState
    );
  }

  async _run(inputValues: (IOState | null)[]): Promise<IOState[]> {
    if (!inputValues[0]) return [defaultIOStates[IOStateType.String]];

    if (!this.properties.prompt.value || this.properties.prompt.value === '') {
      return [defaultIOStates[IOStateType.String]];
    }

    // Call the LLM with the prompt and the input text
    try {
      const response = await fetch(`${SERVER_URL}/ai/run_prompt`, {
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
        return [defaultIOStates[IOStateType.String]];
      }
    } catch (error) {
      console.error('Error running prompt:', error);
      return [defaultIOStates[IOStateType.String]];
    }
  }
}

export class SaveNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'save',
    display: boolean = false,
    filename: string = 'output.txt',
    outputState: IOState[] = [defaultIOStates[IOStateType.String]],
  ) {
    super(id, authorId, projectId, 'Save', label, display, NodeType.Save, 1, 0, coordinates, NodeRunType.None, {
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
    }, [IOStateType.String], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new SaveNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.filename.value as string,
      object.outputState
    );
  }

  async _run(inputValues: (IOState | null)[]): Promise<IOState[]> {
    const inputText = inputValues[0]?.stringValue;
    if (!inputText) {
      this.properties.status.value = 'No input to save';
      return [defaultIOStates[IOStateType.String]];
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

    return [defaultIOStates[IOStateType.String]];
  }
}

export class MergeNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'merge',
    display: boolean = false,
    separator: string = ' ',
    outputState: IOState[] = [defaultIOStates[IOStateType.String], defaultIOStates[IOStateType.String]],
  ) {
    super(id, authorId, projectId, 'Merge', label, display, NodeType.Merge, 2, 1, coordinates, NodeRunType.Run, {
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
    }, [IOStateType.String, IOStateType.String], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new MergeNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.separator.value as string,
      object.outputState
    );
  }

  _run(inputValues: (IOState | null)[]): IOState[] {
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

export class SplitNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'split',
    display: boolean = false,
    separator: string = ' ',
    outputState: IOState[] = [defaultIOStates[IOStateType.StringArray]],
  ) {
    super(id, authorId, projectId, 'Split', label, display, NodeType.Split, 1, 1, coordinates, NodeRunType.Run, {
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
    }, [IOStateType.String], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new SplitNode(object.nodeId, object.authorId, object.projectId, object.coordinates, object.label, object.display, object.properties.separator.value as string, object.outputState);
  }

  _run(inputValues: (IOState | null)[]): IOState[] {
    // Split the input text into two parts
    const separator = this.properties.separator.value as string;
    const inputText = inputValues[0]?.stringValue as string;
    if (!inputText) {
      return [defaultIOStates[IOStateType.StringArray]];
    }

    const parts = inputText.split(separator);
    return [{
      stringValue: null,
      numberValue: null,
      stringArrayValue: parts,
    }];
  }
}

export class FileNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'file',
    display: boolean = false,
    filename: string = '',
    outputState: IOState[] = [defaultIOStates[IOStateType.String]],
  ) {
    super(id, authorId, projectId, 'File', label, display, NodeType.File, 0, 1, coordinates, NodeRunType.Source, {
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
    }, [], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new FileNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.filename.value as string,
      object.outputState
    );
  }

  _run(inputValues: (IOState | null)[]): IOState[] {
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
    label: string = 'edit',
    display: boolean = false,
    content: string = '',
    outputState: IOState[] = [defaultIOStates[IOStateType.String]],
  ) {
    super(id, authorId, projectId, 'Edit', label, display, NodeType.Edit, 1, 1, coordinates, NodeRunType.Cache, {
      content: {
        type: NodePropertyType.String,
        label: 'Content',
        value: content,
        editable: true,
        displayed: true,
      }
    }, [IOStateType.String], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new EditNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.content.value as string,
      object.outputState
    );
  }

  _run(inputValues: (IOState | null)[]): IOState[] {
    if (!inputValues[0]) {
      return [defaultIOStates[IOStateType.String]];
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
    label: string = 'embed',
    display: boolean = false,
    documentId: string = '',
    chunkSize: number = 100,
    overlap: number = 20,
    status: string = '',
    outputState: IOState[] = [defaultIOStates[IOStateType.String]],
  ) {
    super(id, authorId, projectId, 'Embed', label, display, NodeType.Embed, 1, 1, coordinates, NodeRunType.Cache, {
      documentId: {
        type: NodePropertyType.String,
        label: 'Document ID',
        value: documentId,
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
        value: status,
        editable: false,
        displayed: true,
      }
    }, [IOStateType.String], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new EmbedNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.documentId.value as string,
      object.properties.chunkSize.value as number,
      object.properties.overlap.value as number,
      object.properties.status.value as string,
      object.outputState
    );
  }

  async _run(inputValues: (IOState | null)[]): Promise<IOState[]> {
    if (!inputValues[0]?.stringValue) return [defaultIOStates[IOStateType.String]];

    try {
      this.properties.status.value = 'Processing...';

      const response = await fetch(`${SERVER_URL}/ai/embed`, {
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
        return [defaultIOStates[IOStateType.String]];
      }

      const result = await response.json();
      if (result.status === 'failed') {
        this.properties.status.value = `Error: ${result.error}`;
        return [defaultIOStates[IOStateType.String]];
      }

      // Set success status with chunk count
      this.properties.documentId.value = result.document_id;
      this.properties.status.value = result.message;

      // Pass on the document ID to the next node
      const outputState = [{
        stringValue: this.properties.documentId.value as string,
        numberValue: null,
        stringArrayValue: null,
      }];
      updateNode(this.projectId, this);
      return outputState;
    } catch (error: unknown) {
      console.error('Error in EmbedNode:', error);
      this.properties.status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.properties.documentId.value = '';
      return [defaultIOStates[IOStateType.String]];
    }
  }
}

export class SearchNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'search',
    display: boolean = false,
    query: string = '',
    documentId: string = '',
    status: string = '',
    neighbors: number = 0,
    results: number = 3,
    outputState: IOState[] = [defaultIOStates[IOStateType.StringArray]],
  ) {
    // Actually this is not expensive and perhaps should be a Run node. But that's just because
    // we currently use a pretty low-dimension embedding model.
    super(id, authorId, projectId, 'Search', label, display, NodeType.Search, 1, 1, coordinates, NodeRunType.Cache, {
      documentId: {
        type: NodePropertyType.String,
        label: 'Document ID',
        value: documentId,
        editable: false,
        displayed: true,
      },
      status: {
        type: NodePropertyType.String,
        label: 'Status',
        value: status,
        editable: false,
        displayed: true,
      },
      query: {
        type: NodePropertyType.String,
        label: 'Query',
        value: query,
        editable: true,
        displayed: true,
      },
      neighbors: {
        type: NodePropertyType.Number,
        label: 'Neighbors',
        value: neighbors,
        editable: true,
        displayed: true,
      },
      // This is number of results requested, not result information returned
      results: {
        type: NodePropertyType.Number,
        label: 'Results',
        value: results,
        editable: true,
        displayed: true,
      },
    }, [IOStateType.String], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new SearchNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.query.value as string,
      object.properties.documentId.value as string,
      object.properties.status.value as string,
      object.properties.neighbors.value as number,
      object.properties.results.value as number,
      object.outputState
    );
  }

  async _run(inputValues: (IOState | null)[]): Promise<IOState[]> {
    if (!inputValues[0]?.stringValue) return [defaultIOStates[IOStateType.StringArray]];

    this.properties.documentId.value = inputValues[0].stringValue as string;
    try {
      this.properties.status.value = 'Searching...';

      const aiResponse = await fetch(`${SERVER_URL}/ai/search`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: this.properties.documentId.value as string,
          query: this.properties.query.value as string,
          top_k: this.properties.results.value as number,
          neighbors: this.properties.neighbors.value as number,
        }),
      });

      if (!aiResponse.ok) {
        this.properties.status.value = `Error: ${aiResponse.statusText}`;
        return [defaultIOStates[IOStateType.StringArray]];
      }

      const result = await aiResponse.json();
      this.properties.status.value = `Found ${result.search_results.length} results`;
      updateNode(this.projectId, this);

      // Output the results as a string array
      return [{
        stringValue: null,
        numberValue: null,
        stringArrayValue: result.search_results,
      }];
    } catch (error: unknown) {
      console.error('Error in SearchNode:', error);
      this.properties.status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return [defaultIOStates[IOStateType.StringArray]];
    }
  }
}

export class JoinNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'join',
    display: boolean = false,
    separator: string = '\n',
    outputState: IOState[] = [defaultIOStates[IOStateType.StringArray]],
  ) {
    super(id, authorId, projectId, 'Join', label, display, NodeType.Join, 1, 1, coordinates, NodeRunType.Run, {
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      }
    }, [IOStateType.StringArray], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new JoinNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.separator.value as string,
      object.outputState
    );
  }

  _run(inputValues: (IOState | null)[]): IOState[] {
    if (!inputValues[0]?.stringArrayValue) {
      return [defaultIOStates[IOStateType.StringArray]];
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
    label: string = 'replace',
    display: boolean = false,
    outputState: IOState[] = [defaultIOStates[IOStateType.String]],
  ) {
    super(id, authorId, projectId, 'Replace', label, display, NodeType.Replace, 1, 1, coordinates, NodeRunType.Run, {
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
    }, [IOStateType.String], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new ReplaceNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.outputState
    );
  }

  _run(inputValues: (IOState | null)[]): IOState[] {
    if (!inputValues[0]?.stringValue) return [defaultIOStates[IOStateType.String]];

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

