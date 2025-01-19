import { useState, useEffect, useCallback } from 'react';
import './Group.css';
import Layer from './Layer';
import { GroupModel, BlockModel } from '@wb/shared-types';
import { compareBlockPositions } from './Utils';
import { SERVER_URL } from './constants';

interface GroupProps {
  group: GroupModel;
  updateGroupLabel: (label: string) => void;
}

const Group = ({ group, updateGroupLabel }: GroupProps) => {
  const [label, setLabel] = useState(group.label);
  const [blocks, setBlocks] = useState<BlockModel[]>([]);
  const [blocksByDepth, setBlocksByDepth] = useState<BlockModel[][]>([]);

  ///////////////////////////////////////////////
  // Independent Methods
  ///////////////////////////////////////////////

  // This can only append a block to the end of the layer
  const addBlock = async (depth: number = 0) => {
    try {
      const position = nextBlockPositionForDepth(depth);
      const response = await fetch(`${SERVER_URL}/api/new_block`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'group_id': group._id,
          'position': position.toString()
        })
      });
      const data = await response.json();
      if (data.status == 'success') {
        fetchBlocks();
      }
    } catch (error) {
      console.error('Error adding block:', error);
    }
  }

  const nextBlockPositionForDepth = (depth: number) => {
    const blocksAtDepth = blocksByDepth[depth];
    if (!blocksAtDepth || blocksAtDepth.length == 0) {
      return 0;
    }

    // Assume the blocks at each depth are sorted; this is done by the arrangeBlocksByDepth method
    const lastBlock = blocksAtDepth[blocksAtDepth.length - 1];
    const positionParts = lastBlock.position.split('.');
    if (positionParts.length != depth + 1) {
      console.error(`
        Error encountered while calculating the next block position for depth ${depth}:
        Expected block position to have ${depth + 1} parts, but got ${positionParts.length}
      `);
      return 0;
    }
    const positionLastPartIndex = positionParts.length - 1;
    const positionLastRow = positionParts[positionLastPartIndex];
    positionParts[positionLastPartIndex] = (Number(positionLastRow) + 1).toString();
    return positionParts.join('.');
  }

  ///////////////////////////////////////////////
  // Memoized Methods
  ///////////////////////////////////////////////

  const fetchBlocks = useCallback(async () => {
    const response = await fetch(`${SERVER_URL}/api/get_blocks_for_group/${group._id}`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (data.status === 'success') {
      setBlocks(data.blocks);
    } else {
      console.error(`Could not get block ids: ${data.error}`)
    }
  }, [group._id]);

  const arrangeBlocksByDepth = useCallback(() => {
    const _blocksByDepth: BlockModel[][] = [];
    for (const block of blocks) {
      const depth = block.position.split('.').length - 1;
      if (_blocksByDepth[depth] === undefined) {
        _blocksByDepth[depth] = [];
      }
      _blocksByDepth[depth].push(block);
    }

    for (let i = 0; i < _blocksByDepth.length; i++) {
      _blocksByDepth[i] = _blocksByDepth[i].sort(compareBlockPositions)
    }
    setBlocksByDepth(_blocksByDepth);
  }, [blocks])

  ///////////////////////////////////////////////
  // useEffect Hooks
  ///////////////////////////////////////////////

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  useEffect(() => {
    arrangeBlocksByDepth();
  }, [arrangeBlocksByDepth])

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
      <button className="add-block-button" onClick={() => addBlock(0)}>Add Block</button>
    </div>

    <div className="group-layers-container">
      {Object.entries(blocksByDepth).map(([depth, blocks]) => (
        <Layer
          key={`layer-${depth}`}
          groupId={group._id}
          depth={depth}
          blocks={blocks}
          addBlock={addBlock}
          fetchBlocks={fetchBlocks}
        />
      ))}
    </div>
  </div>;
}

export default Group;
