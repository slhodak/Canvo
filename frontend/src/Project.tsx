import './Project.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectModel } from '../../shared/types/src/models/project';
import { VisualNode, VisualConnection } from './NetworkTypes';
import { BaseNode, NodeRunType, IOState, IOStateType } from '../../shared/types/src/models/node';
import { Connection } from '../../shared/types/src/models/connection';
import { ConnectionUtils as cu, NodeUtils as nu } from './Utils';
import NetworkEditor from './NetworkEditor';
import ParametersPane from './ParametersPane';
import OutputView from "./OutputView";
import { SERVER_URL } from './constants';
import { UserModel } from '../../shared/types/src/models/user';
import { updateNode as syncNodeUpdate } from './api';

interface ProjectProps {
  user: UserModel;
  project: ProjectModel;
  handleProjectTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

type NetworkNodes = Record<string, VisualNode>;
type NetworkConnections = VisualConnection[];

const Project = ({ user, project, handleProjectTitleChange }: ProjectProps) => {
  const [nodes, setNodes] = useState<NetworkNodes>({});
  const [connections, setConnections] = useState<NetworkConnections>([]);
  const prevNodesRef = useRef<NetworkNodes>({});
  const prevConnectionsRef = useRef<NetworkConnections>([]);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [viewText, setViewText] = useState<string>('');

  // Notice that this only displays the first output state
  const updateViewText = (node: VisualNode) => {
    if (node.node.outputState[0].type === IOStateType.String) {
      setViewText(node.node.outputState[0].stringValue || '');
    } else if (node.node.outputState[0].type === IOStateType.Number) {
      setViewText(node.node.outputState[0].numberValue?.toString() || '');
    } else if (node.node.outputState[0].type === IOStateType.StringArray) {
      setViewText(node.node.outputState[0].stringArrayValue?.join("\n") || '');
    } else if (node.node.outputState[0].type === IOStateType.Tensor) {
      setViewText(node.node.outputState[0].tensor?.toString() || '');
    } else {
      console.debug('Displayed node has no output state');
      setViewText('');
    }
  }

  //////////////////////////////
  // Fetch Nodes & Connections
  //////////////////////////////

  const fetchNodesForProject = useCallback(async () => {
    console.debug(`${Date.now()}: Fetching nodes for project: ${project.projectId}`);
    if (!project) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/get_nodes_for_project/${project.projectId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        const visualNodes: Record<string, VisualNode> = {};
        data.nodes.forEach((nodeJson: BaseNode) => {
          // Convert json to a real node instance so we can use its instance methods
          const node = nu.fromObject(nodeJson);
          if (!node) return;

          visualNodes[node.nodeId] = {
            id: node.nodeId,
            node: node,
            x: node.coordinates.x,
            y: node.coordinates.y,
          };
        });

        setNodes(visualNodes);
        // Cache this initial state so you can revert to it if a future update fails
        prevNodesRef.current = visualNodes;
        // If any node is displaying, update the view text
        for (const node of Object.values(visualNodes)) {
          if (node.node.display) {
            updateViewText(node);
            break;
          }
        }
      } else {
        console.error('Error fetching nodes for project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching nodes for project:', error);
    }
  }, [project]);

  const fetchConnectionsForProject = useCallback(async () => {
    console.debug('Fetching connections for project:', project.projectId);
    if (!project) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/get_connections_for_project/${project.projectId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        const visualConnections: VisualConnection[] = [];
        data.connections.forEach((object: Connection) => {
          visualConnections.push({
            id: cu.visualConnectionId(object.fromNode, object.fromOutput, object.toNode, object.toInput),
            connection: object,
          });
        });
        setConnections(visualConnections);
        prevConnectionsRef.current = visualConnections;
      } else {
        console.error('Error fetching connections for project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching connections for project:', error);
    }
  }, [project]);

  //////////////////////////////
  // Sync Nodes
  //////////////////////////////

  const syncNodeAdd = useCallback(async (node: BaseNode) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/add_node`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.projectId,
          node: node,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        prevNodesRef.current = { ...nodes };
      } else {
        console.error('Server error while updating node:', data.error);
        setNodes(prevNodesRef.current);
      }
    } catch (error) {
      console.error('Could not update node:', error);
      setNodes(prevNodesRef.current);
    }
  }, [project.projectId, nodes]);

  const syncNodeDelete = useCallback(async (node: VisualNode) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/delete_node`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: node.node.nodeId,
          projectId: project.projectId,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        prevNodesRef.current = { ...nodes };
      } else {
        console.error('Error deleting node:', data.error);
        setNodes(prevNodesRef.current);
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      setNodes(prevNodesRef.current);
    }
  }, [project.projectId, nodes]);

  //////////////////////////////
  // Run & Select Nodes
  //////////////////////////////

  // cache-expensive: calculate the output state of a node given its input states
  const _runNodeOnInput = useCallback(async (inputValues: IOState[], node: VisualNode, shouldSync: boolean = true): Promise<IOState[]> => {
    if ('run' in node.node && typeof node.node.run === 'function') {
      node.node.run(inputValues);
    }
    if ('asyncRun' in node.node && typeof node.node.asyncRun === 'function') {
      await node.node.asyncRun(inputValues);
    }

    if (shouldSync) {
      await syncNodeUpdate(node.node);
    }
    return [];
  }, []);

  // For each input connection to this node, get or calculate the input from that connection
  // If this node is a Run node, run it once you've gathered all the input values
  const _runPriorDAG = useCallback(async (node: VisualNode, shouldSync: boolean = true): Promise<IOState[]> => {
    const inputConnections = connections.filter(conn => conn.connection.toNode === node.node.nodeId);
    if (inputConnections.length === 0 && node.node.nodeRunType) {
      console.debug('Node has no input connections');
      return [];
    }

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

      // Read from Cache and Source nodes, run Run nodes
      switch (inputNode.node.nodeRunType) {
        case NodeRunType.Source:
          inputValues.push(outputState);
          break;
        case NodeRunType.Cache:
          inputValues.push(outputState);
          break;
        case NodeRunType.Run: {
          const priorInputValues = await _runPriorDAG(inputNode, shouldSync);
          const calculatedIOState = await _runNodeOnInput(priorInputValues, inputNode, shouldSync);
          inputValues.push(...calculatedIOState);
          break;
        }
        default:
          break;
      }
    }
    return inputValues;
  }, [nodes, connections, _runNodeOnInput]);

  const runNode = useCallback(async (node: VisualNode, shouldSync: boolean = true) => {
    switch (node.node.nodeRunType) {
      case NodeRunType.Source:
        _runNodeOnInput([], node, shouldSync);
        break;
      case NodeRunType.Cache:
      case NodeRunType.Run: {
        const inputValues = await _runPriorDAG(node, shouldSync);
        await _runNodeOnInput(inputValues, node, shouldSync);
        break;
      }
      default:
        break;
    }

    if (node.node.display) {
      updateViewText(node);
    }
  }, [_runPriorDAG, _runNodeOnInput]);

  const selectNode = useCallback(async (node: VisualNode) => {
    setSelectedNode(node);
    if (node.node.nodeRunType === NodeRunType.Run) {
      await runNode(node);
    }
  }, [runNode]);

  const updateDisplayedNode = async (node: VisualNode) => {
    node.node.display = !node.node.display;
    // If this node is being displayed, undisplay all other nodes
    if (node.node.display) {
      const newNodes = { ...nodes };
      Object.values(newNodes).forEach(n => {
        if (n.node.display && n.node.nodeId !== node.node.nodeId) {
          n.node.display = false;
        }
      });
      setNodes(newNodes);
      if (node.node.nodeRunType === NodeRunType.Run) {
        await runNode(node);
      }
      updateViewText(node);
    } else {
      setViewText('');
    }
  }

  //////////////////////////////
  // Sync Connections
  //////////////////////////////

  const syncConnections = useCallback(async (newConnections: NetworkConnections) => {
    try {
      const serverConnections = newConnections.map(conn => conn.connection);
      const response = await fetch(`${SERVER_URL}/api/set_connections`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: project.projectId, connections: serverConnections }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        prevConnectionsRef.current = { ...connections };
      } else {
        console.error('Server error while updating connections:', data.error);
        setConnections(prevConnectionsRef.current);
      }
    } catch (error) {
      console.error('Could not update connections:', error);
      setConnections(prevConnectionsRef.current);
    }
  }, [project.projectId, connections]);

  ///////////////////////////////////////
  // Node & Connection CRUD Handlers
  // Connections first because node methods may depend on them
  ///////////////////////////////////////

  const updateConnections = useCallback(async (updatedConnections: VisualConnection[], shouldSync: boolean = true) => {
    setConnections(updatedConnections);
    if (shouldSync) {
      await syncConnections(updatedConnections);
    }
  }, [syncConnections]);

  const deleteConnections = useCallback((node: VisualNode) => {
    // Delete any connections to or from this node
    const newConnections = connections.filter(conn => conn.connection.fromNode !== node.node.nodeId && conn.connection.toNode !== node.node.nodeId);
    updateConnections(newConnections);
  }, [connections, updateConnections]);

  const addNode = useCallback(async (node: VisualNode) => {
    setNodes(prevNodes => ({ ...prevNodes, [node.node.nodeId]: node }));
    await syncNodeAdd(node.node);
  }, [syncNodeAdd]);

  const updateNode = useCallback(async (node: VisualNode, shouldRun: boolean = true, shouldSync: boolean = true) => {
    setNodes(prevNodes => ({ ...prevNodes, [node.node.nodeId]: node }));
    // Sometimes the node is only having its coordinates updated, so don't run it
    if (shouldRun) {
      // The updated nodes above may/will not be available immediately for runNode to find the new data
      // When source or run nodes are updated, run them immediately
      if (node.node.nodeRunType === NodeRunType.Run || node.node.nodeRunType === NodeRunType.Source) {
        await runNode(node, shouldSync);
      }
    } else if (shouldSync) {
      // If the node is not being run, sync it if needed, e.g. on coordinate updates
      await syncNodeUpdate(node.node);
    }
  }, [runNode]);

  const deleteNode = useCallback(async (node: VisualNode) => {
    const newNodes = { ...nodes };
    delete newNodes[node.node.nodeId];
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
    }
    deleteConnections(node);
    setNodes(newNodes);
    await syncNodeDelete(node);
  }, [nodes, selectedNode, syncNodeDelete, deleteConnections]);

  // If a string array output is connected to a string input, enable index selection for the input
  const enableIndexSelection = useCallback((fromNodeId: string, fromOutput: number, toNodeId: string, inputIndex: number) => {
    const fromNode = nodes[fromNodeId];
    const toNode = nodes[toNodeId];
    if (!fromNode) {
      console.error(`Error while enabling index selection: from node ${fromNodeId} not found`);
      return;
    }
    if (!toNode) {
      console.error(`Error while enabling index selection: to node ${toNodeId} not found`);
      return;
    }
    const fromNodeIOState = fromNode.node.outputState[fromOutput];
    if (!fromNodeIOState) {
      console.error(`Error while enabling index selection: no output state found for node ${fromNodeId} output ${fromOutput}`);
      return;
    }
    const fromNodeOutputType = fromNodeIOState.type;
    const toNodeInputType = toNode.node.inputTypes[inputIndex];
    if (fromNodeOutputType == IOStateType.StringArray && toNodeInputType == IOStateType.String) {
      toNode.node.indexSelections[inputIndex] = 0;
      updateNode(toNode);
    }
  }, [nodes, updateNode]);

  const disableIndexSelection = useCallback((connectionId: string) => {
    const connection = connections.find(conn => conn.connection.connectionId === connectionId);
    if (connection) {
      const toNode = nodes[connection.connection.toNode];
      if (toNode) {
        toNode.node.indexSelections[connection.connection.toInput] = null;
        updateNode(toNode, false, true);
      }
    }
  }, [nodes, connections, updateNode]);

  //////////////////////////////
  // React Hooks
  //////////////////////////////

  useEffect(() => {
    // Clear all state when switching projects
    setViewText('');
    setSelectedNode(null);
    setConnections([]);
    setNodes({});

    // Then fetch new project data
    fetchNodesForProject();
    fetchConnectionsForProject();
  }, [project.projectId, fetchNodesForProject, fetchConnectionsForProject]);

  return (
    <div className="project-container">
      <div className="project-header">
        <input type="text" className="project-title-input" value={project?.title} onChange={handleProjectTitleChange} />
      </div>

      <div className="project-panes">
        <div className="left-pane">
          <div className="left-pane-top">
            <NetworkEditor
              user={user}
              project={project}
              nodes={nodes}
              selectedNode={selectedNode}
              selectNode={selectNode}
              updateDisplayedNode={updateDisplayedNode}
              enableIndexSelection={enableIndexSelection}
              disableIndexSelection={disableIndexSelection}
              addNode={addNode}
              updateNode={updateNode}
              deleteNode={deleteNode}
              connections={connections}
              updateConnections={updateConnections}
              runNode={runNode}
            />
          </div>
          <div className="left-pane-bottom">
            <ParametersPane node={selectedNode} updateNode={updateNode} />
          </div>

        </div>
        <div className="right-pane">
          <OutputView text={viewText} />
        </div>
      </div>
    </div>
  );
}

export default Project;
