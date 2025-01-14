import { useState } from 'react';
import { BlockObject, Block } from './Block';
import './Layer.css';

function generateRandomBlocks(numBlocks: number) {
  const blocks = [];
  for (let i = 0; i < numBlocks; i++) {
    blocks.push({
      id: i,
      text: "Hello, world! This is a longer test text to demonstrate the lengthening of the text.",
    });
  }
  return blocks;
}

const testBlocks = generateRandomBlocks(10);

export interface LayerObject {
  id: number;
}

interface LayerProps {
  layer: LayerObject;
}

export function Layer({ layer }: LayerProps) {
  const [blocks, setBlocks] = useState<BlockObject[]>(testBlocks);

  return (
    <div className="layer-container">
      <div className="layer-header">Layer {layer.id}</div>
      <div className="layer-blocks">
        {blocks.map((block) => (
          <Block block={block} />
        ))}
      </div>
    </div>
  );
}
