import { VisualNode } from "./NetworkTypes";
import { BaseNode, NodeType, Coordinates } from "../../shared/types/src/models/node";

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
        const { TextNode } = (await import("./Nodes/source"));
        return new TextNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Fetch: {
        const { FetchNode } = (await import("./Nodes/source"));
        return new FetchNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Chat: {
        const { ChatNode } = (await import("./Nodes/intelligent"));
        return new ChatNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Prompt: {
        const { PromptNode } = (await import("./Nodes/intelligent"));
        return new PromptNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Save: {
        const { SaveNode } = (await import("./Nodes/output"));
        return new SaveNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Merge: {
        const { MergeNode } = (await import("./Nodes/basic"));
        return new MergeNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Split: {
        const { SplitNode } = (await import("./Nodes/basic"));
        return new SplitNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.File: {
        const { FileNode } = (await import("./Nodes/source"));
        return new FileNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Edit: {
        const { EditNode } = (await import("./Nodes/basic"));
        return new EditNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Embed: {
        const { EmbedNode } = (await import("./Nodes/intelligent"));
        return new EmbedNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Search: {
        const { SearchNode } = (await import("./Nodes/intelligent"));
        return new SearchNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Join: {
        const { JoinNode } = (await import("./Nodes/basic"));
        return new JoinNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Replace: {
        const { ReplaceNode } = (await import("./Nodes/basic"));
        return new ReplaceNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Pick: {
        const { PickNode } = (await import("./Nodes/basic"));
        return new PickNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Cache: {
        const { CacheNode } = (await import("./Nodes/basic"));
        return new CacheNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.CSV: {
        const { CSVNode } = (await import("./Nodes/source"));
        return new CSVNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Stats: {
        const { StatsNode } = (await import("./Nodes/basic"));
        return new StatsNode(nodeId, authorId, projectId, coordinates);
      }
      default:
        return null;
    }
  },

  async fromObject(object: BaseNode): Promise<BaseNode | null> {
    switch (object.type) {
      case NodeType.Text: {
        const { TextNode } = (await import("./Nodes/source"));
        return TextNode.fromObject(object);
      }
      case NodeType.Fetch: {
        const { FetchNode } = (await import("./Nodes/source"));
        return FetchNode.fromObject(object);
      }
      case NodeType.Chat: {
        const { ChatNode } = (await import("./Nodes/intelligent"));
        return ChatNode.fromObject(object);
      }
      case NodeType.Prompt: {
        const { PromptNode } = (await import("./Nodes/intelligent"));
        return PromptNode.fromObject(object);
      }
      case NodeType.Save: {
        const { SaveNode } = (await import("./Nodes/output"));
        return SaveNode.fromObject(object);
      }
      case NodeType.Merge: {
        const { MergeNode } = (await import("./Nodes/basic"));
        return MergeNode.fromObject(object);
      }
      case NodeType.Split: {
        const { SplitNode } = (await import("./Nodes/basic"));
        return SplitNode.fromObject(object);
      }
      case NodeType.File: {
        const { FileNode } = (await import("./Nodes/source"));
        return FileNode.fromObject(object);
      }
      case NodeType.Edit: {
        const { EditNode } = (await import("./Nodes/basic"));
        return EditNode.fromObject(object);
      }
      case NodeType.Embed: {
        const { EmbedNode } = (await import("./Nodes/intelligent"));
        return EmbedNode.fromObject(object);
      }
      case NodeType.Search: {
        const { SearchNode } = (await import("./Nodes/intelligent"));
        return SearchNode.fromObject(object);
      }
      case NodeType.Join: {
        const { JoinNode } = (await import("./Nodes/basic"));
        return JoinNode.fromObject(object);
      }
      case NodeType.Replace: {
        const { ReplaceNode } = (await import("./Nodes/basic"));
        return ReplaceNode.fromObject(object);
      }
      case NodeType.Pick: {
        const { PickNode } = (await import("./Nodes/basic"));
        return PickNode.fromObject(object);
      }
      case NodeType.Cache: {
        const { CacheNode } = (await import("./Nodes/basic"));
        return CacheNode.fromObject(object);
      }
      case NodeType.CSV: {
        const { CSVNode } = (await import("./Nodes/source"));
        return CSVNode.fromObject(object);
      }
      case NodeType.Stats: {
        const { StatsNode } = (await import("./Nodes/basic"));
        return StatsNode.fromObject(object);
      }
      default:
        return null;
    }
  }
}

export const FileUtils = {
  textFileExtensions: ["md", "txt"],
}

export const ConnectionUtils = {
  visualConnectionId(fromNodeId: string, fromOutput: number, toNodeId: string, toInput: number): string {
    return `${fromNodeId}-${toNodeId}-${fromOutput}-${toInput}`;
  }
}
