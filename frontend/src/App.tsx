import './App.css'
import NetworkEditor from './NetworkEditor';
import { VisualNode, VisualConnection } from './NetworkTypes';
import ParametersPane from './ParametersPane';
import OutputView from './OutputView';
import Menu from './Menu';
import { useState, useEffect, useCallback } from 'react';
import {
  // TextNode, PromptNode, SaveNode, ViewNode, MergeNode,
  Connection, BaseNode, Coordinates } from '../../shared/types/src/models/node';
import { NodeType } from '../../shared/types/src/types';
import { ProjectModel } from '../../shared/types/src/models/project';
import { SERVER_URL } from './constants';

const App = () => {
  const [project, setProject] = useState<ProjectModel | null>(null);
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [nodes, setNodes] = useState<Record<string, VisualNode>>({});
  const [connections, setConnections] = useState<VisualConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [nodePropertyChanges, setNodePropertyChanges] = useState<number>(0);
  const [viewText, setViewText] = useState<string>('');
  const [isHoveringEditor, setIsHoveringEditor] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<Coordinates>({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState<Coordinates>({ x: 0, y: 0 });

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

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({
      x: event.clientX,
      y: event.clientY,
    });
  }

  const createNewNode = async (type: NodeType) => {
    const nodeId = crypto.randomUUID();
    // const newNodes = { ...nodes };
    // const newNode = (() => {
    //   switch (type) {
    //     case NodeType.Text:
    //       return new TextNode(newId);
    //     case NodeType.Prompt:
    //       return new PromptNode(newId);
    //     case NodeType.Save:
    //       return new SaveNode(newId);
    //     case NodeType.View:
    //       return new ViewNode(newId);
    //     case NodeType.Merge:
    //       return new MergeNode(newId);
    //   }
    // })();

    // newNodes[newId] = {
    //   id: newId,
    //   node: newNode,
    //   x: mousePosition.x,
    //   y: mousePosition.y,
    // };

    // setNodes(newNodes);
    setShowDropdown(false);
    // Post the node to the server

    // TODO: Move this outside this function. Undo it on the frontend if the post fails
    try {
      const response = await fetch(`${SERVER_URL}/api/new_node`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project?._id,
          node_id: nodeId,
          type: type as string,
          coordinates: {
            x: dropdownPosition.x,
            y: dropdownPosition.y,
          },
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchNodesForProject();
      } else {
        console.error('Error creating node:', data.error);
      }
    } catch (error) {
      console.error('Error creating node:', error);
    }
  };

  const deleteConnection = (connectionId: string) => {
    setConnections(connections.filter(conn => conn.id !== connectionId));
    // Erase the input that was disconnected from the toNode and rerun the node
    const toNode = nodes[connections.find(conn => conn.id === connectionId)?.connection.toNode ?? ''];
    if (toNode) {
      toNode.node.state.input[connections.find(conn => conn.id === connectionId)?.connection.toInput ?? 0] = {
        stringValue: null,
        numberValue: null,
      };
    }
  }

  const fetchAllProjects = async () => {
    const response = await fetch(`${SERVER_URL}/api/get_all_projects`, {
      credentials: 'include',
    });
    const data = await response.json();
    setProjects(data.projects);
  }

  const handleProjectTitleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!project) return;

    const newTitle = event.target.value;
    setProject({ ...project, title: newTitle });
    await updateProjectTitle(project.title, newTitle);
  }

  const updateProjectTitle = async (originalTitle: string, newTitle: string) => {
    if (!project) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/update_project_title`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: project._id, title: newTitle }),
      });
      const data = await response.json();
      if (data.status == 'success') {
        await fetchAllProjects();
      } else {
        console.error('Error updating project title:', data.error);
        setProject({ ...project, title: originalTitle });
      }
    } catch (error) {
      console.error('Error updating project title:', error);
      setProject({ ...project, title: originalTitle });
    }
  }

  //////////////////////////////
  // Memoized Functions
  //////////////////////////////

  const fetchNodesForProject = useCallback(async () => {
    if (!project) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/get_nodes_for_project/${project._id}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        const visualNodes = data.nodes.map((node: BaseNode) => ({
          id: node._id,
          node: node,
          x: node.coordinates.x,
          y: node.coordinates.y,
        }));
        setNodes(visualNodes);
      } else {
        console.error('Error fetching nodes for project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching nodes for project:', error);
    }
  }, [project]);

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

  const createNewConnection = useCallback((fromNodeId: string, fromOutput: number, toNodeId: string, inputIndex: number) => {
    // Don't create a redundant connection
    const existingConnection = connections.find(conn => (
      conn.connection.fromNode === fromNodeId &&
      conn.connection.toNode === toNodeId &&
      conn.connection.toInput === inputIndex
    ));
    if (existingConnection) {
      return;
    }

    let newConnections = connections;
    // If there is already a connection from any node to this node's inputIndex, remove it
    const connectionToInput = connections.find(conn => conn.connection.toNode === toNodeId && conn.connection.toInput === inputIndex);
    if (connectionToInput) {
      newConnections = connections.filter(conn => conn.id !== connectionToInput.id);
    }

    const newConnection: VisualConnection = {
      id: `${fromNodeId}-${toNodeId}-${Date.now()}`,
      connection: new Connection(
        crypto.randomUUID(),
        fromNodeId,
        fromOutput,
        toNodeId,
        inputIndex,
      ),
    };
    setConnections([...newConnections, newConnection]);

    // Copy the output of the fromNode to the input of the toNode
    const fromNode = nodes[fromNodeId];
    const toNode = nodes[toNodeId];
    if (fromNode && toNode) {
      toNode.node.state.input[inputIndex] = fromNode.node.state.output[fromOutput];
      runNode(toNode);
    }
  }, [connections, nodes, runNode]);

  const connectToViewNode = useCallback((node: VisualNode) => {
    if (node.node.outputs < 1) return;

    const viewNode = Object.values(nodes).find(n => n.node.type === 'view');
    if (viewNode) {
      createNewConnection(node.id, 0, viewNode.id, 0);
    }
  }, [nodes, createNewConnection]);

  //////////////////////////////
  // React Hooks
  //////////////////////////////

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't delete the node if the user is editing text
      const activeElement = document.activeElement;
      const isEditingText = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode && !isEditingText && isHoveringEditor) {
        const newNodes = { ...nodes };
        delete newNodes[selectedNode.id];
        setNodes(newNodes);
        setSelectedNode(null);
        return;
      }

      if (event.key === 'Tab' && isHoveringEditor) {
        event.preventDefault();
        setDropdownPosition(mousePosition);
        setShowDropdown(true);
        return;
      }

      if (event.key === 'Escape') {
        setShowDropdown(false);
        return;
      }

      if (event.key === 't' && isHoveringEditor && selectedNode) {
        connectToViewNode(selectedNode);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, nodes, isHoveringEditor, mousePosition, connectToViewNode]);

  useEffect(() => {
    fetchAllProjects();
  }, []);

  useEffect(() => {
    fetchNodesForProject();
  }, [fetchNodesForProject]);

  //////////////////////////////
  // UI Rendering
  //////////////////////////////

  return (
    <div className="app-container">
      <Menu project={project} setProject={setProject} projects={projects} fetchAllProjects={fetchAllProjects} />

      <div className="right-section">
        <div className="right-section-header">
          <input type="text" className="project-title-input" value={project?.title} onChange={handleProjectTitleChange} />
          <h2 className="app-title-header">Canvo</h2>
        </div>

        <div className="right-section-panes">
          <div className="left-pane">
            <div className="left-pane-top"
              onMouseEnter={() => setIsHoveringEditor(true)}
              onMouseLeave={() => {
                setIsHoveringEditor(false);
                setShowDropdown(false);
              }}
              onMouseMove={handleMouseMove}>
              <NetworkEditor
                nodes={nodes}
                setNodes={setNodes}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                setShowDropdown={setShowDropdown}
                connections={connections}
                createNewConnection={createNewConnection}
                deleteConnection={deleteConnection}
                runNode={runNode}
              />
              {showDropdown && (
                <div
                  className={`app-dropdown ${showDropdown ? 'visible' : ''}`}
                  style={{
                    left: dropdownPosition.x,
                    top: dropdownPosition.y
                  }}
                >
                  <div className="app-dropdown-option" onClick={() => createNewNode(NodeType.Text)}>
                    Text Node
                  </div>
                  <div className="app-dropdown-option" onClick={() => createNewNode(NodeType.Prompt)}>
                    Prompt Node
                  </div>
                  <div className="app-dropdown-option" onClick={() => createNewNode(NodeType.Save)}>
                    Save Node
                  </div>
                  <div className="app-dropdown-option" onClick={() => createNewNode(NodeType.View)}>
                    View Node
                  </div>
                  <div className="app-dropdown-option" onClick={() => createNewNode(NodeType.Merge)}>
                    Merge Node
                  </div>
                </div>
              )}
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
    </div>
  );
}

export default App;


// TODO: The frontend is responsible for handling cascading,
// and it only sends requests to the backend to handle prompt querying
// Use this cascading logic but adapt it to be run by the frontend
// ... or actually don't because I think the frontend already does descendent node running
// In any case I wasn't ready to delete this code yet

// const errors: string[] = [];
// let outputs: number = 0;
// // Transformation cascading: running a transformation will run all of its (unlocked) child transformations
// // This is done iteratively insted of recursively in order to collect errors and the total count of outputs
// try {
//   const queue = [node];
//   while (queue.length > 0) {
//     const node = queue.shift();
//     if (!node) {
//       break;
//     }

//     const block = await db.getBlock(transformation.input_block_id, user._id);
//     if (!block) {
//       errors.push(`Block not found for transformation: ${transformation.input_block_id}`);
//       continue;
//     }

//     if (block.locked || transformation.locked) {
//       continue;
//     }

//     // Run the transformation and store the results
//     const transformationResult: TransformationResult = await runTransformation(transformation, user._id);
//     outputs += transformationResult.outputs;
//     errors.push(...transformationResult.errors);
//     queue.push(...transformationResult.childTransformations);
//   }

//   await db.updateGroupUpdatedAt(groupId);

//   return res.json({ status: "success", outputs, errors });

// } catch (error) {
//   if (error instanceof Error) {
//     return res.status(500).json({ status: "failed", error: error.message });
//   } else {
//     return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
//   }
// }
