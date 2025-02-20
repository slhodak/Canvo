import { NetworkEditorUtils as neu } from './Utils';
import { VisualNode, VisualConnection, WireState } from './NetworkTypes';
import PlayButton from './assets/PlayButton';
import './Node.css';
import { NodeRunType, OutputState } from '../../shared/types/src/models/node';
import { useState, useRef, useEffect, useCallback } from 'react';
import { updateNode } from './api';

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
}

export const Node = ({ node, isSelected, connections, wireState, handleMouseDown, startDrawingWire, endDrawingWire, disconnectWire, runNode }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nodeLabel, setNodeLabel] = useState('');
  const labelInputRef = useRef<SVGForeignObjectElement>(null);

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

  const handleSegmentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Segment clicked for node:', node.node.nodeId);
    // Add your click handling logic here
  };

  // Handle edit completion
  const handleEditComplete = useCallback(() => {
    setIsEditing(false);
    if (nodeLabel !== node.node.label) {
      node.node.label = nodeLabel;
      updateNode(node.node.projectId, node.node);
    }
  }, [node, nodeLabel]);

  // Handle click outside label input
  useEffect(() => {
    const handleClickOutsideLabel = (event: MouseEvent) => {
      if (labelInputRef.current && !labelInputRef.current.contains(event.target as Node)) {
        handleEditComplete();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutsideLabel);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideLabel);
    };
  }, [isEditing, nodeLabel, handleEditComplete]);

  useEffect(() => {
    setNodeLabel(node.node.label || 'unlabeled');
  }, [node]);

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
          {nodeLabel}
        </text>
      ) : (
        <foreignObject
          ref={labelInputRef}
          x={node.x - 100}
          y={node.y + neu.NODE_HEIGHT / 2 - 12}
          width="80"
          height="24"
        >
          <input
            type="text"
            value={nodeLabel}
            onChange={(e) => setNodeLabel(e.target.value)}
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

      {/* Node Rectangle - adjusted x position */}
      <rect
        x={node.x}
        y={node.y}
        width={neu.NODE_WIDTH}
        height={neu.NODE_HEIGHT}
        className={`node-rectangle ${isSelected ? "selected" : ""}`}
      />

      {/* Left Segment - in front of the rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={14}
        height={neu.NODE_HEIGHT}
        className="node-left-segment"
        onClick={handleSegmentClick}
      />

      {/* Node Name - adjusted x position */}
      <text
        x={node.x + 10 + (neu.NODE_WIDTH - 10) / 2}
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
