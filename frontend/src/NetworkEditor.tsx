import { useState, useRef, useEffect, useCallback } from 'react';
import './NetworkEditor.css';
import { VisualNode, VisualConnection, DragState, WireState } from './NetworkTypes';
import { Node } from './Node';
import { ConnectionUtils as cu, NetworkEditorUtils as neu } from './Utils';
import { Coordinates, NodeType, NodeGroups, IOState } from '../../shared/types/src/models/node';
import { Connection } from '../../shared/types/src/models/connection';
import { NodeUtils as nu } from './Utils';
import { ProjectModel } from '../../shared/types/src/models/project';
import { UserModel } from '../../shared/types/src/models/user';

interface NetworkEditorProps {
  user: UserModel;
  project: ProjectModel;
  nodes: Record<string, VisualNode>;
  selectedNode: VisualNode | null;
  selectNode: (node: VisualNode) => void;
  updateDisplayedNode: (node: VisualNode) => void;
  enableIndexSelection: (fromNodeId: string, fromOutput: number, toNodeId: string, inputIndex: number) => void;
  disableIndexSelection: (connectionId: string) => void;
  addNode: (node: VisualNode) => void;
  updateNode: (node: VisualNode, shouldRun?: boolean, shouldSync?: boolean) => Promise<void>;
  deleteNode: (node: VisualNode) => void;
  connections: VisualConnection[];
  updateConnections: (connections: VisualConnection[]) => void;
  runNode: (node: VisualNode) => void;
  runPriorDAG: (node: VisualNode, shouldSync?: boolean) => Promise<IOState[]>;
}

