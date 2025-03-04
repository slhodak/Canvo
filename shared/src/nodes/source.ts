import {
  NodePropertyType,
  IOState,
  IOStateType,
  BaseSyncNode,
  BaseAsyncNode,
  Coordinates,
  NodeType,
  NodeRunType,
  NodeCacheType,
  BaseNode,
} from "../models/node";
import { updateNode } from "../api/api";
import mammoth from 'mammoth';
import { FileUtils as fu } from "./utils";
import { SERVER_URL } from "../api/constants";

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
