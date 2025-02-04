import React, { useState, useRef } from 'react';
import './NetworkEditor.css';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  inputs: number;
  outputs: number;
}

interface Connection {
  id: string;
  fromNode: string;
  fromOutput: number;
  toNode: string;
  toInput: number;
}

interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  offsetX: number;
  offsetY: number;
}

interface WireState {
  isDrawing: boolean;
  fromNode: string | null;
  fromOutput: number | null;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const NetworkEditor = () => {
  const [nodes, setNodes] = useState<Node[]>([
    { id: '1', name: 'Input', x: 100, y: 100, inputs: 0, outputs: 1 },
    { id: '2', name: 'Process', x: 300, y: 100, inputs: 2, outputs: 1 },
    { id: '3', name: 'Output', x: 500, y: 100, inputs: 1, outputs: 0 },
  ]);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    nodeId: null,
    offsetX: 0,
    offsetY: 0,
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
  const [hoveredInput, setHoveredInput] = useState<{ nodeId: string, inputIndex: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 60;
  const PORT_RADIUS = 6;
  const PORT_MARGIN = 25;

  const getPortPosition = (node: Node, isInput: boolean, index: number) => {
    const portCount = isInput ? node.inputs : node.outputs;
    const totalWidth = (portCount - 1) * PORT_MARGIN;
    const startX = node.x + (NODE_WIDTH - totalWidth) / 2;
    const y = isInput ? node.y : node.y + NODE_HEIGHT;
    return {
      x: startX + index * PORT_MARGIN,
      y,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDragState({
      isDragging: true,
      nodeId,
      offsetX: e.clientX - node.x,
      offsetY: e.clientY - node.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragState.isDragging && dragState.nodeId) {
      const newNodes = nodes.map(node => {
        if (node.id === dragState.nodeId) {
          return {
            ...node,
            x: e.clientX - dragState.offsetX,
            y: e.clientY - dragState.offsetY,
          };
        }
        return node;
      });
      setNodes(newNodes);
    }

    if (wireState.isDrawing && svgRef.current) {
      // Get SVG coordinates
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;

      setWireState(prev => ({
        ...prev,
        endX: x,
        endY: y,
      }));
    }
  };

  const handleMouseUp = () => {
    setDragState({
      isDragging: false,
      nodeId: null,
      offsetX: 0,
      offsetY: 0,
    });
  };

  const startDrawingWire = (nodeId: string, outputIndex: number, startX: number, startY: number) => {
    setWireState({
      isDrawing: true,
      fromNode: nodeId,
      fromOutput: outputIndex,
      startX,
      startY,
      endX: startX,
      endY: startY,
    });
  };

  const endDrawingWire = (toNodeId: string, inputIndex: number) => {
    // If we're not drawing a wire, check if we should delete an existing connection
    if (!wireState.isDrawing) {
      const existingConnection = connections.find(
        conn => conn.toNode === toNodeId && conn.toInput === inputIndex
      );
      if (existingConnection) {
        setConnections(connections.filter(conn => conn.id !== existingConnection.id));
        return;
      }
    }

    // Otherwise create a new connection if we're drawing a wire
    if (wireState.isDrawing && wireState.fromNode && wireState.fromOutput !== null) {
      // Check if there's already a connection to this input
      const existingConnection = connections.find(
        conn => conn.toNode === toNodeId && conn.toInput === inputIndex
      );

      // Remove existing connection if there is one
      const filteredConnections = existingConnection
        ? connections.filter(conn => conn.id !== existingConnection.id)
        : connections;

      const newConnection: Connection = {
        id: `${wireState.fromNode}-${toNodeId}-${Date.now()}`,
        fromNode: wireState.fromNode,
        fromOutput: wireState.fromOutput,
        toNode: toNodeId,
        toInput: inputIndex,
      };
      setConnections([...filteredConnections, newConnection]);
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

  // Add useEffect for escape key handling
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array since we don't use any dependencies

  return (
    <div className="network-editor-container">
      <div className="network-editor-header">
        <h3>Network Editor</h3>
      </div>

      <svg
        ref={svgRef}
        className="network-editor-canvas"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Connections */}
        {connections.map(conn => {
          const fromNode = nodes.find(n => n.id === conn.fromNode);
          const toNode = nodes.find(n => n.id === conn.toNode);
          if (!fromNode || !toNode) return null;

          const start = getPortPosition(fromNode, false, conn.fromOutput);
          const end = getPortPosition(toNode, true, conn.toInput);

          return (
            <path
              key={conn.id}
              d={`M ${start.x} ${start.y} C ${start.x} ${start.y + 50}, ${end.x} ${end.y - 50}, ${end.x} ${end.y}`}
              stroke="black"
              fill="none"
              strokeWidth="2"
            />
          );
        })}

        {/* Drawing Wire */}
        {wireState.isDrawing && (
          <path
            d={`M ${wireState.startX} ${wireState.startY} C ${wireState.startX} ${wireState.startY + 50}, ${wireState.endX} ${wireState.endY - 50}, ${wireState.endX} ${wireState.endY}`}
            stroke="black"
            fill="none"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}

        {/* Nodes */}
        {nodes.map(node => (
          <g key={node.id}>
            {/* Node Rectangle */}
            <rect
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              fill="white"
              stroke="black"
              strokeWidth="2"
              rx="5"
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              className="node-rectangle"
            />

            {/* Node Name */}
            <text
              x={node.x + NODE_WIDTH / 2}
              y={node.y + NODE_HEIGHT / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="select-none"
            >
              {node.name}
            </text>

            {/* Input Ports */}
            {Array.from({ length: node.inputs }).map((_, i) => {
              const pos = getPortPosition(node, true, i);
              const isConnected = connections.some(
                conn => conn.toNode === node.id && conn.toInput === i
              );
              const isHovered = hoveredInput?.nodeId === node.id && hoveredInput?.inputIndex === i;

              return (
                <g key={`input-${i}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={PORT_RADIUS}
                    fill={isConnected && isHovered ? "#ff4444" : "white"}
                    stroke="black"
                    strokeWidth="2"
                    onMouseUp={() => endDrawingWire(node.id, i)}
                    onMouseEnter={() => isConnected && setHoveredInput({ nodeId: node.id, inputIndex: i })}
                    onMouseLeave={() => setHoveredInput(null)}
                    className="cursor-pointer"
                  />
                </g>
              );
            })}

            {/* Output Ports */}
            {Array.from({ length: node.outputs }).map((_, i) => {
              const pos = getPortPosition(node, false, i);
              return (
                <circle
                  key={`output-${i}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={PORT_RADIUS}
                  fill="white"
                  stroke="black"
                  strokeWidth="2"
                  onMouseDown={() => startDrawingWire(node.id, i, pos.x, pos.y)}
                  className="cursor-pointer"
                />
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default NetworkEditor;