const NetworkEditor = ({
  user,
  project,
  nodes,
  selectedNode,
  selectNode,
  updateDisplayedNode,
  enableIndexSelection,
  disableIndexSelection,
  addNode,
  updateNode,
  deleteNode,
  connections,
  updateConnections,
  runNode,
  runPriorDAG,
}: NetworkEditorProps) => {
  const [mousePosition, setMousePosition] = useState<Coordinates>({ x: 0, y: 0 });
  const [isHoveringEditor, setIsHoveringEditor] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<Coordinates>({ x: 0, y: 0 });
  const [selectedDropdownOption, setSelectedDropdownOption] = useState<NodeType | null>(null);
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
  const [panOffset, setPanOffset] = useState<Coordinates>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');

  const svgRef = useRef<SVGSVGElement>(null);

  //////////////////////////////
  // Regular Functions
  //////////////////////////////

  const createNewNode = async (type: NodeType, position: Coordinates) => {
    const nodeId = crypto.randomUUID();
    const newNode = await nu.newNode(type, user.userId, project.projectId, position);
    if (!newNode) {
      console.error('Could not create new node');
      return;
    }

    const newVisualNode: VisualNode = {
      id: nodeId,
      node: newNode,
      x: position.x,
      y: position.y,
    };

    addNode(newVisualNode);
    selectNode(newVisualNode);
    setShowDropdown(false);
  }

  const deleteConnection = (connectionId: string) => {
    updateConnections(connections.filter(conn => conn.connection.connectionId !== connectionId));
  }

  //////////////////////////////
  // Event Handlers
  //////////////////////////////

  const handleNewNodeClick = async (nodeType: NodeType) => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) {
      console.error('Cannot make new node: no SVG element available to find mouse position');
      return;
    }

    const offsetMousePosition = {
      x: mousePosition.x - svgRect.left,
      y: mousePosition.y - svgRect.top,
    }

    createNewNode(nodeType, offsetMousePosition);
  }

  const handleMouseDownInNode = async (e: React.MouseEvent, nodeId: string) => {
    // Start panning if Ctrl+left click
    if (e.button === 0 && e.ctrlKey) {
      e.preventDefault();
      setIsPanning(true);
      return;
    }

    const node = nodes[nodeId];
    if (!node) {
      console.error('Could not find clicked node:', nodeId);
      return;
    }

    selectNode(node);

    setDragState({
      isDragging: true,
      nodeId,
      offsetX: e.clientX - node.x,
      offsetY: e.clientY - node.y,
      hasMoved: false,
    });
  }

  const handleMouseDownInEditor = (e: React.MouseEvent) => {
    // Start panning on right click or Ctrl+left click
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault(); // Prevent context menu
      setIsPanning(true);
      return;
    }

    setShowDropdown(false);
    setSearchTerm('');
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
    // Stop panning on mouse up
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (dragState.isDragging && dragState.nodeId) {
      const draggedNode = nodes[dragState.nodeId];
      if (!draggedNode) return;

      draggedNode.node.coordinates.x = draggedNode.x;
      draggedNode.node.coordinates.y = draggedNode.y;
      if (dragState.hasMoved) {
        updateNode(draggedNode, false, true);
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
    // Handle panning
    if (isPanning) {
      setPanOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
      return;
    }

    if (dragState.isDragging && dragState.nodeId) {
      dragState.hasMoved = true;
      const draggedNode = nodes[dragState.nodeId];
      if (!draggedNode) return;

      draggedNode.x = e.clientX - dragState.offsetX;
      draggedNode.y = e.clientY - dragState.offsetY;

      nodes[dragState.nodeId] = draggedNode;
      updateNode(draggedNode, false, false);
    }

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (svgRect && wireState.isDrawing) {
      // Get SVG coordinates, adjust for panning and zoom
      const x = (e.clientX - svgRect.left - panOffset.x) / zoom;
      const y = (e.clientY - svgRect.top - panOffset.y) / zoom;

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
      // Get SVG coordinates and adjust for pan offset and zoom
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = (startX - svgRect.left - panOffset.x) / zoom;
      const y = (startY - svgRect.top - panOffset.y) / zoom;

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
    disableIndexSelection(connectionId);
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

  const handleWheel = (e: React.WheelEvent) => {
    // Get mouse position relative to SVG
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    // Calculate zoom
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.1), 5); // Limit zoom between 0.1x and 5x

    // Calculate new pan offset to zoom towards mouse position
    const newPanX = mouseX - (mouseX - panOffset.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - panOffset.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  //////////////////////////////
  // Memoized Functions
  //////////////////////////////

  const createNewConnection = useCallback(async (fromNodeId: string, fromOutput: number, toNodeId: string, inputIndex: number) => {
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
      id: cu.visualConnectionId(fromNodeId, fromOutput, toNodeId, inputIndex),
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
    newConnections.push(newConnection);
    enableIndexSelection(fromNodeId, fromOutput, toNodeId, inputIndex);
    updateConnections(newConnections);
    const node = nodes[toNodeId];
    if (node?.node.runOnInput()) {
      const priorInputValues = await runPriorDAG(node);
      node.node.onInputConnection(priorInputValues[inputIndex]);
    }
  }, [nodes, connections, updateConnections, enableIndexSelection, project.projectId, user.userId, runPriorDAG]);

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
        setSearchTerm('');
        return;
      }

      if (event.key === 'Escape') {
        setShowDropdown(false);
        setSearchTerm('');
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode, nodes, isHoveringEditor, mousePosition, deleteNode]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm !== '') {
      if (selectedDropdownOption) {
        handleNewNodeClick(selectedDropdownOption);
      }
    }
  };

  return (
    <div className="network-editor-container">
      <div className="network-editor-header">
        <h3>Network Editor</h3>
      </div>

      <svg
        ref={svgRef}
        className="network-editor-canvas"
        onMouseEnter={() => setIsHoveringEditor(true)}
        onMouseLeave={() => {
          setIsHoveringEditor(false);
          setIsPanning(false);  // Stop panning when mouse leaves editor
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDownInEditor}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
        onWheel={handleWheel}
      >
        {/* Update transform to include scaling */}
        <g transform={`translate(${panOffset.x},${panOffset.y}) scale(${zoom})`}>
          {/* Move all existing SVG content inside this group */}
          {/* Connections */}
          {connections.map(conn => {
            const fromNode = nodes[conn.connection.fromNode];
            const toNode = nodes[conn.connection.toNode];
            if (!fromNode || !toNode) return null;

            // Get positions and adjust for panning
            const start = neu.getPortPosition(fromNode, false, conn.connection.fromOutput);
            const end = neu.getPortPosition(toNode, true, conn.connection.toInput);

            const distance = Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2));
            const curveDistance = Math.min(80, distance * 0.5);
            // No need to adjust the path coordinates since they're now inside the transformed group
            return (
              <path
                key={`${conn.connection.fromNode}-${conn.connection.toNode}-${conn.connection.fromOutput}-${conn.connection.toInput}`}
                d={`M ${start.x} ${start.y} C ${start.x} ${start.y + curveDistance}, ${end.x} ${end.y - curveDistance}, ${end.x} ${end.y}`}
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
            const isDisplaying = node.node.display;

            return (
              <Node
                key={node.id}
                node={node}
                isSelected={isSelected}
                isDisplaying={isDisplaying}
                connections={connections}
                wireState={wireState}
                updateDisplayedNode={updateDisplayedNode}
                handleMouseDown={handleMouseDownInNode}
                startDrawingWire={startDrawingWire}
                endDrawingWire={endDrawingWire}
                disconnectWire={disconnectWire}
                runNode={runNode}
              />
            );
          })}
        </g>
      </svg>
      {showDropdown &&
        <Dropdown
          showDropdown={showDropdown}
          searchTerm={searchTerm}
          dropdownPosition={dropdownPosition}
          setSearchTerm={setSearchTerm}
          onClickDropdownOption={handleNewNodeClick}
          handleSearchKeyDown={handleSearchKeyDown}
          setSelectedDropdownOption={setSelectedDropdownOption}
        />
      }
    </div>
  );
};

