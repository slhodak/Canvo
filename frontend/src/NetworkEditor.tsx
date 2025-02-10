import { useState, useRef, useEffect, useCallback } from 'react';
import './NetworkEditor.css';
import { VisualNode, VisualConnection, DragState, WireState } from './NetworkTypes';
import { Node } from './Node';
import { NetworkEditorUtils as neu } from './Utils';
import { BaseNode, Connection, Coordinates, NodeType } from '../../shared/types/src/models/node';
import { SERVER_URL } from './constants';
import { NodeUtils as nu } from './Utils';
import { ProjectModel } from '../../shared/types/src/models/project';
import { UserModel } from '../../shared/types/src/models/user';

interface NetworkEditorProps {
  user: UserModel;
  project: ProjectModel;
  fetchNodesForProject: () => void;
  nodes: Record<string, VisualNode>;
  setNodes: (nodes: Record<string, VisualNode>) => void;
  selectedNode: VisualNode | null;
  setSelectedNode: (node: VisualNode | null) => void;
  connections: VisualConnection[];
  setConnections: (connections: VisualConnection[]) => void;
  runNode: (node: VisualNode) => void;
  updateNode: (node: BaseNode, shouldSync: boolean) => void;
}

const NetworkEditor = ({
  user,
  project,
  fetchNodesForProject,
  nodes,
  setNodes,
  selectedNode,
  setSelectedNode,
  connections,
  setConnections,
  runNode,
  updateNode,
}: NetworkEditorProps) => {
  const [mousePosition, setMousePosition] = useState<Coordinates>({ x: 0, y: 0 });
  const [isHoveringEditor, setIsHoveringEditor] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<Coordinates>({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    nodeId: null,
    offsetX: 0,
    offsetY: 0,
    hasMoved: false,
  });
  const [wireState, setWireState] = useState<WireState>({
    isDrawing: false,
    fromNode: null,
    fromOutput: null,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  //////////////////////////////
  // Regular Functions
  //////////////////////////////

  const createNewNode = (type: NodeType, position: Coordinates): BaseNode | null => {
    const nodeId = crypto.randomUUID();
    const newNodes = { ...nodes };
    const newNode = nu.newNode(type, user.userId, project.projectId, position);
    if (!newNode) {
      console.error('Could not create new node');
      return null;
    }

    newNodes[nodeId] = {
      id: nodeId,
      node: newNode,
      x: position.x,
      y: position.y,
    };

    setNodes(newNodes);
    setShowDropdown(false);
    return newNode;
  }

  const syncNewNode = async (currentNodes: Record<string, VisualNode>, newNode: BaseNode) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/new_node`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node: newNode,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchNodesForProject();
      } else {
        console.error('Server error while creating node:', data.error);
        setNodes(currentNodes);
      }
    } catch (error) {
      console.error('Could not sync new node:', error);
      setNodes(currentNodes);
    }
  };

  const deleteConnection = (connectionId: string) => {
    setConnections(connections.filter(conn => conn.id !== connectionId));
    // Rerun the node whose input was disconnected
    /// TODO: Fix because this won't work since setConnections is async
    const toNode = nodes[connections.find(conn => conn.id === connectionId)?.connection.toNode ?? ''];
    if (toNode) {
      runNode(toNode);
    }
  }

  //////////////////////////////
  // Event Handlers
  //////////////////////////////

  const handleNewNodeClick = async (nodeType: NodeType) => {
    const currentNodes = nodes;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) {
      console.error('Cannot make new node: no SVG element available to find mouse position');
      return;
    }

    const offsetMousePosition = {
      x: mousePosition.x - svgRect.left,
      y: mousePosition.y - svgRect.top,
    }

    const newNode = createNewNode(nodeType, offsetMousePosition);
    if (!newNode) return;

    await syncNewNode(currentNodes, newNode);
  }

  const handleMouseDownInNode = (e: React.MouseEvent, nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return;

    setSelectedNode(node);
    if (node.node.runsAutomatically) {
      runNode(node);
    }

    setDragState({
      isDragging: true,
      nodeId,
      offsetX: e.clientX - node.x,
      offsetY: e.clientY - node.y,
      hasMoved: false,
    });
  }

  const handleMouseDownInEditor = () => {
    setShowDropdown(false);
    if (wireState.isDrawing) {
      setDragState({
        isDragging: false,
        nodeId: null,
        offsetX: 0,
        offsetY: 0,
        hasMoved: false,
      });
      setWireState({
        isDrawing: false,
        fromNode: null,
        fromOutput: null,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
      });
    }
  };

  const handleMouseUp = () => {
    if (dragState.isDragging && dragState.nodeId) {
      const draggedNode = nodes[dragState.nodeId];
      if (!draggedNode) return;

      draggedNode.node.coordinates.x = draggedNode.x;
      draggedNode.node.coordinates.y = draggedNode.y;
      if (dragState.hasMoved) {
        updateNode(draggedNode.node, false);
      }
    }

    setDragState({
      isDragging: false,
      nodeId: null,
      offsetX: 0,
      offsetY: 0,
      hasMoved: false,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragState.isDragging && dragState.nodeId) {
      dragState.hasMoved = true;
      const draggedNode = nodes[dragState.nodeId];
      if (!draggedNode) return;

      draggedNode.x = e.clientX - dragState.offsetX;
      draggedNode.y = e.clientY - dragState.offsetY;

      nodes[dragState.nodeId] = draggedNode;
      setNodes(nodes);
    }

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (svgRect && wireState.isDrawing) {
      // Get SVG coordinates
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;

      setWireState(prev => ({
        ...prev,
        endX: x,
        endY: y,
      }));
    }

    setMousePosition({
      x: e.clientX,
      y: e.clientY,
    });
  }

  const startDrawingWire = (nodeId: string, outputIndex: number, startX: number, startY: number) => {
    if (svgRef.current) {
      // Get SVG coordinates
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = startX - svgRect.left;
      const y = startY - svgRect.top;

      setWireState({
        isDrawing: true,
        fromNode: nodeId,
        fromOutput: outputIndex,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
      });
    }
  };

  const disconnectWire = (connectionId: string) => {
    deleteConnection(connectionId);
  };

  const endDrawingWire = (toNodeId: string, inputIndex: number) => {
    if (wireState.isDrawing && wireState.fromNode && wireState.fromOutput !== null) {
      createNewConnection(wireState.fromNode, wireState.fromOutput, toNodeId, inputIndex);
    }
    setWireState({
      isDrawing: false,
      fromNode: null,
      fromOutput: null,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    });
  };

  //////////////////////////////
  // Memoized Functions
  //////////////////////////////

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
        user.userId,
        project.projectId,
        fromNodeId,
        fromOutput,
        toNodeId,
        inputIndex,
      ),
    };
    setConnections([...newConnections, newConnection]);

    // Run the toNode
    const toNode = nodes[toNodeId];
    if (toNode) {
      runNode(toNode);
    }
  }, [connections, nodes, runNode, setConnections, project.projectId, user.userId]);

  const deleteNode = useCallback(async (node: VisualNode) => {
    const originalNodes = { ...nodes };
    const newNodes = { ...nodes };
    delete newNodes[node.id];
    setNodes(newNodes);
    setSelectedNode(null);

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
        fetchNodesForProject();
      } else {
        console.error('Error deleting node:', data.error);
        setNodes(originalNodes);
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      setNodes(originalNodes);
    }
  }, [nodes, fetchNodesForProject, project.projectId, setNodes, setSelectedNode]);

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
        deleteNode(selectedNode);
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
        // Cancel wire drawing
        setWireState({
          isDrawing: false,
          fromNode: null,
          fromOutput: null,
          startX: 0,
          startY: 0,
          endX: 0,
          endY: 0,
        });
        return;
      }

      if (event.key === 't' && isHoveringEditor && selectedNode) {
        connectToViewNode(selectedNode);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, nodes, isHoveringEditor, mousePosition, connectToViewNode, deleteNode]);

  return (
    <div className="network-editor-container">
      <div className="network-editor-header">
        <h3>Network Editor</h3>
      </div>

      <svg
        ref={svgRef}
        className="network-editor-canvas"
        onMouseEnter={() => setIsHoveringEditor(true)}
        onMouseLeave={() => setIsHoveringEditor(false)}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDownInEditor}
        onMouseUp={handleMouseUp}
      >
        {/* Connections */}
        {connections.map(conn => {
          const fromNode = nodes[conn.connection.fromNode];
          const toNode = nodes[conn.connection.toNode];
          if (!fromNode || !toNode) return null;

          const start = neu.getPortPosition(fromNode, false, conn.connection.fromOutput);
          const end = neu.getPortPosition(toNode, true, conn.connection.toInput);

          return (
            <path
              key={conn.id}
              d={`M ${start.x} ${start.y} C ${start.x} ${start.y + 50}, ${end.x} ${end.y - 50}, ${end.x} ${end.y}`}
              className="network-editor-wire"
            />
          );
        })}

        {/* Drawing Wire */}
        {wireState.isDrawing && (
          <path
            d={`M ${wireState.startX} ${wireState.startY} C ${wireState.startX} ${wireState.startY + 50}, ${wireState.endX} ${wireState.endY - 50}, ${wireState.endX} ${wireState.endY}`}
            className="network-editor-drawing-wire"
          />
        )}

        {/* Nodes */}
        {Object.values(nodes).map(node => {
          const isSelected = selectedNode?.id === node.id;

          return (
            <Node
              key={node.id}
              node={node}
              isSelected={isSelected}
              connections={connections}
              wireState={wireState}
              handleMouseDown={handleMouseDownInNode}
              startDrawingWire={startDrawingWire}
              endDrawingWire={endDrawingWire}
              disconnectWire={disconnectWire}
            />
          );
        })}
      </svg>
      {showDropdown && (
        <div
          className={`app-dropdown ${showDropdown ? 'visible' : ''}`}
          style={{
            left: dropdownPosition.x,
            top: dropdownPosition.y
          }}
        >
          <div className="app-dropdown-option" onClick={() => handleNewNodeClick(NodeType.Text)}>
            Text Node
          </div>
          <div className="app-dropdown-option" onClick={() => handleNewNodeClick(NodeType.Prompt)}>
            Prompt Node
          </div>
          <div className="app-dropdown-option" onClick={() => handleNewNodeClick(NodeType.Save)}>
            Save Node
          </div>
          <div className="app-dropdown-option" onClick={() => handleNewNodeClick(NodeType.View)}>
            View Node
          </div>
          <div className="app-dropdown-option" onClick={() => handleNewNodeClick(NodeType.Merge)}>
            Merge Node
          </div>
        </div>
      )}

    </div>
  );
};

export default NetworkEditor;
