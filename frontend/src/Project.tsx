import './Project.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectModel } from '../../shared/types/src/models/project';
import { VisualNode, VisualConnection } from './NetworkTypes';
import { BaseNode, Connection, NodeType } from '../../shared/types/src/models/node';
import { NodeUtils as nu } from './Utils';
import NetworkEditor from './NetworkEditor';
import ParametersPane from './ParametersPane';
import OutputView from "./OutputView";
import { SERVER_URL } from './constants';
import { UserModel } from '../../shared/types/src/models/user';

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
  const shouldSyncNodesRef = useRef<boolean>(false);
  const shouldRunNodesRef = useRef<boolean>(false);
  const shouldSyncConnectionsRef = useRef<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [viewText, setViewText] = useState<string>('');

  // Node may have had:
  // 1. A property updated in the ParametersPane,
  // 2. Coordinates changed in the NetworkEditor,
  // 3. Run manually
  // In all cases, we update the `nodes` state, which triggers rerunning the subnetwork from the selected node, and syncing to the server
  const updateNodes = useCallback(async (updatedNodes: Record<string, VisualNode>, shouldSync: boolean = false, shouldRun: boolean = false) => {
    console.debug(`${Date.now()}: Updating nodes`, updatedNodes);
    const newNodes: Record<string, VisualNode> = {};
    Object.keys(updatedNodes).forEach(nodeId => {
      newNodes[nodeId] = updatedNodes[nodeId];
    });
    // These refs exist to tell the consequent effect hooks what further actions to take in response to the state change
    shouldSyncNodesRef.current = shouldSync;
    shouldRunNodesRef.current = shouldRun;
    setNodes(newNodes);
  }, []);

  const updateConnections = async (updatedConnections: VisualConnection[], shouldSync: boolean = true) => {
    shouldSyncConnectionsRef.current = shouldSync;
    setConnections(updatedConnections);
  }

  //////////////////////////////
  // Memoized Functions
  //////////////////////////////

  const runNode = useCallback(async (node: VisualNode, shouldSync: boolean = false) => {
    if ('run' in node.node && typeof node.node.run === 'function') {
      const inputValues = node.node.inputs > 0 ? nu.readNodeInputs(node.node, connections, nodes) : [];
      node.node.run(inputValues);
      // If the node is a View Node, set the view text
      if (node.node.type === NodeType.View) {
        console.debug('Setting view text:', node.node.properties['content'].value);
        setViewText(node.node.properties['content'].value as string);
      }
    }

    if ('asyncRun' in node.node && typeof node.node.asyncRun === 'function') {
      const inputValues = nu.readNodeInputs(node.node, connections, nodes);
      await node.node.asyncRun(inputValues);
    }

    // Find this node's connections via its output ports
    const outputConnections = connections.filter(conn => conn.connection.fromNode === node.id);
    for (const conn of outputConnections) {
      const descendent = nodes[conn.connection.toNode];
      if (!descendent) return;

      if (descendent.node.runsAutomatically) {
        await runNode(descendent);
      }
    }

    // Update the nodes array to trigger sync, but do not re-run
    // Descendent calls to runNode will not cause duplicate syncs because shouldSync is false by default
    // shouldSync so far only true when a node is run manually
    if (shouldSync) {
      const newNodes = { [node.id]: node };
      await updateNodes(newNodes, true, false);
    }
  }, [nodes, connections, updateNodes]);

  const fetchNodesForProject = useCallback(async () => {
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
        await updateNodes(visualNodes, false, false);
      } else {
        console.error('Error fetching nodes for project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching nodes for project:', error);
    }
  }, [project, updateNodes]);

  const fetchConnectionsForProject = useCallback(async () => {
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
            id: object.connectionId,
            connection: object,
          });
        });
        shouldSyncConnectionsRef.current = false;
        setConnections(visualConnections);
      } else {
        console.error('Error fetching connections for project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching connections for project:', error);
    }
  }, [project]);

  const syncNodes = useCallback(async (prevNodes: Record<string, VisualNode>, newNodes: BaseNode[]) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/update_nodes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodes: newNodes }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchNodesForProject();
      } else {
        console.error('Server error while updating node:', data.error);
        updateNodes(prevNodes, false, false);
      }
    } catch (error) {
      console.error('Could not update node:', error);
      updateNodes(prevNodes, false, false);
    }
  }, [fetchNodesForProject, updateNodes]);

  const syncConnections = useCallback(async (prevConnections: NetworkConnections, newConnections: NetworkConnections) => {
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
        fetchConnectionsForProject();
      } else {
        console.error('Server error while updating connections:', data.error);
        shouldSyncConnectionsRef.current = false; // Do not sync connections when we're reverting
        setConnections(prevConnections);
      }
    } catch (error) {
      console.error('Could not update connections:', error);
      shouldSyncConnectionsRef.current = false; // Do not sync connections when we're reverting
      setConnections(prevConnections);
    }
  }, [fetchConnectionsForProject, project.projectId]);

  const handleNodesChanged = useCallback(async () => {
    if (shouldRunNodesRef.current === true && selectedNode && selectedNode.node) {
      console.debug(`${Date.now()}: Rerunning subnetwork`);
      if (selectedNode.node.runsAutomatically) {
        // This recursive function will not return until every runnable descendent node has been run
        await runNode(selectedNode);
      }
    } else {
      console.debug(`${Date.now()}: Apparent network changes will not cause a rerun of the subnetwork`);
    }

    if (shouldSyncNodesRef.current === true) {
      console.debug(`${Date.now()}: Syncing nodes to server`);
      const prevNodes = prevNodesRef.current; // Store this in case we need to revert to it
      prevNodesRef.current = nodes;
      // Sync all the nodes to the server once the network has been fully updated
      // Even if the selected node is not runnable, its content may still have changed
      const updatedNodes = Object.values(nodes).map(node => node.node);
      syncNodes(prevNodes, updatedNodes);
    } else {
      console.debug(`${Date.now()}: Apparent network changes will not be synced to the server`);
    }
  }, [nodes, selectedNode, runNode, syncNodes]);

  const handleConnectionsChanged = useCallback(async () => {
    if (shouldSyncConnectionsRef.current !== true) {
      console.debug(`${Date.now()}: Apparent network changes will not be synced to the server`);
      return;
    }

    console.debug(`${Date.now()}: Connections changed, will sync connections to server`);
    const prevConnections = prevConnectionsRef.current;
    syncConnections(prevConnections, connections);
  }, [connections, syncConnections]);

  //////////////////////////////
  // React Hooks
  //////////////////////////////

  useEffect(() => {
    fetchNodesForProject();
    fetchConnectionsForProject();
  }, [fetchNodesForProject, fetchConnectionsForProject]);

  useEffect(() => {
    handleNodesChanged();
  }, [handleNodesChanged]);

  useEffect(() => {
    handleConnectionsChanged();
  }, [handleConnectionsChanged]);

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
              fetchNodesForProject={fetchNodesForProject}
              nodes={nodes}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              connections={connections}
              updateConnections={updateConnections}
              runNode={runNode}
              updateNodes={updateNodes}
            />
          </div>
          <div className="left-pane-bottom">
            <ParametersPane node={selectedNode} updateNodes={updateNodes} />
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
