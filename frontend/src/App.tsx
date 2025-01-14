import { useState, useEffect } from 'react';
import './App.css'
import { Layer } from './Layer';
import { BlockModel, BlockPreview } from './Block';
import { SERVER_URL } from './constants';

const App = () => {
  const [block, setBlock] = useState<BlockModel | null>(null);
  const [transformations, setTransformations] = useState<TransformationModel[]>([]);
  const [rootBlocks, setRootBlocks] = useState<BlockModel[]>([]);

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
        setTransformations(data.transformations);
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
        {block ? transformations.map((transformation) => (
          <Layer parentBlock={block} transformation={transformation} />
        )) : <div>No root block found</div>}
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
