import {
  NodePropertyType,
  IOState,
  IOStateType,
  BaseSyncNode,
  Coordinates,
  NodeType,
  NodeRunType,
  NodeCacheType,
  BaseNode,
  NodePropertyValue,
  NodeProperty,
} from "wc-shared";

export class SplitNode extends BaseSyncNode {
  constructor(
    id: string,
    authorId: string,
    projectId: string,
    coordinates: Coordinates,
    label: string = 'split',
    display: boolean = false,
    separator: string = '\n',
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
    super(id, authorId, projectId, 'Edit', label, display, NodeType.Edit, 1, 1, coordinates, NodeRunType.None, NodeCacheType.Cache, {
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

  public override runOnInput(): boolean { return true; }

  public override setProperty(key: string, value: NodePropertyValue) {
    if (key === 'content') {
      const content = value as string || '';
      this.properties[key].value = content;
      this.outputState = [new IOState({ stringValue: content })];
    } else {
      super.setProperty(key, value);
    }
  }

  public override onInputConnection(inputValues: IOState[], inputIndex: number) {
    // If the input value is an array, try to get the specified index to read from it
    const inputValue = inputValues[inputIndex] as IOState;
    let content = '';
    if (inputValue.type === IOStateType.StringArray) {
      const index = this.indexSelections[inputIndex] as number;
      if (index !== null) {
        content = inputValue.stringArrayValue?.[index] as string || '';
        this.setProperty('content', content);
      } else {
        console.debug(`No array index selected for array at input ${inputIndex}, will default to 0`);
        content = inputValue.stringArrayValue?.[0] as string || '';
        this.indexSelections[inputIndex] = 0;
        this.setProperty('content', content);
      }
    } else if (inputValue.type === IOStateType.String) {
      content = inputValue.stringValue as string || '';
      this.setProperty('content', content);
    }
    this.outputState = [new IOState({ stringValue: content })];
  }

  _run(inputValues: IOState[]): IOState[] {
    const content = this.properties.content.value as string || '';
    return [new IOState({ stringValue: content })];
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
