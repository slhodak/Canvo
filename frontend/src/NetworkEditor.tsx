import React, { useState, useRef } from 'react';
import { NodeModel, Node } from './Node';
import './NetworkEditor.css';
import { NetworkEditorUtils as neu } from './Utils';

export interface Connection {
  id: string;
  fromNode: string;
  fromOutput: number;
  toNode: string;
  toInput: number;
}

export interface DragState {
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
  const [nodes, setNodes] = useState<NodeModel[]>([
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

  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseDownInNode = (e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDragState({
      isDragging: true,
      nodeId,
      offsetX: e.clientX - node.x,
      offsetY: e.clientY - node.y,
    });
  }

  const handleMouseDownInEditor = () => {
    if (wireState.isDrawing) {
      setDragState({
        isDragging: false,
        nodeId: null,
        offsetX: 0,
        offsetY: 0,
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
    setDragState({
      isDragging: false,
      nodeId: null,
      offsetX: 0,
      offsetY: 0,
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
    setConnections(connections.filter(conn => conn.id !== connectionId));
  };

  const endDrawingWire = (toNodeId: string, inputIndex: number) => {
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
  }, []);

  return (
    <div className="network-editor-container">
      <div className="network-editor-header">
        <h3>Network Editor</h3>
      </div>

      <svg
        ref={svgRef}
        className="network-editor-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDownInEditor}
        onMouseUp={handleMouseUp}
      >
        {/* Connections */}
        {connections.map(conn => {
          const fromNode = nodes.find(n => n.id === conn.fromNode);
          const toNode = nodes.find(n => n.id === conn.toNode);
          if (!fromNode || !toNode) return null;

          const start = neu.getPortPosition(fromNode, false, conn.fromOutput);
          const end = neu.getPortPosition(toNode, true, conn.toInput);

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
        {nodes.map(node => (
          <Node
            key={node.id} node={node}
            connections={connections}
            handleMouseDown={handleMouseDownInNode}
            startDrawingWire={startDrawingWire}
            endDrawingWire={endDrawingWire}
            disconnectWire={disconnectWire} />
        ))}
      </svg>
    </div>
  );
};

export default NetworkEditor;
