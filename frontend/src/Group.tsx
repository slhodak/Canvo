import { useState, useEffect, useCallback } from 'react';
import './Group.css';
import { Block } from './Block';
import Transformation from './Transformation';
import { GroupModel, BlockModel, TransformationModel, TransformationOutputModel } from '@wb/shared-types';
import { SERVER_URL } from './constants';
import BlockTree from './BlockTree';


interface GroupProps {
  group: GroupModel;
  updateGroupLabel: (label: string) => void;
}

const Group = ({ group, updateGroupLabel }: GroupProps) => {
  const [label, setLabel] = useState(group.label);
  const [blocks, setBlocks] = useState<BlockModel[]>([]);
  const [blocksByDepth, setBlocksByDepth] = useState<BlockModel[][]>([]);
  const [blockTree, setBlockTree] = useState<BlockTree>(new BlockTree());
  const [transformationsById, setTransformationsById] = useState<Record<string, TransformationModel>>({});
  const [transformationsByBlockId, setTransformationsByBlockId] = useState<Record<string, TransformationModel>>({});
  const [transformationOutputsByBlockId, setTransformationOutputsByBlockId] = useState<Record<string, TransformationOutputModel>>({})

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
      const response = await fetch(`${SERVER_URL}/api/new_transformation/${group._id}/${blockId}`, {
        method: 'POST',
        credentials: 'include',
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

    let highestPosition = 0;
    for (const block of blocksAtDepth) {
      /// 0.2.1 -> [0, 2, 1], e.g. at depth 2, the highest position is 1
      const position = Number(block.position.split('.')[depth]);
      if (position > highestPosition) {
        highestPosition = position;
      }
    }
    return highestPosition + 1;
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
      console.log(`setting blocks: ${data.blocks}`);
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
      const _transformationsById: Record<string, TransformationModel> = {};
      const _transformationsByBlockId: Record<string, TransformationModel> = {};

      const transformations: TransformationModel[] = data.transformations;
      for (const transformation of transformations) {
        _transformationsById[transformation._id] = transformation;
        _transformationsByBlockId[transformation.input_block_id] = transformation;
      }

      setTransformationsById(_transformationsById);
      setTransformationsByBlockId(_transformationsByBlockId);
    } else {
      console.error(`Could not get transformations: ${data.error}`)
    }
  }, [group._id]);

  const fetchTransformationOutputs = useCallback(async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/query_transformation_outputs`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'blockIds': blocks.map((block) => block._id),
        })
      })
      const data = await response.json()

      if (data.status === 'success') {
        const transformationOutputs: TransformationOutputModel[] = data.transformationOutputs;
        const _transformationOutputsByBlockId = transformationOutputs.reduce((acc, transformationOutput) => {
          acc[transformationOutput.output_block_id] = transformationOutput;
          return acc;
        }, {} as Record<string, TransformationOutputModel>)

        setTransformationOutputsByBlockId(_transformationOutputsByBlockId)
      } else {
        console.error(`Error fetching transformation outputs: ${data.error}`)
      }
    } catch (error) {
      console.error(`Error fetching transformation outputs rows: ${error}`)
    }
  }, [blocks])

  const arrangeBlocksByDepth = useCallback(() => {
    const _blocksByDepth: BlockModel[][] = [];
    for (const block of blocks) {
      const depth = block.position.split('.').length - 1;
      if (_blocksByDepth.length < depth + 1) {
        _blocksByDepth.push([]);
      }
      _blocksByDepth[depth].push(block);
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
    fetchTransformationOutputs();
  }, [fetchTransformationOutputs])

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
      {/* position: will use the position to arrange the blocks. but it will need some kind of data structure like this */}
      {Object.entries(blocksByDepth).map(([depth, blocks]) => {
        return (
          <div className="group-layer-container" key={`block-depth-${depth}`}>
            <div className="group-layer-header">
              {Number(depth) > 0 &&
                <button className="add-block-button" onClick={() => addBlock(Number(depth))}>Add Block</button>
              }
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
