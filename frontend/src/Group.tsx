import { useState, useEffect, useCallback } from 'react';
import './Group.css';
import { Block } from './Block';
import Transformation from './Transformation';
import { BlockModel, GroupModel, TransformationModel, TransformationOutputsModel } from '@wb/shared-types';
import { SERVER_URL } from './constants';


interface GroupProps {
  group: GroupModel;
  updateGroupLabel: (label: string) => void;
}

const Group = ({ group, updateGroupLabel }: GroupProps) => {
  const [label, setLabel] = useState(group.label);
  const [blocks, setBlocks] = useState<BlockModel[]>([]);
  const [blocksById, setBlocksById] = useState<Record<string, BlockModel>>({});
  const [transformationsById, setTransformationsById] = useState<Record<string, TransformationModel>>({});
  const [transformationsByBlockId, setTransformationsByBlockId] = useState<Record<string, TransformationModel>>({});
  const [transformationOutputsByBlockId, setTransformationOutputsByBlockId] = useState<Record<string, TransformationOutputsModel>>({})
  const [blocksByDepth, setBlocksByDepth] = useState<Record<string, BlockModel[]>>({});

  ///////////////////////////////////////////////
  // Independent Methods
  ///////////////////////////////////////////////

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

  ///////////////////////////////////////////////
  // Memoized Methods
  ///////////////////////////////////////////////

  const fetchBlocks = useCallback(async () => {
    const response = await fetch(`${SERVER_URL}/api/get_blocks_for_group/${group._id}`, {
      credentials: 'include',
    });
    const data = await response.json();
    setBlocks(data.blocks);

    const _blocks: BlockModel[] = data.blocks;
    const _blocksById = _blocks.reduce((acc, block) => {
      acc[block._id] = block;
      return acc;
    }, {} as Record<string, BlockModel>)
    setBlocksById(_blocksById);

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
        const transformationOutputs: TransformationOutputsModel[] = data.transformationOutputs;
        const _transformationOutputsByBlockId = transformationOutputs.reduce((acc, transformationOutput) => {
          acc[transformationOutput.output_block_id] = transformationOutput;
          return acc;
        }, {} as Record<string, TransformationOutputsModel>)

        setTransformationOutputsByBlockId(_transformationOutputsByBlockId)
      } else {
        console.error(`Error fetching transformation outputs: ${data.error}`)
      }
    } catch (error) {
      console.error(`Error fetching transformation outputs rows: ${error}`)
    }
  }, [blocks])

  const arrangeBlocksByDepth = useCallback(() => {
    const _blocksByDepth: Record<string, BlockModel[]> = {};

    const findBlockDepth = (block: BlockModel, depth: number): number => {
      const transformationOutput = transformationOutputsByBlockId[block._id];
      if (transformationOutput == null) {
        return depth;
      }
      const transformation = transformationsById[transformationOutput.transformation_id];
      const _block = blocksById[transformation.input_block_id];
      return findBlockDepth(_block, depth + 1)
    }

    for (const block of Object.values(blocksById)) {
      const depth = findBlockDepth(block, 0)
      if (_blocksByDepth[depth] == null) {
        _blocksByDepth[depth] = [block];
      } else {
        _blocksByDepth[depth].push(block);
      }
    }

    setBlocksByDepth(_blocksByDepth)
  }, [blocksById, transformationOutputsByBlockId, transformationsById])

  ///////////////////////////////////////////////
  // useEffect Hooks
  ///////////////////////////////////////////////

  useEffect(() => {
    fetchBlocks();
    fetchTransformations();
  }, [fetchBlocks, fetchTransformations]);

  useEffect(() => {
    // fetchTransformationOutputs();
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
      <button className="add-block-button" onClick={addBlock}>Add Block</button>
    </div>
    <div className="group-block-depth-container">
      {Object.entries(blocksByDepth).map(([depth, blocks]) => {
        return (
          <div className="group-blocks-container" key={`block-depth-${depth}`}>
              {blocks.map((block) => {
                const transformation = transformationsByBlockId[block._id];
                return (
                  <div className="group-block-container" key={block._id}>
                    <Block block={block} fetchBlocks={fetchBlocks} />
                    {transformation ?
                      <Transformation transformation={transformation} fetchTransformations={fetchTransformations} />
                      :
                      <button className="add-transformation-button" onClick={() => addTransformation(block._id)}>New Transformation</button>
                    }
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  </div>;
}

export default Group;
