import { NetworkEditorUtils as neu } from './Utils';
import { VisualNode, VisualConnection, WireState } from './NetworkTypes';
import PlayButton from './assets/PlayButton';
import './Node.css';
import { NodeRunType, OutputState } from '../../shared/types/src/models/node';
import { useState, useRef, useEffect, useCallback } from 'react';

interface NodeProps {
  node: VisualNode;
  isSelected: boolean;
  connections: VisualConnection[];
  wireState: WireState;
  handleMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  startDrawingWire: (nodeId: string, outputIndex: number, startX: number, startY: number) => void;
  endDrawingWire: (toNodeId: string, inputIndex: number) => void;
  disconnectWire: (connectionId: string) => void;
  runNode: (node: VisualNode, shouldSync?: boolean) => Promise<(OutputState | null)[]>;
  updateNodeLabel: (nodeId: string, label: string) => void;
}

export const Node = ({ node, isSelected, connections, wireState, handleMouseDown, startDrawingWire, endDrawingWire, disconnectWire, runNode, updateNodeLabel }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.node.label || '');
  const foreignObjectRef = useRef<SVGForeignObjectElement>(null);

  const handleConnectionClick = (e: React.MouseEvent, isInputPort: boolean, connectionId: string | null = null, nodeId: string, inputIndex: number) => {
    if (connectionId) {
      // Immediately start a new connection if the clicked port is an output port
      if (isInputPort) {
        if (wireState.isDrawing) {
          endDrawingWire(nodeId, inputIndex);
        } else {
          disconnectWire(connectionId);
        }
      } else {
        startDrawingWire(nodeId, inputIndex, e.clientX, e.clientY);
      }
    } else {
      if (isInputPort) {
        endDrawingWire(nodeId, inputIndex);
      } else {
        startDrawingWire(nodeId, inputIndex, e.clientX, e.clientY);
      }
    }
  }

  // Handle edit completion
  const handleEditComplete = useCallback(() => {
    setIsEditing(false);
    if (editValue !== node.node.label) {
      updateNodeLabel(node.node.nodeId, editValue);
    }
  }, [node, editValue, updateNodeLabel]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (foreignObjectRef.current && !foreignObjectRef.current.contains(event.target as Node)) {
        handleEditComplete();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, editValue, handleEditComplete]);

  return (
    <g
      key={node.node.nodeId}
      onMouseDown={(e) => handleMouseDown(e, node.node.nodeId)}
      className="node-g">

      {/* Node Label */}
      {!isEditing ? (
        <text
          x={node.x - 5}
          y={node.y + neu.NODE_HEIGHT / 2}
          className="node-label"
          textAnchor="end"
          dominantBaseline="middle"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {node.node.label || 'unlabeled'}
        </text>
      ) : (
        <foreignObject
          ref={foreignObjectRef}
          x={node.x - 100}
          y={node.y + neu.NODE_HEIGHT / 2 - 12}
          width="80"
          height="24"
        >
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditComplete();
              }
              e.stopPropagation();
            }}
            className="node-label-input"
            autoFocus
          />
        </foreignObject>
      )}

      {/* Node Rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={neu.NODE_WIDTH}
        height={neu.NODE_HEIGHT}
        className={`node-rectangle ${isSelected ? "selected" : ""}`}
      // className={`node-rectangle`}
      />

      {/* Node Name */}
      <text
        x={node.x + neu.NODE_WIDTH / 2}
        y={node.y + neu.NODE_HEIGHT / 2}
        className="node-name"
      >
        {node.node.name}
      </text>

      {/* Play Button */}
      {node.node.nodeRunType === NodeRunType.Cache && (
        <foreignObject
          x={node.x + neu.NODE_WIDTH + 5}
          y={node.y + (neu.NODE_HEIGHT / 2) - 10}
          width="20"
          height="20"
        >
          <div className="node-play-button-container">
            <button
              className="node-play-button"
              onClick={(e) => {
                e.stopPropagation();
                runNode(node, true);
              }}
              title="Run node"
            >
              <PlayButton />
            </button>
          </div>
        </foreignObject>
      )}

      {/* Input Ports */}
      {Array.from({ length: node.node.inputs }).map((_, i) => {
        const pos = neu.getPortPosition(node, true, i);
        const connection = connections.find(
          conn => conn.connection.toNode === node.node.nodeId && conn.connection.toInput === i
        );

        return (
          <g key={`input-${i}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={neu.PORT_RADIUS}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleConnectionClick(e, true, connection?.connection.connectionId, node.node.nodeId, i)
              }}
              className={`node-input-port ${connection && "connected"} ${wireState.isDrawing && "drawing"}`}
            />
          </g>
        );
      })}

      {/* Output Ports */}
      {Array.from({ length: node.node.outputs }).map((_, i) => {
        const pos = neu.getPortPosition(node, false, i);
        const connection = connections.find(
          conn => conn.connection.fromNode === node.node.nodeId && conn.connection.fromOutput === i
        );

        return (
          <circle
            key={`output-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={neu.PORT_RADIUS}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleConnectionClick(e, false, connection?.connection.connectionId, node.node.nodeId, i)
            }}
            className="node-output-port"
          />
        );
      })}
    </g>
  )
};
