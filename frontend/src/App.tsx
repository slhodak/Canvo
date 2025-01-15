import { useState, useEffect } from 'react';
import './App.css'
import { Layer, TransformationModel } from './Layer';
import { BlockModel, BlockPreview } from './Block';
import { SERVER_URL } from './constants';

const App = () => {
  const [block, setBlock] = useState<BlockModel | null>(null);
  const [transformations, setTransformations] = useState<TransformationModel[]>([]);
  const [rootBlocks, setRootBlocks] = useState<BlockModel[]>([]);

  //////////////////////////////
  // Functions
  //////////////////////////////

  const createBlock = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/new_block`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.status === 'success') {
        fetchRootBlocks();
      }
    } catch (error) {
      console.error('Error adding root block:', error);
    }
  }

  const fetchRootBlocks = async () => {
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

  //////////////////////////////
  // useEffect Hooks
  //////////////////////////////

  // Fetch all the root blocks
  useEffect(() => {
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
        <button className="add-block-button" onClick={createBlock}>New</button>
        {rootBlocks.map((block) => (
          <BlockPreview block={block} />
        ))}
      </div>
    </div>
  );
}

export default App;
