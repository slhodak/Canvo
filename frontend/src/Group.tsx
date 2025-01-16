import { useState, useEffect, useCallback } from 'react';
import './Group.css';
import { Block } from './Block';
import { BlockModel, GroupModel } from '@wb/shared-types';
import { SERVER_URL } from './constants';


interface GroupProps {
  group: GroupModel;
  updateGroupLabel: (label: string) => void;
}

export const Group = ({ group, updateGroupLabel }: GroupProps) => {
  const [label, setLabel] = useState(group.label);
  const [blocks, setBlocks] = useState<BlockModel[]>([]);

  const fetchBlocks = useCallback(async () => {
    const response = await fetch(`${SERVER_URL}/api/get_blocks_for_group/${group._id}`, {
      credentials: 'include',
    });
    const data = await response.json();
    setBlocks(data.blocks);
    // When we fetch all the blocks, we transform that collection into a set of arrays based on their depth in relation to each other
    // Transformations have input_block_id, and we can get the output_block_id from the transformation_outputs table
    // We can then use this to traverse a tree of blocks and transformations
    // Then we store, in memory here, blocks as a 2darray where the first index is the depth of the block in relation to the root block
    // We can then use this to render the blocks in layers in the correct order
    // So first we need to fetch all the transformations as well
  }, [group._id]);

  const addBlock = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/new_block/${group._id}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status == 'success') {
        fetchBlocks();
      }
    } catch (error) {
      console.error('Error adding block:', error);
    }
  }

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  useEffect(() => {
    setLabel(group.label);
  }, [group.label]);

  return <div className="group-container">
    <div className="group-header-container">
      <input
        className="group-label-input"
        value={label}
        onChange={(e) => {
          setLabel(e.target.value);
          updateGroupLabel(e.target.value)
        }}
      />
      <button className="add-block-button" onClick={addBlock}>Add Block</button>
    </div>
    <div className="group-blocks-container">
      {blocks.map((block) => (
        <Block key={block._id} block={block} fetchBlocks={fetchBlocks} />
      ))}
    </div>
  </div>;
}
