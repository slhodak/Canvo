import {
  BaseAsyncNode,
  IOState,
  IOStateType,
  Coordinates,
  NodeType,
  NodeRunType,
  NodeCacheType,
  BaseNode,
  NodePropertyType,
} from "../models/node";

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