export default NetworkEditor;


interface DropdownProps {
  showDropdown: boolean;
  searchTerm: string;
  dropdownPosition: Coordinates;
  setSearchTerm: (searchTerm: string) => void;
  onClickDropdownOption: (nodeType: NodeType) => void;
  handleSearchKeyDown: (e: React.KeyboardEvent) => void;
  setSelectedDropdownOption: (nodeType: NodeType) => void;
}

const Dropdown = ({ showDropdown, searchTerm, dropdownPosition, setSearchTerm, onClickDropdownOption, handleSearchKeyDown, setSelectedDropdownOption }: DropdownProps) => {
  const [firstMatch, setFirstMatch] = useState<string | null>(null);

  useEffect(() => {
    // Find first matching node type
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      for (const nodeTypes of Object.values(NodeGroups)) {
        for (const nodeType of nodeTypes) {
          if (nodeType.toLowerCase().startsWith(searchTermLower)) {
            setFirstMatch(nodeType);
            setSelectedDropdownOption(nodeType as NodeType);
            break;
          }
        }
      }
    }
  }, [searchTerm, setSelectedDropdownOption]);

  return (
    <div
      className={`app-dropdown ${showDropdown ? 'visible' : ''}`}
      style={{
        left: dropdownPosition.x,
        top: dropdownPosition.y
      }}
    >
      <input
        type="text"
        className="app-dropdown-search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        autoFocus
        placeholder="Search nodes..."
        onClick={(e) => e.stopPropagation()}
      />

      {Object.entries(NodeGroups)
        .map(([groupName, nodeTypes]) => {
          const result = [];
          result.push(<div key={groupName} className="app-dropdown-group-header">{groupName}</div>);
          for (const nodeType of nodeTypes) {
            result.push(
              <DropdownOption
                key={nodeType}
                label={nodeType}
                onClick={() => onClickDropdownOption(nodeType)}
                isHighlighted={nodeType === firstMatch}
              />
            );
          }
          return result;
        })}
    </div>
  );
};

const DropdownOption = ({ label, onClick, isHighlighted }: { label: string, onClick: () => void, isHighlighted: boolean }) => {
  return (
    <div
      className={`app-dropdown-option ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onClick}
    >
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </div>
  );
};
