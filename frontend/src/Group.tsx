import { useState, useEffect } from 'react';
import { BlockModel, GroupModel } from '@wb/shared-types';
import { SERVER_URL } from './constants';

export const Group = ({ group }: { group: GroupModel }) => {
  const [blocks, setBlocks] = useState<BlockModel[]>([]);

  useEffect(() => {
    async function fetchBlocks() {
      const response = await fetch(`${SERVER_URL}/api/get_blocks_for_group`, {
        credentials: 'include',
      });
      const data = await response.json();
      setBlocks(data.blocks);
    }

    fetchBlocks();
  }, [group]);

  return <div className="group-container">
    <div className="group-label">Group Name: {group.label ?? 'unknown'}</div>
    <div className="group-blocks">
      {blocks.map((block) => (
        <div className="block-container">{block.label}</div>
      ))}
    </div>
  </div>;
}

export const GroupPreview = ({ group }: { group: GroupModel }) => {
  return <div className="group-preview">{group.label ?? 'unknown'}</div>;
}
