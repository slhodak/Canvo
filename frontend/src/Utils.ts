import { VisualNode, VisualConnection } from "./NetworkTypes";
import { BaseNode, NodeType, Coordinates, BaseSyncNode, BaseAsyncNode, IOState, IOStateType, NodeRunType, NodeCacheType } from "wc-shared";
import { syncNodeUpdate } from 'wc-shared';
import { SERVER_URL } from './constants';

export const DAG = {
  // For each input connection to this node, get or calculate the input from that connection
  // If this node is a Run node, run it once you've gathered all the input values
  runPriorDAG: async (connections: VisualConnection[], nodes: Record<string, VisualNode>, node: VisualNode, shouldSync: boolean = true): Promise<IOState[]> => {
    const inputConnections = connections.filter(conn => conn.connection.toNode === node.node.nodeId);
    const inputValues: IOState[] = [];
    for (const conn of inputConnections) {
      const inputNode = nodes[conn.connection.fromNode];
      if (!inputNode) {
        console.warn("Input node not found for connection:", conn.connection.connectionId);
        inputValues.push(IOState.ofType(IOStateType.Empty));
        continue;
      };

      const outputState = inputNode.node.outputState[conn.connection.fromOutput];
      if (outputState === null) {
        console.warn("Output state not found for connection:", conn.connection.connectionId);
        inputValues.push(IOState.ofType(IOStateType.Empty));
        continue;
      }

      // If node caches its output, do not run it
      if (inputNode.node.cacheType === NodeCacheType.Cache) {
        inputValues.push(outputState);
        continue;
      }

      if (inputNode.node.runType === NodeRunType.Auto) {
        const priorInputValues = await DAG.runPriorDAG(connections, nodes, inputNode, shouldSync);
        const calculatedIOState = await NodeUtils.runNodeOnInput(priorInputValues, inputNode, shouldSync);
        inputValues.push(...calculatedIOState);
        continue;
      }

      // Have to push something for each input value just in case the run method will fail with an incorrect-length input
      // But it shouldn't... and there shouldn't even be any nodes that are neither cached nor auto-run
      inputValues.push(IOState.ofType(IOStateType.Empty));
    }
    return inputValues;
  },
}

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
  runNodeOnInput: async (inputValues: IOState[], node: VisualNode, shouldSync: boolean = true): Promise<IOState[]> => {
    let outputValues: IOState[] = [];
    if (node.node instanceof BaseSyncNode) {
      outputValues = node.node.run(inputValues);
    } else if (node.node instanceof BaseAsyncNode) {
      outputValues = await node.node.run(inputValues);
    }

    if (shouldSync) {
      await syncNodeUpdate(node.node, SERVER_URL);
    }

    return outputValues;
  },

  async newNode(type: NodeType, authorId: string, projectId: string, coordinates: Coordinates): Promise<BaseNode | null> {
    const nodeId = crypto.randomUUID();
    switch (type) {
      case NodeType.Text: {
        const { TextNode } = (await import("./nodes/source"));
        return new TextNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Fetch: {
        const { FetchNode } = (await import("./nodes/source"));
        return new FetchNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Chat: {
        const { ChatNode } = (await import("./nodes/intelligent"));
        return new ChatNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Prompt: {
        const { PromptNode } = (await import("./nodes/intelligent"));
        return new PromptNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Save: {
        const { SaveNode } = (await import("./nodes/output"));
        return new SaveNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Merge: {
        const { MergeNode } = (await import("./nodes/basic"));
        return new MergeNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Split: {
        const { SplitNode } = (await import("./nodes/basic"));
        return new SplitNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.File: {
        const { FileNode } = (await import("./nodes/source"));
        return new FileNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Edit: {
        const { EditNode } = (await import("./nodes/basic"));
        return new EditNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Embed: {
        const { EmbedNode } = (await import("./nodes/intelligent"));
        return new EmbedNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Search: {
        const { SearchNode } = (await import("./nodes/intelligent"));
        return new SearchNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Join: {
        const { JoinNode } = (await import("./nodes/basic"));
        return new JoinNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Replace: {
        const { ReplaceNode } = (await import("./nodes/basic"));
        return new ReplaceNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Pick: {
        const { PickNode } = (await import("./nodes/basic"));
        return new PickNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Cache: {
        const { CacheNode } = (await import("./nodes/basic"));
        return new CacheNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.CSV: {
        const { CSVNode } = (await import("./nodes/source"));
        return new CSVNode(nodeId, authorId, projectId, coordinates);
      }
      case NodeType.Stats: {
        const { StatsNode } = (await import("./nodes/basic"));
        return new StatsNode(nodeId, authorId, projectId, coordinates);
      }
      default:
        return null;
    }
  },

  async fromObject(object: BaseNode): Promise<BaseNode | null> {
    switch (object.type) {
      case NodeType.Text: {
        const { TextNode } = (await import("./nodes/source"));
        return TextNode.fromObject(object);
      }
      case NodeType.Fetch: {
        const { FetchNode } = (await import("./nodes/source"));
        return FetchNode.fromObject(object);
      }
      case NodeType.Chat: {
        const { ChatNode } = (await import("./nodes/intelligent"));
        return ChatNode.fromObject(object);
      }
      case NodeType.Prompt: {
        const { PromptNode } = (await import("./nodes/intelligent"));
        return PromptNode.fromObject(object);
      }
      case NodeType.Save: {
        const { SaveNode } = (await import("./nodes/output"));
        return SaveNode.fromObject(object);
      }
      case NodeType.Merge: {
        const { MergeNode } = (await import("./nodes/basic"));
        return MergeNode.fromObject(object);
      }
      case NodeType.Split: {
        const { SplitNode } = (await import("./nodes/basic"));
        return SplitNode.fromObject(object);
      }
      case NodeType.File: {
        const { FileNode } = (await import("./nodes/source"));
        return FileNode.fromObject(object);
      }
      case NodeType.Edit: {
        const { EditNode } = (await import("./nodes/basic"));
        return EditNode.fromObject(object);
      }
      case NodeType.Embed: {
        const { EmbedNode } = (await import("./nodes/intelligent"));
        return EmbedNode.fromObject(object);
      }
      case NodeType.Search: {
        const { SearchNode } = (await import("./nodes/intelligent"));
        return SearchNode.fromObject(object);
      }
      case NodeType.Join: {
        const { JoinNode } = (await import("./nodes/basic"));
        return JoinNode.fromObject(object);
      }
      case NodeType.Replace: {
        const { ReplaceNode } = (await import("./nodes/basic"));
        return ReplaceNode.fromObject(object);
      }
      case NodeType.Pick: {
        const { PickNode } = (await import("./nodes/basic"));
        return PickNode.fromObject(object);
      }
      case NodeType.Cache: {
        const { CacheNode } = (await import("./nodes/basic"));
        return CacheNode.fromObject(object);
      }
      case NodeType.CSV: {
        const { CSVNode } = (await import("./nodes/source"));
        return CSVNode.fromObject(object);
      }
      case NodeType.Stats: {
        const { StatsNode } = (await import("./nodes/basic"));
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
