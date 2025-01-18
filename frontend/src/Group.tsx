import { useState, useEffect, useCallback } from 'react';
import './Group.css';
import { Block } from './Block';
import Transformation from './Transformation';
import { GroupModel, BlockModel, TransformationModel } from '@wb/shared-types';
import { compareBlockPositions } from './Utils';
import { SERVER_URL } from './constants';
import CopyIcon from './assets/CopyIcon';

interface GroupProps {
  group: GroupModel;
  updateGroupLabel: (label: string) => void;
}

const Group = ({ group, updateGroupLabel }: GroupProps) => {
  const [label, setLabel] = useState(group.label);
  const [blocks, setBlocks] = useState<BlockModel[]>([]);
  const [blocksByDepth, setBlocksByDepth] = useState<BlockModel[][]>([]);
  const [transformationsByBlockId, setTransformationsByBlockId] = useState<Record<string, TransformationModel>>({});

  ///////////////////////////////////////////////
  // Independent Methods
  ///////////////////////////////////////////////

  // This can only create blocks at the top level of the group, for now
  // but you could imagine how it could add blocks to any level, if it accepts a level/depth parameter
  // the depth parameter would be provided by the calling button click, as a new button would be displayed at each level in the group
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

  const addTransformation = async (blockId: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/new_transformation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'groupId': group._id,
          'blockId': blockId,
        })
      });
      const data = await response.json();
      if (data.status == 'success') {
        fetchTransformations();
      }
    } catch (error) {
      console.error('Error adding transformation:', error);
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

  const copyAllBlocks = (depth: number) => {
    const blocksAtDepth = blocksByDepth[depth];
    if (!blocksAtDepth || blocksAtDepth.length == 0) {
      return;
    }

    const textToCopy = blocksAtDepth.map(block => `${block.position}\n${block.content}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      console.log('All blocks content copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy content: ', err);
    });
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

  const fetchTransformations = useCallback(async () => {
    const response = await fetch(`${SERVER_URL}/api/get_transformations_for_group/${group._id}`, {
      credentials: 'include',
    });
    const data = await response.json();

    if (data.status === 'success') {
      // Convert the returned array into the maps we need
      const _transformationsByBlockId: Record<string, TransformationModel> = {};

      const transformations: TransformationModel[] = data.transformations;
      for (const transformation of transformations) {
        _transformationsByBlockId[transformation.input_block_id] = transformation;
      }

      setTransformationsByBlockId(_transformationsByBlockId);
    } else {
      console.error(`Could not get transformations: ${data.error}`)
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
    fetchTransformations();
  }, [fetchBlocks, fetchTransformations]);

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
      {Object.entries(blocksByDepth).map(([depth, blocks]) => {
        return (
          <div className="group-layer-container" key={`block-depth-${depth}`}>
            <div className="group-layer-header">
              <button className="group-layer-copy-button" onClick={() => copyAllBlocks(Number(depth))}>
                <CopyIcon />
              </button>
              {Number(depth) > 0 && <button className="group-layer-add-block-button" onClick={() => addBlock(Number(depth))}>Add Block</button>}
            </div>
            <div className="group-layer-blocks-container" key={`block-depth-${depth}`}>
              {blocks.map((block) => {
                const transformation = transformationsByBlockId[block._id];
                return (
                  <div className="group-layer-block-container" key={`block-${block._id}`}>
                    <Block block={block} fetchBlocks={fetchBlocks} />
                    {transformation ?
                      <Transformation transformation={transformation} fetchTransformations={fetchTransformations} fetchBlocks={fetchBlocks} />
                      :
                      <button className="add-transformation-button" onClick={() => addTransformation(block._id)}>New Transformation</button>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  </div>;
}

export default Group;
