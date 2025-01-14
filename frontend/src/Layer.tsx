import { useState, useEffect } from 'react';
import { BlockObject, Block } from './Block';
import './Layer.css';
import { SERVER_URL } from './constants';

interface LayerProps {
  parentBlock: BlockObject;
}

// A Layer is a group of blocks that are descended and transformed from a single block
// Layers have a 1:1 relationship with Transformations
export const Layer = ({ parentBlock }: LayerProps) => {
  const [descendentBlocks, setDescendentBlocks] = useState<BlockObject[]>([]);

  useEffect(() => {
    async function fetchDescendentBlocks() {
      const response = await fetch(`${SERVER_URL}/api/get_descendent_blocks/${parentBlock.id}`);
      const data = await response.json();
      if (data.status === 'success') {
        setDescendentBlocks(data.blocks);
      } else {
        console.error('Error fetching descendent blocks:', data.error);
      }
    }

    fetchDescendentBlocks();
  }, [parentBlock]);

  return (
    <div className="layer-container">
      <div className="layer-header">Layer {parentBlock.id}</div>
      <div className="layer-blocks">
        {descendentBlocks.map((block) => (
          <Block block={block} />
        ))}
      </div>
    </div>
  );
};
