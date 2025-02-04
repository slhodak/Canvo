import { NetworkEditorUtils as neu } from './Utils';
import { Connection } from './NetworkEditor';
import './Node.css';

export interface NodeModel {
  id: string;
  name: string;
  x: number;
  y: number;
  inputs: number;
  outputs: number;
}

interface NodeProps {
  node: NodeModel;
  connections: Connection[];
  handleMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  startDrawingWire: (nodeId: string, outputIndex: number, startX: number, startY: number) => void;
  endDrawingWire: (toNodeId: string, inputIndex: number) => void;
  disconnectWire: (connectionId: string) => void;
}

export const Node = ({ node, connections, handleMouseDown, startDrawingWire, endDrawingWire, disconnectWire }: NodeProps) => {
  const handleConnectionClick = (e: React.MouseEvent, isInputPort: boolean, connectionId: string | null = null, nodeId: string, inputIndex: number) => {
    if (connectionId) {
      disconnectWire(connectionId);
      // Immediately start a new connection if the clicked port is an output port
      if (!isInputPort) {
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

  return (
    <g key={node.id}>
      {/* Node Rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={neu.NODE_WIDTH}
        height={neu.NODE_HEIGHT}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        className="node-rectangle"
      />

      {/* Node Name */}
      <text
        x={node.x + neu.NODE_WIDTH / 2}
        y={node.y + neu.NODE_HEIGHT / 2}
        className="node-name"
      >
        {node.name}
      </text>

      {/* Input Ports */}
      {Array.from({ length: node.inputs }).map((_, i) => {
        const pos = neu.getPortPosition(node, true, i);
        const connection = connections.find(
          conn => conn.toNode === node.id && conn.toInput === i
        );

        return (
          <g key={`input-${i}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={neu.PORT_RADIUS}
              onMouseDown={(e) => handleConnectionClick(e, true, connection?.id, node.id, i)}
              className={`node-input-port ${connection && "connected"}`}
            />
          </g>
        );
      })}

      {/* Output Ports */}
      {Array.from({ length: node.outputs }).map((_, i) => {
        const pos = neu.getPortPosition(node, false, i);
        const connection = connections.find(
          conn => conn.fromNode === node.id && conn.fromOutput === i
        );

        return (
          <circle
            key={`output-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={neu.PORT_RADIUS}
            onMouseDown={(e) => handleConnectionClick(e, false, connection?.id, node.id, i)}
            className={`node-output-port ${connection && "connected"}`}
          />
        );
      })}
    </g>
  )
};
