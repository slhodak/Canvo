import { useState, useEffect } from 'react';
import './App.css'
import { Layer } from './Layer';
import { BlockObject, BlockPreview } from './Block';
import { SERVER_URL } from './constants';

const App = () => {
  const [block, setBlock] = useState<BlockObject | null>(null);
  const [layers, setLayers] = useState<[]>([]);
  const [rootBlocks, setRootBlocks] = useState<BlockObject[]>([]);

  // Fetch all the root blocks
  useEffect(() => {
    async function fetchRootBlocks() {
      const response = await fetch(`${SERVER_URL}/api/get_root_blocks`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRootBlocks(data.blocks);
      } else {
        console.error('Error fetching root blocks:', data.error);
      }
    }

    fetchRootBlocks();
  }, []);

  // Fetch the latest root block
  useEffect(() => {
    async function fetchBlock() {
      const response = await fetch(`${SERVER_URL}/api/get_latest_root_block`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setBlock(data.block);
      } else {
        console.error('Error fetching block:', data.error);
      }
    }

    fetchBlock();
  }, [block]);

  // Fetch all the transformations of the block
  useEffect(() => {
    async function fetchTransformations(blockId: string) {
      const response = await fetch(`${SERVER_URL}/api/get_descendent_blocks/${blockId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setLayers(data.blocks);
      } else {
        console.error('Error fetching transformations:', data.error);
      }
    }

    if (block) {
      fetchTransformations(block.id.toString());
    }
  }, [block]);

  return (
    <div>
      <div className="top-section">
        {layers.map((layer) => (
          <Layer parentBlock={layer} />
        ))}
      </div>

      <div className="bottom-section">
        {rootBlocks.map((block) => (
          <BlockPreview block={block} />
        ))}
      </div>
    </div>
  );
}

export default App;
