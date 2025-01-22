import { BlockModel, TransformationModel } from "@wb/shared-types";

export class Position {
  blockId: string;
  transformationRelativeId?: string;

  constructor(blockId: string, transformationRelativeId?: string) {
    this.blockId = blockId;
    this.transformationRelativeId = transformationRelativeId;
  }

  static from(position: string): Position {
    const positionParts = position.split(':');
    if (positionParts.length === 1) {
      return new Position(positionParts[0]);
    }

    // Stored in the position as "transformationRelativeId:blockId" but,
    const [transformationRelativeId, blockId] = positionParts;
    // since optional parameters cannot precede required parameters, we pass them in the opposite order
    return new Position(blockId, transformationRelativeId);
  }

  toString(): string {
    return this.transformationRelativeId ? `${this.transformationRelativeId}:${this.blockId}` : this.blockId;
  }

  incrementBlockId(): void {
    this.blockId = (Number(this.blockId) + 1).toString();
  }
}

// We assume the depths are equal
// Position is made of block _ids and transformation relative_ids
// input: '1.A:1', '1.B:0'
// output: -1
// Depth is the number of blocks in the position
export function compareBlockPositions(a: BlockModel, b: BlockModel): number {
  // Split on the period to get the block _id and transformation relative_id
  const aPositions = a.position.split('.');
  const bPositions = b.position.split('.');

  const aDepth = aPositions.length;
  const bDepth = bPositions.length;
  if (aDepth !== bDepth) {
    console.error('Could not compare positions: expected equal depths');
    return 0;
  }

  for (let i = 0; i < aDepth; i++) {
    const aPosition = Position.from(aPositions[i]);
    const bPosition = Position.from(bPositions[i]);

    // If neither position has a transformation relative_id, compare the block _ids
    // This is true of the first block in the group and any blocks added to a layer manually
    if (!aPosition.transformationRelativeId && !bPosition.transformationRelativeId) {
      if (aPosition.blockId < bPosition.blockId) {
        return -1;
      }
      if (aPosition.blockId > bPosition.blockId) {
        return 1;
      }
    }

    // If only one position has a transformation relative_id, that position precedes the other
    if (aPosition.transformationRelativeId && !bPosition.transformationRelativeId) {
      return -1;
    }
    if (!aPosition.transformationRelativeId && bPosition.transformationRelativeId) {
      return 1;
    }

    // If both positions have a transformation relative_id, compare them
    if (aPosition.transformationRelativeId && bPosition.transformationRelativeId) {
      if (aPosition.transformationRelativeId < bPosition.transformationRelativeId) {
        return -1;
      }
      if (aPosition.transformationRelativeId > bPosition.transformationRelativeId) {
        return 1;
      }
    }
  }

  return 0;
}

// Transformation position is simply a lowercase letter from a to z
export function compareTransformationPositions(a: TransformationModel, b: TransformationModel): number {
  if (a.position < b.position) {
    return -1;
  }
  if (a.position > b.position) {
    return 1;
  }
  return 0;
}
