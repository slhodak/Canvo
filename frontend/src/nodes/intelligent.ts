import {
  NodeType,
  NodeRunType,
  BaseNode,
  BaseAsyncNode,
  IOState,
  Coordinates,
  IOStateType,
  NodePropertyType,
  NodeCacheType,
  LLMResponse,
  updateNode,
} from 'wc-shared';
import { SERVER_URL } from '../constants';

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
    messageHistory: Record<string, string>[] = [],
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
      },
      messageHistory: {
        type: NodePropertyType.ObjectArray,
        label: 'Message History',
        value: messageHistory,
        editable: false,
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
      object.properties.messageHistory.value as Record<string, string>[],
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

    const message = { role: 'user', name: 'user', content: prompt };
    const messageHistory = this.properties.messageHistory.value as Record<string, string>[];
    messageHistory.push(message);

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
          messages: messageHistory,
          brevity: this.properties.brevity.value as boolean,
        }),
      });

      const data: LLMResponse = await response.json();
      if (!this.outputState[0]) {
        this.outputState[0] = new IOState({ stringValue: '' });
      }
      this.properties.prompt.value = '';
      messageHistory.push({ role: 'assistant', name: 'assistant', content: data.result });
      // Set to a new object so the OutputView understands that the output state has changed
      this.outputState[0] = new IOState({ stringValue: this.formatChat(messageHistory) });
      return this.outputState;
    } catch (error) {
      console.error('Error in ChatNode:', error);
      return this.outputState;
    }
  }

  // Expensive, maybe, OK for now
  private formatChat(messages: Record<string, string>[]): string {
    let formatted = '';
    for (const message of messages) {
      if (message.role === 'user') {
        formatted += `USER>\n${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        formatted += `SYSTEM>\n${message.content}\n\n`;
      } else {
        continue;
      }
    }
    return formatted;
  }
}
