import { useState } from 'react';
import { NetworkEditorUtils as neu } from './Utils';
import { Connection } from './NetworkEditor';

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
}

export const Node = ({ node, connections, handleMouseDown, startDrawingWire, endDrawingWire }: NodeProps) => {
  const [hoveredInput, setHoveredInput] = useState<{ nodeId: string, inputIndex: number } | null>(null);

  return (
    <g key={node.id}>
      {/* Node Rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={neu.NODE_WIDTH}
        height={neu.NODE_HEIGHT}
        fill="white"
        stroke="black"
        strokeWidth="2"
        rx="5"
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        className="node-rectangle"
      />

      {/* Node Name */}
      <text
        x={node.x + neu.NODE_WIDTH / 2}
        y={node.y + neu.NODE_HEIGHT / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="select-none"
      >
        {node.name}
      </text>

      {/* Input Ports */}
      {Array.from({ length: node.inputs }).map((_, i) => {
        const pos = neu.getPortPosition(node, true, i);
        const isConnected = connections.some(
          conn => conn.toNode === node.id && conn.toInput === i
        );
        const isHovered = hoveredInput?.nodeId === node.id && hoveredInput?.inputIndex === i;

        return (
          <g key={`input-${i}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={neu.PORT_RADIUS}
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
        const pos = neu.getPortPosition(node, false, i);
        return (
          <circle
            key={`output-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={neu.PORT_RADIUS}
            fill="white"
            stroke="black"
            strokeWidth="2"
            onMouseDown={() => startDrawingWire(node.id, i, pos.x, pos.y)}
            className="cursor-pointer"
          />
        );
      })}
    </g>
  )
};
