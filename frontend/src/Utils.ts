import { VisualNode } from "./NetworkTypes";
import { BaseNode, NodeType, Coordinates } from "../../shared/types/src/models/node";
import { TextNode, PromptNode, SaveNode, MergeNode, SplitNode, FileNode, EditNode, EmbedNode, SearchNode, JoinNode, ReplaceNode, FetchNode, PickNode, CacheNode, CSVNode } from "./nodes";

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
      case NodeType.Fetch:
        return new FetchNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Prompt:
        return new PromptNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Save:
        return new SaveNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Merge:
        return new MergeNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Split:
        return new SplitNode(nodeId, authorId, projectId, coordinates);
      case NodeType.File:
        return new FileNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Edit:
        return new EditNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Embed:
        return new EmbedNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Search:
        return new SearchNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Join:
        return new JoinNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Replace:
        return new ReplaceNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Pick:
        return new PickNode(nodeId, authorId, projectId, coordinates);
      case NodeType.Cache:
        return new CacheNode(nodeId, authorId, projectId, coordinates);
      case NodeType.CSV:
        return new CSVNode(nodeId, authorId, projectId, coordinates);
      default:
        return null;
    }
  },

  fromObject(object: BaseNode): BaseNode | null {
    switch (object.type) {
      case NodeType.Text:
        return TextNode.fromObject(object);
      case NodeType.Fetch:
        return FetchNode.fromObject(object);
      case NodeType.Prompt:
        return PromptNode.fromObject(object);
      case NodeType.Save:
        return SaveNode.fromObject(object);
      case NodeType.Merge:
        return MergeNode.fromObject(object);
      case NodeType.Split:
        return SplitNode.fromObject(object);
      case NodeType.File:
        return FileNode.fromObject(object);
      case NodeType.Edit:
        return EditNode.fromObject(object);
      case NodeType.Embed:
        return EmbedNode.fromObject(object);
      case NodeType.Search:
        return SearchNode.fromObject(object);
      case NodeType.Join:
        return JoinNode.fromObject(object);
      case NodeType.Replace:
        return ReplaceNode.fromObject(object);
      case NodeType.Pick:
        return PickNode.fromObject(object);
      case NodeType.Cache:
        return CacheNode.fromObject(object);
      case NodeType.CSV:
        return CSVNode.fromObject(object);
      default:
        return null;
    }
  }
}

export const ConnectionUtils = {
  visualConnectionId(fromNodeId: string, fromOutput: number, toNodeId: string, toInput: number): string {
    return `${fromNodeId}-${toNodeId}-${fromOutput}-${toInput}`;
  }
}
