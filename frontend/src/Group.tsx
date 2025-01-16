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
      <input
        className="group-label-input"
        value={label}
        onChange={(e) => {
          setLabel(e.target.value);
          updateGroupLabel(e.target.value)
        }
        }>
      </input>
      <button className="add-block-button" onClick={addBlock}>Add Block</button>
    </div>
    <div className="group-blocks-container">
      {blocks.map((block) => (
        <Block key={block._id} block={block} />
      ))}
    </div>
  </div>;
}
