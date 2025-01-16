import { useState, useEffect, useCallback } from 'react';
import './Group.css';
import { BlockModel, GroupModel } from '@wb/shared-types';
import { SERVER_URL } from './constants';

export const Group = ({ group }: { group: GroupModel }) => {
  const [blocks, setBlocks] = useState<BlockModel[]>([]);

  const fetchBlocks = useCallback(async () => {
    const response = await fetch(`${SERVER_URL}/api/get_blocks_for_group/${group._id}`, {
      credentials: 'include',
    });
    const data = await response.json();
    setBlocks(data.blocks);
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

  return <div className="group-container">
    <div className="group-header-container">
      <div className="group-label">Group Name: {group.label ?? 'unknown'}</div>
      <button className="add-block-button" onClick={addBlock}>Add Block</button>
    </div>
    <div className="group-blocks-container">
      {blocks.map((block) => (
        <div className="block-container">{block.label ?? 'no content'}</div>
      ))}
    </div>
  </div>;
}

export const GroupPreview = ({ group }: { group: GroupModel }) => {
  return <div className="group-preview">{group.label ?? 'unknown'}</div>;
}
