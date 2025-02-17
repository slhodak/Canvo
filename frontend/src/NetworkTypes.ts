import { BaseNode } from '../../shared/types/src/models/node';
import { Connection } from '../../shared/types/src/models/connection';

export interface VisualNode {
  id: string;
  node: BaseNode;
  x: number;
  y: number;
}

export interface VisualConnection {
  id: string;
  connection: Connection;
}

export interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  offsetX: number;
  offsetY: number;
  hasMoved: boolean;
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
