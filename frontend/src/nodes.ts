import {
  NodeType,
  NodeRunType,
  BaseNode,
  BaseSyncNode,
  BaseAsyncNode,
  IOState,
  Coordinates,
  IOStateType,
  NodePropertyType,
  NodeCacheType,
} from '../../shared/types/src/models/node';
import { LLMResponse } from '../../shared/types/src/models/LLMResponse';
import { updateNode } from './api';
import { SERVER_URL } from './constants';
import mammoth from 'mammoth';
import { FileUtils as fu } from './Utils';

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
    super(id, authorId, projectId, 'Text', label, display, NodeType.Text, 0, 1, coordinates, NodeRunType.Auto, NodeCacheType.Cache, {
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
      object.outputState.map(IOState.fromObject),
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  public override setProperty(key: string, value: string | number) {
    this.properties[key].value = value;
    this.outputState = [new IOState({ stringValue: value as string })];
    updateNode(this);
  }

  // Every node accepts an array of input values, but sometimes that array is empty
  _run(inputValues: IOState[]): IOState[] {
    return [new IOState({ stringValue: this.properties.text.value as string })];
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
    super(id, authorId, projectId, 'Fetch', label, display, NodeType.Fetch, 0, 1, coordinates, NodeRunType.Auto, NodeCacheType.Cache, {
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
      object.outputState.map(IOState.fromObject),
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  async _run(inputValues: IOState[]): Promise<IOState[]> {
    const url = this.properties.url.value as string;
    if (!url) {
      console.warn(`Will not run FetchNode, no URL provided for node ${this.nodeId}`);
      return [IOState.ofType(IOStateType.String)];
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
      return [new IOState({ stringValue: data.text })];
    } else {
      console.error('Error running fetch:', data.error);
      return [IOState.ofType(IOStateType.String)];
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
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    super(id, authorId, projectId, 'Prompt', label, display, NodeType.Prompt, 1, 1, coordinates, NodeRunType.Manual, NodeCacheType.Cache, {
      prompt: {
        type: NodePropertyType.String,
        label: 'Prompt',
        value: prompt,
        editable: true,
        displayed: true,
      }
    }, [IOStateType.String], outputState, indexSelections);
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
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  async _run(inputValues: IOState[]): Promise<IOState[]> {
    if (!inputValues[0]) return [IOState.ofType(IOStateType.String)];

    if (!this.properties.prompt.value || this.properties.prompt.value === '') {
      console.warn("Will not run PromptNode without a prompt", this.nodeId);
      return [IOState.ofType(IOStateType.String)];
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
        return [new IOState({ stringValue: data.result })];
      } else {
        console.error('Error running prompt:', data.error);
        return [IOState.ofType(IOStateType.String)];
      }
    } catch (error) {
      console.error('Error running prompt:', error);
      return [IOState.ofType(IOStateType.String)];
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
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    super(id, authorId, projectId, 'Save', label, display, NodeType.Save, 1, 0, coordinates, NodeRunType.Manual, NodeCacheType.NoCache, {
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
    }, [IOStateType.String], outputState, indexSelections);
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
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [];
  }

  async _run(inputValues: IOState[]): Promise<IOState[]> {
    const inputText = inputValues[0]?.stringValue;
    if (!inputText) {
      this.properties.status.value = 'No input to save';
      return [IOState.ofType(IOStateType.String)];
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

    return [IOState.ofType(IOStateType.String)];
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
    outputState: IOState[] = [IOState.ofType(IOStateType.String), IOState.ofType(IOStateType.String)],
    indexSelections: (number | null)[] = [null, null],
  ) {
    super(id, authorId, projectId, 'Merge', label, display, NodeType.Merge, 2, 1, coordinates, NodeRunType.Auto, NodeCacheType.NoCache, {
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
    }, [IOStateType.String, IOStateType.String], outputState, indexSelections);
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
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  _run(inputValues: IOState[]): IOState[] {
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

    return [new IOState({ stringValue: mergedResult })];
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
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    super(id, authorId, projectId, 'Split', label, display, NodeType.Split, 1, 1, coordinates, NodeRunType.Auto, NodeCacheType.NoCache, {
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
    }, [IOStateType.String], outputState, indexSelections);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new SplitNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.separator.value as string,
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.StringArray)];
  }

  _run(inputValues: IOState[]): IOState[] {
    // Split the input text into two parts
    const separator = this.properties.separator.value as string;
    const inputText = inputValues[0]?.stringValue as string;
    if (!inputText) {
      return [IOState.ofType(IOStateType.StringArray)];
    }

    const parts = inputText.split(separator);
    return [new IOState({ stringArrayValue: parts })];
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
    outputState: IOState[] = [],
  ) {
    super(id, authorId, projectId, 'File', label, display, NodeType.File, 0, 1, coordinates, NodeRunType.None, NodeCacheType.Cache, {
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
      object.outputState.map(IOState.fromObject),
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  _run(inputValues: IOState[]): IOState[] {
    return this.outputState;
  }

  // Kind of unusual behavior to have the input computed here instead of '_run',
  // but I don't want to save the File object to a property so 'runNode' can access it later.
  async handleFileSelect(file: File) {
    this.properties.filename.value = file.name;
    // Convert Word docx to html 
    if (file.type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        this.outputState[0] = new IOState({
          stringValue: result.value,
        });
      } catch (error) {
        console.error('Error converting Word docx to html:', error);
        this.outputState[0] = new IOState({
          stringValue: 'Error converting Word docx to html',
        });
        this.properties.filename.value = '';
      }
    } else if (file.type == 'text/plain') {
      this.outputState[0] = new IOState({
        stringValue: await file.text(),
      });
    } else {
      const extension = file.name.split('.').pop();
      if (extension && fu.textFileExtensions.includes(extension.toLowerCase())) {
        const result = await file.text();
        this.outputState[0] = new IOState({
          stringValue: result,
        });
      } else {
        console.warn('Unsupported file type:', file.type);
        this.outputState[0] = new IOState({
          stringValue: 'Unsupported file type',
        });
      }
    }
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
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    super(id, authorId, projectId, 'Edit', label, display, NodeType.Edit, 1, 1, coordinates, NodeRunType.Manual, NodeCacheType.Cache, {
      content: {
        type: NodePropertyType.String,
        label: 'Content',
        value: content,
        editable: true,
        displayed: true,
      }
    }, [IOStateType.String], outputState, indexSelections);
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
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  _run(inputValues: IOState[]): IOState[] {
    if (!inputValues[0]) {
      return [IOState.ofType(IOStateType.String)];
    }

    const content = inputValues[0].stringValue as string;
    if (!content) {
      return [IOState.ofType(IOStateType.String)];
    }

    this.properties.content.value = content;
    return [new IOState({ stringValue: content })];
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
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    super(id, authorId, projectId, 'Embed', label, display, NodeType.Embed, 1, 1, coordinates, NodeRunType.Manual, NodeCacheType.Cache, {
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
    }, [IOStateType.String], outputState, indexSelections);
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
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  async _run(inputValues: IOState[]): Promise<IOState[]> {
    if (!inputValues[0]?.stringValue) return [IOState.ofType(IOStateType.String)];

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
        return [IOState.ofType(IOStateType.String)];
      }

      const result = await response.json();
      if (result.status === 'failed') {
        this.properties.status.value = `Error: ${result.error}`;
        return [IOState.ofType(IOStateType.String)];
      }

      // Set success status with chunk count
      this.properties.documentId.value = result.document_id;
      this.properties.status.value = result.message;

      // Pass on the document ID to the next node
      const outputState = [new IOState({ stringValue: this.properties.documentId.value as string })];
      updateNode(this);
      return outputState;
    } catch (error: unknown) {
      console.error('Error in EmbedNode:', error);
      this.properties.status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.properties.documentId.value = '';
      return [IOState.ofType(IOStateType.String)];
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
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    // Actually this is not expensive and perhaps should be a Run node. But that's just because
    // we currently use a pretty low-dimension embedding model.
    super(id, authorId, projectId, 'Search', label, display, NodeType.Search, 1, 1, coordinates, NodeRunType.Manual, NodeCacheType.Cache, {
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
    }, [IOStateType.String], outputState, indexSelections);
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
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.StringArray)];
  }

  async _run(inputValues: IOState[]): Promise<IOState[]> {
    if (!inputValues[0]?.stringValue) return [IOState.ofType(IOStateType.StringArray)];

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
        return [IOState.ofType(IOStateType.StringArray)];
      }

      const result = await aiResponse.json();
      this.properties.status.value = `Found ${result.search_results.length} results`;
      updateNode(this);

      // Output the results as a string array
      return [new IOState({ stringArrayValue: result.search_results })];
    } catch (error: unknown) {
      console.error('Error in SearchNode:', error);
      this.properties.status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return [IOState.ofType(IOStateType.StringArray)];
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
    outputState: IOState[] = [],
  ) {
    super(id, authorId, projectId, 'Join', label, display, NodeType.Join, 1, 1, coordinates, NodeRunType.Auto, NodeCacheType.NoCache, {
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
      object.outputState.map(IOState.fromObject),
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.StringArray)];
  }

  _run(inputValues: IOState[]): IOState[] {
    if (!inputValues[0]?.stringArrayValue) {
      return [IOState.ofType(IOStateType.StringArray)];
    }

    // Join the array elements with the separator
    const joinedString = inputValues[0].stringArrayValue.join(
      this.properties.separator.value as string
    );

    return [new IOState({ stringValue: joinedString })];
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
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    super(id, authorId, projectId, 'Replace', label, display, NodeType.Replace, 1, 1, coordinates, NodeRunType.Auto, NodeCacheType.NoCache, {
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
    }, [IOStateType.String], outputState, indexSelections);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new ReplaceNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  _run(inputValues: IOState[]): IOState[] {
    if (!inputValues[0]?.stringValue) return [IOState.ofType(IOStateType.String)];

    const search = this.properties.search.value as string;
    const replace = this.properties.replace.value as string;

    const replacedString = inputValues[0].stringValue.replaceAll(search, replace);

    return [new IOState({ stringValue: replacedString })];
  }
}

// The Pick node chooses an element from an array to copy to its string output
export class PickNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'pick',
    display: boolean = false,
    index: number = 0,
    outputState: IOState[] = [],
  ) {
    super(id, authorId, projectId, 'Pick', label, display, NodeType.Pick, 1, 1, coordinates, NodeRunType.Auto, NodeCacheType.NoCache, {
      index: {
        type: NodePropertyType.Number,
        label: 'Index',
        value: index,
        editable: true,
        displayed: true,
      }
    }, [IOStateType.StringArray], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new PickNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.index.value as number,
      object.outputState.map(IOState.fromObject),
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  _run(inputValues: IOState[]): IOState[] {
    if (!inputValues[0]?.stringArrayValue) return [IOState.ofType(IOStateType.String)];

    const index = this.properties.index.value as number;
    const pickedString = inputValues[0].stringArrayValue[index];

    return [new IOState({ stringValue: pickedString })];
  }
}

// The Cache node just caches its input values (just string for now)
export class CacheNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'cache',
    display: boolean = false,
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    super(id, authorId, projectId, 'Cache', label, display, NodeType.Cache, 1, 1, coordinates, NodeRunType.Manual, NodeCacheType.Cache, {
      updatedAt: {
        type: NodePropertyType.String,
        label: 'Last Updated',
        value: 'Never',
        editable: false,
        displayed: true,
      }
    }, [IOStateType.String], outputState, indexSelections);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new CacheNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  _run(inputValues: IOState[]): IOState[] {
    this.properties.updatedAt.value = new Date().toLocaleString();
    return inputValues;
  }
}

// The CSV node reads a file and converts it to a 2d array
export class CSVNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'csv',
    display: boolean = false,
    filename: string = '',
    separator: string = ',',
    lineTerminator: string = '\n',
    outputState: IOState[] = [],
  ) {
    super(id, authorId, projectId, 'CSV', label, display, NodeType.CSV, 0, 1, coordinates, NodeRunType.Auto, NodeCacheType.Cache, {
      file: {
        type: NodePropertyType.File,
        label: 'File',
        value: '',
        editable: true,
        displayed: true,
      },
      filename: {
        type: NodePropertyType.String,
        label: 'Filename',
        value: filename,
        editable: false,
        displayed: true,
      },
      separator: {
        type: NodePropertyType.String,
        label: 'Separator',
        value: separator,
        editable: true,
        displayed: true,
      },
      lineTerminator: {
        type: NodePropertyType.String,
        label: 'Line Terminator',
        value: lineTerminator,
        editable: true,
        displayed: true,
      }
    }, [IOStateType.StringArray], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new CSVNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.filename.value as string,
      object.properties.separator.value as string,
      object.properties.lineTerminator.value as string,
      object.outputState.map(IOState.fromObject),
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.Table)];
  }

  _run(inputValues: IOState[]): IOState[] {
    return this.outputState;
  }

  async handleFileSelect(file: File) {
    const fileString = await file.text();
    // Convert the file string to a 2d array
    const rows = fileString.split(this.properties.lineTerminator.value as string);
    const result = rows.map(row => {
      // If the line has a trailing comma, remove it
      // But if the last column can be null, keep it. 
      // So far we have no way to tell if a column can be null, so for now assume it can't be
      if (row.endsWith(this.properties.separator.value as string)) {
        row = row.slice(0, -1);
      }
      return row.split(this.properties.separator.value as string);
    });
    this.outputState[0] = new IOState({
      tableValue: result,
    });
    this.properties.filename.value = file.name;
  }
}

// Computes statistics about a string. Outputs a table with the statistics.
// The input is a string, and the output is a table with the statistics.
// The statistics are:
// - Number of characters
// - Number of words
// - Number of sentences
// - Number of paragraphs
// - Number of bytes
// - Counts of words
// - Counts of characters
export class StatsNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'stats',
    display: boolean = false,
    outputState: IOState[] = [],
    indexSelections: (number | null)[] = [],
  ) {
    super(id, authorId, projectId, 'Stats', label, display, NodeType.Stats, 1, 1, coordinates, NodeRunType.Auto, NodeCacheType.NoCache,
      {
        wordCounts: {
          type: NodePropertyType.Boolean,
          label: 'Count Words',
          value: false,
          editable: true,
          displayed: true,
        },
        characterCounts: {
          type: NodePropertyType.Boolean,
          label: 'Count Characters',
          value: false,
          editable: true,
          displayed: true,
        }
      },
      [IOStateType.String], outputState, indexSelections);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new StatsNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.outputState.map(IOState.fromObject),
      object.indexSelections
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.Table)];
  }

  _run(inputValues: IOState[]): IOState[] {
    const input = inputValues[0]?.stringValue;
    if (!input) return this.outputState;

    const basicStats = {
      characters: input.length,
      words: input.split(/\s+/).filter(Boolean).length,
      sentences: input.split(/[.!?]/).filter(Boolean).length,
      paragraphs: input.split(/\n\n/).filter(Boolean).length,
      bytes: new TextEncoder().encode(input).length,
    }

    const statsTable = []
    statsTable.push(['Basic Stats']);
    for (const [key, value] of Object.entries(basicStats)) {
      statsTable.push([key, value.toString()]);
    }

    const counts = {
      word: {} as Record<string, number>,
      character: {} as Record<string, number>,
    }
    if (this.properties.wordCounts.value === true) {
      counts.word = input.split(/\s+/).filter(Boolean).reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
      // Sort by frequency (descending)
      counts.word = Object.fromEntries(
        Object.entries(counts.word).sort(([, a], [, b]) => b - a)
      );
      statsTable.push(['Word Counts']);
      for (const [key, value] of Object.entries(counts.word)) {
        statsTable.push([key, value.toString()]);
      }
    }

    if (this.properties.characterCounts.value === true) {
      counts.character = input.split('').reduce((acc, char) => {
        const displayChar = char === ' ' ? 'Space' : char === '\n' ? 'Newline' : char;
        acc[displayChar] = (acc[displayChar] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
      // Sort by frequency (descending) 
      counts.character = Object.fromEntries(
        Object.entries(counts.character).sort(([, a], [, b]) => b - a)
      );
      statsTable.push(['Character Counts']);
      for (const [key, value] of Object.entries(counts.character)) {
        statsTable.push([key, value.toString()]);
      }
    }

    return [new IOState({ tableValue: statsTable })];
  }
}

// The Chat node allows the user to chat with a model
// It has a parameter for the current prompt/user input
// Output is whole history of the chat, to which new prompts and responses are added on the completion of each run
export class ChatNode extends BaseAsyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'chat',
    display: boolean = false,
    prompt: string = '',
    brevity: boolean = false,
    outputState: IOState[] = [],
  ) {
    super(id, authorId, projectId, 'Chat', label, display, NodeType.Chat, 0, 1, coordinates, NodeRunType.Manual, NodeCacheType.Cache, {
      prompt: {
        type: NodePropertyType.String,
        label: 'Prompt',
        value: prompt,
        editable: true,
        displayed: true,
      },
      brevity: {
        type: NodePropertyType.Boolean,
        label: 'Short Responses',
        value: brevity,
        editable: true,
        displayed: true,
      }
    }, [], outputState);
  }

  public static override fromObject(object: BaseNode): BaseNode {
    return new ChatNode(
      object.nodeId,
      object.authorId,
      object.projectId,
      object.coordinates,
      object.label,
      object.display,
      object.properties.prompt.value as string,
      object.properties.brevity.value as boolean,
      object.outputState.map(IOState.fromObject),
    );
  }

  protected override resetOutputState(): void {
    this.outputState = [IOState.ofType(IOStateType.String)];
  }

  // Call the LLM with the current prompt and add the response to the history
  async _run(inputValues: IOState[]): Promise<IOState[]> {
    const prompt = this.properties.prompt.value as string;
    if (prompt === '') return this.outputState;

    try {
      const response = await fetch(`${SERVER_URL}/ai/chat`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: this.projectId,
          nodeId: this.nodeId,
          prompt,
          brevity: this.properties.brevity.value as boolean,
        }),
      });

      const data: LLMResponse = await response.json();
      if (!this.outputState[0]) {
        this.outputState[0] = new IOState({ stringValue: '' });
      }
      this.properties.prompt.value = '';
      this.outputState[0].appendString(this.formatResponse(prompt, data.result));
      // Set to a new object so the OutputView understands that the output state has changed
      this.outputState[0] = new IOState({ stringValue: this.outputState[0].stringValue });
      return this.outputState;
    } catch (error) {
      console.error('Error in ChatNode:', error);
      return this.outputState;
    }
  }

  private formatResponse(prompt: string, response: string): string {
    return `USER>\n${prompt}\n\nSYSTEM>\n${response}\n\n`;
  }
}
