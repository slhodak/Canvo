import { VisualConnection, VisualNode } from "./NetworkTypes";
import { BaseNode, NodeType, TextNode, PromptNode, SaveNode, MergeNode, ViewNode, Coordinates, OutputState } from "../../shared/types/src/models/node";

export const NetworkEditorUtils = {
  NODE_WIDTH: 100,
  NODE_HEIGHT: 30,
  PORT_RADIUS: 5,

  getPortPosition(node: VisualNode, isInput: boolean, index: number) {
    const portCount = isInput ? node.node.inputs : node.node.outputs;
    const spacing = NetworkEditorUtils.NODE_WIDTH / (portCount + 1);
    const y = isInput ? node.y : node.y + NetworkEditorUtils.NODE_HEIGHT;
    return {
      x: node.x + spacing * (index + 1),
      y,
    };
  }
}

// I do not like that we have two of the same switch statement here, but for now... c'est la vie
export const NodeUtils = {
  newNode(type: NodeType, authorId: string, projectId: string, coordinates: Coordinates): BaseNode | null {
    const nodeId = crypto.randomUUID();
    switch (type) {
      case NodeType.Text:
        return new TextNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Prompt:
        return new PromptNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Save:
        return new SaveNode(nodeId, authorId, projectId, coordinates);
      case NodeType.View:
        return new ViewNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Merge:
        return new MergeNode(nodeId, authorId, projectId, coordinates);
    }
  },

  fromObject(object: BaseNode): BaseNode | null {
    switch (object.type) {
      case NodeType.Text:
        return TextNode.fromObject(object);
      case NodeType.Prompt:
        return PromptNode.fromObject(object);
      case NodeType.Save:
        return SaveNode.fromObject(object);
      case NodeType.Merge:
        return MergeNode.fromObject(object);
      case NodeType.View:
        return ViewNode.fromObject(object);
    }

    return null;
  },

  // Read the input values from the corresponding outputs of connected nodes
  readNodeInputs(node: BaseNode, connections: VisualConnection[], nodes: Record<string, VisualNode>): (OutputState | null)[] {
    const connectionsToNode = connections.filter(conn => conn.connection.toNode === node.nodeId);
    if (connectionsToNode.length === 0) {
      // Print this warning because the caller should have already confirmed that the node is supposed to have inputs
      // And readNodeInputs should only be run when the node is part of a DAG, i.e. at least one of the inputs is connected
      console.warn("No connections to node:", node.nodeId);
      return [];
    }

    return connectionsToNode.map(conn => {
      const fromNode = nodes[conn.connection.fromNode];
      if (!fromNode) {
        console.warn("No fromNode found for connection:", conn);
        return null;
      }

      const fromNodeOutput = fromNode.node.outputState[conn.connection.fromOutput];
      if (!fromNodeOutput) {
        console.warn("No output found for fromNode:", fromNode);
        return null;
      }

      return fromNodeOutput;
    });
  }
}
