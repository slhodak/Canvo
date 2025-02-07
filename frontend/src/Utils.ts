import { VisualNode } from "./NetworkTypes";
import { BaseNode, NodeType, TextNode, PromptNode, SaveNode, MergeNode, ViewNode, Coordinates } from "../../shared/types/src/models/node";

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
  newNode(type: NodeType, projectId: string, coordinates: Coordinates): BaseNode | null {
    const nodeId = crypto.randomUUID();
    switch (type) {
      case NodeType.Text:
        return new TextNode(nodeId, projectId, coordinates);
      case NodeType.Prompt:
        return new PromptNode(nodeId, projectId, coordinates);
      case NodeType.Save:
        return new SaveNode(nodeId, projectId, coordinates);
      case NodeType.View:
        return new ViewNode(nodeId, projectId, coordinates);
      case NodeType.Merge:
        return new MergeNode(nodeId, projectId, coordinates);
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
  }
}