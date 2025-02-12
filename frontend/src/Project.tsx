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
  const [selectedNodes, setSelectedNodes] = useState<VisualNode[]>([]);
  const [viewText, setViewText] = useState<string>('');

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
            id: object.connectionId,
            connection: object,
          });
        });
        setConnections(visualConnections);
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
      if (data.status !== 'success') {
        console.error('Server error while updating node:', data.error);
        setNodes(prevNodesRef.current);
      }
    } catch (error) {
      console.error('Could not update node:', error);
      setNodes(prevNodesRef.current);
    }
  }, [project.projectId]);

  const syncNodesUpdate = useCallback(async (updatedNodes: BaseNode[]) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/update_nodes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.projectId,
          nodes: updatedNodes,
        }),
      });
      const data = await response.json();
      if (data.status !== 'success') {
        console.error('Server error while updating node:', data.error);
        setNodes(prevNodesRef.current);
      }
    } catch (error) {
      console.error('Could not update node:', error);
      setNodes(prevNodesRef.current);
    }
  }, [project.projectId]);

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
      if (data.status !== 'success') {
        console.error('Error deleting node:', data.error);
        setNodes(prevNodesRef.current);
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      setNodes(prevNodesRef.current);
    }
  }, [project.projectId]);

  //////////////////////////////
  // Run & Select Nodes
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

  const selectNodes = useCallback(async (selectedNodes: VisualNode[]) => {
    setSelectedNodes(selectedNodes);
    // Only run automatically if a single node is selected
    if (selectedNodes.length === 1 && selectedNodes[0].node.runsAutomatically) {
      await runNode(selectedNodes[0]);
      await syncNodesUpdate(Object.values(nodes).map(n => n.node));
    }
  }, [runNode, syncNodesUpdate, nodes]);

  ///////////////////////////////////////
  // Node & Connection CRUD Handlers
  ///////////////////////////////////////

  const addNode = useCallback(async (node: VisualNode) => {
    setNodes(prevNodes => ({ ...prevNodes, [node.node.nodeId]: node }));
    await syncNodeAdd(node.node);
  }, [syncNodeAdd]);

  const updateNode = useCallback(async (node: VisualNode, shouldRun: boolean = true, shouldSync: boolean = true) => {
    setNodes(prevNodes => ({ ...prevNodes, [node.node.nodeId]: node }));
    // The updated nodes above may/will not be available immediately for runNode to find the new data
    if (shouldRun) {
      await runNode(node);
    }
    if (shouldSync) {
      // TODO: Sync only the subgraph that was updated
      console.debug(`${Date.now()}: Syncing all nodes after update`);
      await syncNodesUpdate(Object.values(nodes).map(n => n.node));
    }
  }, [runNode, syncNodesUpdate, nodes]);

  const deleteNode = useCallback(async (node: VisualNode) => {
    const newNodes = { ...nodes };
    delete newNodes[node.id];
    setSelectedNodes(prev => prev.filter(n => n.id !== node.id));
    setNodes(newNodes);
    await syncNodeDelete(node);
  }, [nodes, syncNodeDelete]);

  const updateConnections = async (updatedConnections: VisualConnection[], shouldSync: boolean = true) => {
    setConnections(updatedConnections);
    if (shouldSync) {
      await syncConnections(prevConnectionsRef.current, updatedConnections);
    }
  }

  //////////////////////////////
  // Sync Connections
  //////////////////////////////

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
        setConnections(prevConnections);
      }
    } catch (error) {
      console.error('Could not update connections:', error);
      setConnections(prevConnections);
    }
  }, [fetchConnectionsForProject, project.projectId]);

  //////////////////////////////
  // React Hooks
  //////////////////////////////

  useEffect(() => {
    // setViewText('');
    setSelectedNodes([]);
    fetchNodesForProject();
    fetchConnectionsForProject();
  }, [fetchNodesForProject, fetchConnectionsForProject]);

  useEffect(() => {
    console.log(`${Date.now()}: Nodes updated`);
  }, [nodes]);

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
              selectedNodes={selectedNodes}
              selectNodes={selectNodes}
              addNode={addNode}
              updateNode={updateNode}
              deleteNode={deleteNode}
              connections={connections}
              updateConnections={updateConnections}
              runNode={runNode}
            />
          </div>
          <div className="left-pane-bottom">
            <ParametersPane node={selectedNodes[0]} updateNode={updateNode} />
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
