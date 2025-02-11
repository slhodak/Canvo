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
  const prevNetworkRef = useRef<{ nodes: NetworkNodes, connections: NetworkConnections }>({ nodes, connections: [] });
  const shouldSyncNodesRef = useRef<boolean>(false);
  const shouldSyncConnectionsRef = useRef<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [viewText, setViewText] = useState<string>('');

  // Node may have had a property updated in the ParametersPane, or coordinates changed in the NetworkEditor
  const updateNode = async (node: BaseNode, shouldSync: boolean = true) => {
    const currentNodes = nodes;
    const visualNode = {
      id: node.nodeId,
      node: node,
      x: node.coordinates.x,
      y: node.coordinates.y,
    };
    const updatedNodes = { ...currentNodes, [node.nodeId]: visualNode };
    shouldSyncNodesRef.current = shouldSync;
    setNodes(updatedNodes);
  }

  const updateConnections = async (updatedConnections: VisualConnection[], shouldSync: boolean = true) => {
    shouldSyncConnectionsRef.current = shouldSync;
    setConnections(updatedConnections);
  }

  //////////////////////////////
  // Memoized Functions
  //////////////////////////////

  const runNode = useCallback(async (node: VisualNode) => {
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
  }, [nodes, connections]);

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
        shouldSyncNodesRef.current = false;
        setNodes(visualNodes);
      } else {
        console.error('Error fetching nodes for project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching nodes for project:', error);
    }
  }, [project]);

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


  //////////////////////////////
  // React Hooks
  //////////////////////////////

  useEffect(() => {
    fetchNodesForProject();
    fetchConnectionsForProject();
  }, [fetchNodesForProject, fetchConnectionsForProject]);

  useEffect(() => {
    const syncNodes = async (prevNodes: Record<string, VisualNode>, newNodes: BaseNode[]) => {
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
          shouldSyncNodesRef.current = false; // Do not sync nodes when we're reverting
          setNodes(prevNodes);
        }
      } catch (error) {
        console.error('Could not update node:', error);
        shouldSyncNodesRef.current = false; // Do not sync nodes when we're reverting
        setNodes(prevNodes);
      }
    }

    const syncConnections = async (prevConnections: NetworkConnections, newConnections: NetworkConnections) => {
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
    }

    const handleNetworkChanged = async () => {
      if (!selectedNode || !selectedNode.node) return;

      if (shouldSyncNodesRef.current === true) {
        console.debug(`${Date.now()}: Network changed, will rerun subnetwork and sync to server`);
        const prevNodes = prevNetworkRef.current.nodes; // Store this in case we need to revert to it
        if (selectedNode.node.runsAutomatically) {
          // This recursive function will not return until every runnable descendent node has been run
          await runNode(selectedNode);
        }
        prevNetworkRef.current = { nodes, connections };
        // Sync all the nodes to the server once the network has been fully updated
        // Even if the selected node is not runnable, its content may still have changed
        const updatedNodes = Object.values(nodes).map(node => node.node);
        syncNodes(prevNodes, updatedNodes);

      } else {
        console.debug(`${Date.now()}: Apparent network changes will not be synced to the server`);
      }

      if (shouldSyncConnectionsRef.current === true) {
        console.debug(`${Date.now()}: Network changed, will sync connections to server`);
        const prevConnections = prevNetworkRef.current.connections;
        syncConnections(prevConnections, connections);
      } else {
        console.debug(`${Date.now()}: Apparent network changes will not be synced to the server`);
      }
    };

    handleNetworkChanged();
  }, [nodes, connections, selectedNode, runNode, fetchNodesForProject, fetchConnectionsForProject, project.projectId]);

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
              setNodes={setNodes}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              connections={connections}
              updateConnections={updateConnections}
              runNode={runNode}
              updateNode={updateNode}
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
