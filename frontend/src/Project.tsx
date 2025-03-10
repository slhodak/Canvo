import { useState, useEffect, useCallback, useRef } from 'react';

// UI
import './Project.css';
import OutputView from "./OutputView";
import ParametersPane from "./ParametersPane";
import NetworkEditor from "./NetworkEditor";

// Models
import {
  BaseNode,
  NodeRunType,
  IOState,
  IOStateType,
  BaseAsyncNode,
  BaseSyncNode,
  NodeCacheType,
  ProjectModel,
  Connection,
  UserModel,
} from 'wc-shared';
import { VisualNode, VisualConnection } from './NetworkTypes';

// Utils & Constants
import { ConnectionUtils as cu, NodeUtils as nu } from './Utils';
// Don't love this function rename, it's a bit confusing when debugging
import { syncNodeUpdate } from 'wc-shared';
import { SERVER_URL } from './constants';

interface ProjectProps {
  user: UserModel;
  project: ProjectModel;
  handleProjectTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<boolean>;
}

type NetworkNodes = Record<string, VisualNode>;
type NetworkConnections = VisualConnection[];

const Project = ({ user, project, handleProjectTitleChange }: ProjectProps) => {
  const [nodes, setNodes] = useState<NetworkNodes>({});
  const [connections, setConnections] = useState<NetworkConnections>([]);
  const prevNodesRef = useRef<NetworkNodes>({});
  const prevConnectionsRef = useRef<NetworkConnections>([]);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [viewState, setViewState] = useState<IOState>(IOState.ofType(IOStateType.String));
  const [projectTitle, setProjectTitle] = useState(project.title);

  // Update a controlled copy of the title instead of the project.title itself so that each change does not trigger a re-render
  // And keep the project.title in sync with the local copy
  const handleLocalTitleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const originalTitle = project.title;
    const newTitle = event.target.value;
    project.title = newTitle;
    setProjectTitle(newTitle);
    const updateSuccessful = await handleProjectTitleChange(event);
    // If the server update fails, revert to the original title
    if (!updateSuccessful) {
      project.title = originalTitle;
      setProjectTitle(originalTitle);
    }
  };

  useEffect(() => {
    setProjectTitle(project.title);
  }, [project.title]);

  // Notice that this only displays the first output state
  const updateViewState = useCallback((node: VisualNode) => {
    console.debug(`Updating view state for node ${node.node.nodeId}`);
    const outputState = node.node.outputState[0];
    if (outputState === null || outputState === undefined || outputState.isEmpty()) {
      setViewState(IOState.ofType(IOStateType.String));
    } else {
      setViewState(outputState);
    }
  }, []);

  const updateDisplayedNode = async (node: VisualNode) => {
    // In every case where a node display is changed, ensure it is synced too
    node.node.display = !node.node.display;
    if (node.node.display) {
      // If this node is being displayed, undisplay all other nodes
      const newNodes = { ...nodes };
      Object.values(newNodes).forEach(n => {
        if (n.node.display && n.node.nodeId !== node.node.nodeId) {
          n.node.display = false;
          syncNodeUpdate(n.node, SERVER_URL);
        }
      });
      setNodes(newNodes);
      if (node.node.runType === NodeRunType.Auto) {
        await runNode(node);
      } else {
        syncNodeUpdate(node.node, SERVER_URL);
        updateViewState(node);
      }
    } else {
      setViewState(IOState.ofType(IOStateType.String));
      syncNodeUpdate(node.node, SERVER_URL);
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
        // Convert all nodes in parallel and wait for all to complete
        const nodePromises = data.nodes.map(async (nodeJson: BaseNode) => {
          const node = await nu.fromObject(nodeJson);
          if (!node) return null;
          return {
            id: node.nodeId,
            node: node,
            x: node.coordinates.x,
            y: node.coordinates.y,
          };
        });

        const loadedNodes = await Promise.all(nodePromises);
        const visualNodes: Record<string, VisualNode> = {};

        // Filter out any null nodes and build the visual nodes object
        loadedNodes.forEach(node => {
          if (node) {
            visualNodes[node.id] = node;
          }
        });

        setNodes(visualNodes);
        // Cache this initial state so you can revert to it if a future update fails
        prevNodesRef.current = visualNodes;
        // If any node is displaying, update the view text
        for (const node of Object.values(visualNodes)) {
          if (node.node.display) {
            updateViewState(node);
            break;
          }
        }
      } else {
        console.error('Error fetching nodes for project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching nodes for project:', error);
    }
  }, [project, updateViewState]);

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

  const _runNodeOnInput = useCallback(async (inputValues: IOState[], node: VisualNode, shouldSync: boolean = true): Promise<IOState[]> => {
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
  }, []);

  // For each input connection to this node, get or calculate the input from that connection
  // If this node is a Run node, run it once you've gathered all the input values
  const runPriorDAG = useCallback(async (node: VisualNode, shouldSync: boolean = true): Promise<IOState[]> => {
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
        const priorInputValues = await runPriorDAG(inputNode, shouldSync);
        const calculatedIOState = await _runNodeOnInput(priorInputValues, inputNode, shouldSync);
        inputValues.push(...calculatedIOState);
        continue;
      }

      // Have to push something for each input value just in case the run method will fail with an incorrect-length input
      // But it shouldn't... and there shouldn't even be any nodes that are neither cached nor auto-run
      inputValues.push(IOState.ofType(IOStateType.Empty));
    }
    return inputValues;
  }, [nodes, connections, _runNodeOnInput]);

  const runNode = useCallback(async (node: VisualNode, shouldSync: boolean = true) => {
    const inputValues = await runPriorDAG(node, shouldSync);
    await _runNodeOnInput(inputValues, node, shouldSync);
    if (node.node.display) {
      updateViewState(node);
    }
  }, [runPriorDAG, _runNodeOnInput, updateViewState]);

  const selectNode = useCallback(async (node: VisualNode) => {
    setSelectedNode(node);
    if (node.node.runType === NodeRunType.Auto) {
      await runNode(node);
    }
  }, [runNode]);

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

  const updateNode = useCallback(async (node: VisualNode, propertyChanged: boolean = true, shouldSync: boolean = true) => {
    setNodes(prevNodes => ({ ...prevNodes, [node.node.nodeId]: node }));
    if (propertyChanged && node.node.runType === NodeRunType.Auto) {
      await runNode(node, shouldSync);
    } else if (shouldSync) {
      // If the node is not being run, sync it if needed, e.g. on coordinate updates
      await syncNodeUpdate(node.node, SERVER_URL);
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
    if (node.node.display) {
      setViewState(IOState.ofType(IOStateType.String));
    }
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
    setViewState(IOState.ofType(IOStateType.String));
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
        <input type="text" className="project-title-input" value={projectTitle} onChange={handleLocalTitleChange} />
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
              runPriorDAG={runPriorDAG}
            />
          </div>

          <div className="left-pane-bottom">
            <ParametersPane node={selectedNode} updateNode={updateNode} />
          </div>

        </div>
        <div className="right-pane">
          <OutputView outputState={viewState} />
        </div>
      </div>
    </div>
  );
}

export default Project;
