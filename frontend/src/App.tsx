import { useState, useEffect } from 'react';
import './App.css'
import { Layer, TransformationModel } from './Layer';
import { BlockModel, BlockPreview } from './Block';
import { SERVER_URL } from './constants';

const App = () => {
  const [rootBlock, setRootBlock] = useState<BlockModel | null>(null);
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

  // Fetch the latest group
  useEffect(() => {
    async function fetchLatestGroup() {
      const response = await fetch(`${SERVER_URL}/api/get_latest_group`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRootBlock(data.block);
      } else {
        console.error('Error fetching block:', data.error);
      }
    }

    fetchLatestGroup();
  }, []);

  // Fetch all the transformations of the block
  useEffect(() => {
    async function fetchTransformations(blockId: number) {
      // Is this blockId number interpolation safe?
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

    if (rootBlock) {
      fetchTransformations(rootBlock.id)
    }
  }, [rootBlock]);

  return (
    <div>
      <div className="top-section">
        {rootBlock ? transformations.map((transformation) => (
          <Layer key={transformation.id} rootBlock={rootBlock} transformation={transformation} />
        )) : <div>No root block found</div>}
      </div>

      <div className="bottom-section">
        <button className="add-block-button" onClick={createBlock}>New</button>
        <div className="block-previews-container">
          {rootBlocks.map((block) => (
            <button key={block.id} onClick={() => setRootBlock(block)}>
              <BlockPreview block={block} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
