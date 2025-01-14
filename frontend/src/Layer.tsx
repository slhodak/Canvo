import { useState } from 'react';
import { BlockObject, Block } from './Block';
import './Layer.css';

function generateRandomBlocks(numBlocks: number) {
  const blocks = [];
  for (let i = 0; i < numBlocks; i++) {
    blocks.push({
      id: i,
      text: "Hello, world! This is a longer test text to demonstrate the lengthening of the text. Let's add even more text to make it significantly longer and see how it affects the layout and appearance of the blocks within the layer.",
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
