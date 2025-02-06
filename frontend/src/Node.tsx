import { NetworkEditorUtils as neu } from './Utils';
import { VisualNode, VisualConnection, WireState } from './NetworkTypes';
import './Node.css';

interface NodeProps {
  node: VisualNode;
  isSelected: boolean;
  connections: VisualConnection[];
  wireState: WireState;
  handleMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  startDrawingWire: (nodeId: string, outputIndex: number, startX: number, startY: number) => void;
  endDrawingWire: (toNodeId: string, inputIndex: number) => void;
  disconnectWire: (connectionId: string) => void;
}

export const Node = ({ node, isSelected, connections, wireState, handleMouseDown, startDrawingWire, endDrawingWire, disconnectWire }: NodeProps) => {
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

  const nodeId = node.node.properties['id'].value as string;
  const nodeName = node.node.properties['name'].value as string;
  const nodeInputs = node.node.properties['inputs'].value as number;
  const outputsValue = node.node.properties['outputs'].value as number;

  return (
    <g
      key={nodeId}
      onMouseDown={(e) => handleMouseDown(e, nodeId)}
      className="node-g">

      {/* Node Rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={neu.NODE_WIDTH}
        height={neu.NODE_HEIGHT}
        className={`node-rectangle ${isSelected && "selected"}`}
      />

      {/* Node Name */}
      <text
        x={node.x + neu.NODE_WIDTH / 2}
        y={node.y + neu.NODE_HEIGHT / 2}
        className="node-name"
      >
        {nodeName}
      </text>

      {/* Input Ports */}
      {Array.from({ length: nodeInputs }).map((_, i) => {
        const pos = neu.getPortPosition(node, true, i);
        const connection = connections.find(
          conn => conn.connection.toNode === nodeId && conn.connection.toInput === i
        );

        return (
          <g key={`input-${i}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={neu.PORT_RADIUS}
              onMouseDown={(e) => handleConnectionClick(e, true, connection?.id, nodeId, i)}
              className={`node-input-port ${connection && "connected"} ${wireState.isDrawing && "drawing"}`}
            />
          </g>
        );
      })}

      {/* Output Ports */}
      {Array.from({ length: outputsValue }).map((_, i) => {
        const pos = neu.getPortPosition(node, false, i);
        const connection = connections.find(
          conn => conn.connection.fromNode === nodeId && conn.connection.fromOutput === i
        );

        return (
          <circle
            key={`output-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={neu.PORT_RADIUS}
            onMouseDown={(e) => handleConnectionClick(e, false, connection?.id, nodeId, i)}
            className="node-output-port"
          />
        );
      })}
    </g>
  )
};
