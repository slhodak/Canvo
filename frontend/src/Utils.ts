import { BlockModel } from "@wb/shared-types";

// We assume the depths are equal
// input: '1.1.1'
export function compareBlockPositions(a: BlockModel, b: BlockModel): number {
  const aPositions = a.position.split('.');
  const bPositions = b.position.split('.');

  const aDepth = aPositions.length;
  const bDepth = bPositions.length;
  if (aDepth !== bDepth) {
    console.error('Could not compare positions: expected equal depths');
    return 0;
  }

  for (let i = 0; i < aDepth; i++) {
    const aPosition = Number(aPositions[i]);
    const bPosition = Number(bPositions[i]);
    if (aPosition < bPosition) {
      return -1;
    }
    if (aPosition > bPosition) {
      return 1;
    }
  }

  return 0;
}
