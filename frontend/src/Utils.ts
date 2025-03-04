import { VisualNode } from "./NetworkTypes";
import { BaseNode, NodeType, Coordinates } from "wc-shared";

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
  async newNode(type: NodeType, authorId: string, projectId: string, coordinates: Coordinates): Promise<BaseNode | null> {
    const nodeId = crypto.randomUUID();
    switch (type) {
      case NodeType.Text: {
        const { TextNode } = (await import("wc-shared"));
        return new TextNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Fetch: {
        const { FetchNode } = (await import("wc-shared"));
        return new FetchNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Chat: {
        const { ChatNode } = (await import("wc-shared"));
        return new ChatNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Prompt: {
        const { PromptNode } = (await import("wc-shared"));
        return new PromptNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Save: {
        const { SaveNode } = (await import("wc-shared"));
        return new SaveNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Merge: {
        const { MergeNode } = (await import("wc-shared"));
        return new MergeNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Split: {
        const { SplitNode } = (await import("wc-shared"));
        return new SplitNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.File: {
        const { FileNode } = (await import("wc-shared"));
        return new FileNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Edit: {
        const { EditNode } = (await import("wc-shared"));
        return new EditNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Embed: {
        const { EmbedNode } = (await import("wc-shared"));
        return new EmbedNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Search: {
        const { SearchNode } = (await import("wc-shared"));
        return new SearchNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Join: {
        const { JoinNode } = (await import("wc-shared"));
        return new JoinNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Replace: {
        const { ReplaceNode } = (await import("wc-shared"));
        return new ReplaceNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Pick: {
        const { PickNode } = (await import("wc-shared"));
        return new PickNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Cache: {
        const { CacheNode } = (await import("wc-shared"));
        return new CacheNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.CSV: {
        const { CSVNode } = (await import("wc-shared"));
        return new CSVNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Stats: {
        const { StatsNode } = (await import("wc-shared"));
        return new StatsNode(nodeId, authorId, projectId, coordinates);
      }
      default:
        return null;
    }
  },

  async fromObject(object: BaseNode): Promise<BaseNode | null> {
    switch (object.type) {
      case NodeType.Text: {
        const { TextNode } = (await import("wc-shared"));
        return TextNode.fromObject(object);
      }
      case NodeType.Fetch: {
        const { FetchNode } = (await import("wc-shared"));
        return FetchNode.fromObject(object);
      }
      case NodeType.Chat: {
        const { ChatNode } = (await import("wc-shared"));
        return ChatNode.fromObject(object);
      }
      case NodeType.Prompt: {
        const { PromptNode } = (await import("wc-shared"));
        return PromptNode.fromObject(object);
      }
      case NodeType.Save: {
        const { SaveNode } = (await import("wc-shared"));
        return SaveNode.fromObject(object);
      }
      case NodeType.Merge: {
        const { MergeNode } = (await import("wc-shared"));
        return MergeNode.fromObject(object);
      }
      case NodeType.Split: {
        const { SplitNode } = (await import("wc-shared"));
        return SplitNode.fromObject(object);
      }
      case NodeType.File: {
        const { FileNode } = (await import("wc-shared"));
        return FileNode.fromObject(object);
      }
      case NodeType.Edit: {
        const { EditNode } = (await import("wc-shared"));
        return EditNode.fromObject(object);
      }
      case NodeType.Embed: {
        const { EmbedNode } = (await import("wc-shared"));
        return EmbedNode.fromObject(object);
      }
      case NodeType.Search: {
        const { SearchNode } = (await import("wc-shared"));
        return SearchNode.fromObject(object);
      }
      case NodeType.Join: {
        const { JoinNode } = (await import("wc-shared"));
        return JoinNode.fromObject(object);
      }
      case NodeType.Replace: {
        const { ReplaceNode } = (await import("wc-shared"));
        return ReplaceNode.fromObject(object);
      }
      case NodeType.Pick: {
        const { PickNode } = (await import("wc-shared"));
        return PickNode.fromObject(object);
      }
      case NodeType.Cache: {
        const { CacheNode } = (await import("wc-shared"));
        return CacheNode.fromObject(object);
      }
      case NodeType.CSV: {
        const { CSVNode } = (await import("wc-shared"));
        return CSVNode.fromObject(object);
      }
      case NodeType.Stats: {
        const { StatsNode } = (await import("wc-shared"));
        return StatsNode.fromObject(object);
      }
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
