import './Project.css';
import { useState, useEffect, useCallback } from 'react';
import { ProjectModel } from '../../shared/types/src/models/project';
import { VisualNode, VisualConnection } from './NetworkTypes';
import { BaseNode } from '../../shared/types/src/models/node';
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

const Project = ({ user, project, handleProjectTitleChange }: ProjectProps) => {
  const [nodes, setNodes] = useState<Record<string, VisualNode>>({});
  const [connections, setConnections] = useState<VisualConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [nodePropertyChanges, setNodePropertyChanges] = useState<number>(0);
  const [viewText, setViewText] = useState<string>('');

  const handleNodePropertyChanged = () => {
    setNodePropertyChanges(nodePropertyChanges + 1);
    // Let the node know that its properties have changed
    const node = nodes[selectedNode?.id ?? ''];
    if (node) {
      node.node.setDirty();
      if (node.node.runsAutomatically) {
        runNode(node);
      }
    }
  }

  const updateNode = async (node: BaseNode) => {
    const currentNodes = nodes;
    const visualNode = {
      id: node.nodeId,
      node: node,
      x: node.coordinates.x,
      y: node.coordinates.y,
    };
    const updatedNodes = { ...currentNodes, [node.nodeId]: visualNode };
    setNodes(updatedNodes);
    await syncNodeUpdate(currentNodes, node);
  }

  // Exists on this component because node can be updated from NetworkEditor or ParametersPane
  const syncNodeUpdate = async (currentNodes: Record<string, VisualNode>, updatedNode: BaseNode) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/update_node`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node: updatedNode,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchNodesForProject();
      } else {
        console.error('Server error while updating node:', data.error);
        setNodes(currentNodes);
      }
    } catch (error) {
      console.error('Could not update node:', error);
      setNodes(currentNodes);
    }
  }

  //////////////////////////////
  // Memoized Functions
  //////////////////////////////

  const runNode = useCallback((node: VisualNode) => {
    if ('run' in node.node && typeof node.node.run === 'function') {
      node.node.run();
      // If the node is a View Node, set the view text
      if (node.node.type === 'view') {
        setViewText(node.node.properties['content'].value as string);
      }
    }
    if ('asyncRun' in node.node && typeof node.node.asyncRun === 'function') {
      node.node.asyncRun();
    }

    // Find this node's connections via it output ports
    const outputConnections = connections.filter(conn => conn.connection.fromNode === node.id);
    outputConnections.forEach(conn => {
      const descendent = nodes[conn.connection.toNode];
      if (!descendent) return;

      // Copy the output of the node to the input of the descendent
      // TODO: Do this more efficiently,
      // maybe have the descendent just read the output of the parent when it runs,
      // instead of keeping a copy of that output in its own state
      descendent.node.state.input[conn.connection.toInput] = node.node.state.output[conn.connection.fromOutput];
      runNode(descendent);
    });
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
        setNodes(visualNodes);
      } else {
        console.error('Error fetching nodes for project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching nodes for project:', error);
    }
  }, [project]);

  //////////////////////////////
  // React Hooks
  //////////////////////////////

  useEffect(() => {
    fetchNodesForProject();
  }, [fetchNodesForProject]);

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
              setConnections={setConnections}
              runNode={runNode}
              updateNode={updateNode}
            />
          </div>
          <div className="left-pane-bottom">
            <ParametersPane node={selectedNode} handleNodePropertyChanged={handleNodePropertyChanged} />
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
