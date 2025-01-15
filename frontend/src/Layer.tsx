import { useState, useEffect } from 'react';
import { BlockModel, Block } from './Block';
import './Layer.css';
import { SERVER_URL } from './constants';

interface LayerProps {
  rootBlock: BlockModel;
  transformation: TransformationModel;
}

export interface TransformationModel {
  id: string;
  title: string;
  prompt: string;
}

// A Layer is a group of blocks that are descended and transformed from a single block
// Layers have a 1:1 relationship with Transformations
export const Layer = ({ rootBlock, transformation }: LayerProps) => {
  const [blocks, setBlocks] = useState<BlockModel[]>([]);

  useEffect(() => {
    async function fetchDescendentBlocks() {
      const response = await fetch(`${SERVER_URL}/api/get_descendent_blocks/${rootBlock.id}`);
      const data = await response.json();
      if (data.status === 'success') {
        setBlocks(data.blocks);
      } else {
        console.error('Error fetching descendent blocks:', data.error);
      }
    }

    fetchDescendentBlocks();
  }, [rootBlock]);

  return (
    <div className="layer-container">
      <div className="layer-header">Transformation ID: {transformation.id}</div>
      <div className="layer-blocks">
        {blocks.map((block) => (
          <Block block={block} />
        ))}
      </div>
    </div>
  );
};
