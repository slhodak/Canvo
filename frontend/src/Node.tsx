import { useState, useRef, useEffect, useCallback } from 'react';
import './Node.css';
import { NetworkEditorUtils as neu } from './Utils';
import { VisualNode, VisualConnection, WireState } from './NetworkTypes';
import PlayButton from './assets/PlayButton';
import { NodeRunType, syncNodeUpdate } from 'wc-shared';
import { SERVER_URL } from './constants';

interface NodeProps {
  node: VisualNode;
  isSelected: boolean;
  isDisplaying: boolean;
  connections: VisualConnection[];
  wireState: WireState;
  updateDisplayedNode: (node: VisualNode) => void;
  handleMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  startDrawingWire: (nodeId: string, outputIndex: number, startX: number, startY: number) => void;
  endDrawingWire: (toNodeId: string, inputIndex: number) => void;
  deleteConnection: (connectionId: string) => void;
  runNode: (node: VisualNode, shouldSync?: boolean) => void;
}

export const Node = ({ node, isSelected, isDisplaying, connections, wireState, updateDisplayedNode, handleMouseDown, startDrawingWire, endDrawingWire, deleteConnection, runNode }: NodeProps) => {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [nodeLabel, setNodeLabel] = useState('');
  const labelInputRef = useRef<SVGForeignObjectElement>(null);

  const handlePortClick = (e: React.MouseEvent, isInputPort: boolean, connectionId: string | null = null, nodeId: string, inputIndex: number) => {
    if (!isInputPort) {
      // Immediately start a new connection if the clicked port is an output port
      startDrawingWire(nodeId, inputIndex, e.clientX, e.clientY);
    } else {
      if (connectionId) { // An existing connection
        if (wireState.isDrawing) {
          endDrawingWire(nodeId, inputIndex);
        } else {
          deleteConnection(connectionId);
        }
      } else {
        endDrawingWire(nodeId, inputIndex);
      }
    }
  }

  // Handle edit completion
  const handleEditComplete = useCallback(() => {
    setIsEditingLabel(false);
    if (nodeLabel !== node.node.label) {
      node.node.label = nodeLabel;
      syncNodeUpdate(node.node, SERVER_URL);
    }
  }, [node, nodeLabel]);

  // Handle click outside label input
  useEffect(() => {
    const handleClickOutsideLabel = (event: MouseEvent) => {
      if (labelInputRef.current && !labelInputRef.current.contains(event.target as Node)) {
        handleEditComplete();
      }
    };

    if (isEditingLabel) {
      document.addEventListener('mousedown', handleClickOutsideLabel);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideLabel);
    };
  }, [isEditingLabel, nodeLabel, handleEditComplete]);

  useEffect(() => {
    setNodeLabel(node.node.label || 'unlabeled');
  }, [node]);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    // Don't select the node if clicking on the display flag
    if ((e.target as SVGElement).classList.contains('node-display-flag')) {
      updateDisplayedNode(node);
      return;
    }
    handleMouseDown(e, nodeId);
  };

  return (
    <g
      key={node.node.nodeId}
      onMouseDown={(e) => handleNodeMouseDown(e, node.node.nodeId)}
      className="node-g">

      {/* Node Label */}
      {!isEditingLabel ? (
        <text
          x={node.x - 5}
          y={node.y + neu.NODE_HEIGHT / 2}
          className="node-label"
          textAnchor="end"
          dominantBaseline="middle"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditingLabel(true);
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

      {/* Display Flag - in front of the rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={14}
        height={neu.NODE_HEIGHT}
        className={`node-display-flag ${isDisplaying ? "displaying" : ""}`}
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
      {node.node.runType === NodeRunType.Manual && (
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
                runNode(node);
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
                handlePortClick(e, true, connection?.connection.connectionId, node.node.nodeId, i)
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
              handlePortClick(e, false, connection?.connection.connectionId, node.node.nodeId, i)
            }}
            className="node-output-port"
          />
        );
      })}
    </g>
  )
};
