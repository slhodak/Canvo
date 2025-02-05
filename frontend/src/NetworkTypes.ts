import { BaseNode } from './NodeModel';

export interface VisualNode {
  id: string;
  node: BaseNode;
  x: number;
  y: number;
}

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

export interface WireState {
  isDrawing: boolean;
  fromNode: string | null;
  fromOutput: number | null;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
