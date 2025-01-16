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
  const [transformationsById, setTransformationsById] = useState<Record<string, TransformationModel>>({});
  const [transformationsByBlockId, setTransformationsByBlockId] = useState<Record<string, TransformationModel>>({});
  const [transformationOutputsByBlockId, setTransformationOutputsByBlockId] = useState<Record<string, TransformationOutputsModel>>({})
  const [blocksByDepth, setBlocksByDepth] = useState<BlockModel[][]>([]);

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
      console.error(`Error fetching transformations: ${data.error}`)
    }
  }, [group._id]);

  const fetchTransformationOutputs = useCallback(async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/get_transformation_outputs`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'transformations': blocks.map((block) => block._id),
        })
      })
      const data = await response.json()

      if (data.status === 'success') {
        const transformationOutputs: TransformationOutputsModel[] = data.transformation_outputs;
        const _transformationOutputsByBlockId: Record<string, TransformationOutputsModel> = transformationOutputs.reduce((acc, transformationOutput) => {
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
    // Goal: a 2d list of the blocks based on how many levels deep they are in the tree of block->transformation->outputs
    // needs to know which blocks are children of which transformation. well each transformation has an input but we need to query the
    // transformation_outputs table to know which block is a child of what transformation
    // 1. get the transformation_outputs before iterating and cache them here
    // 2. query for the transofmration_outputs as we iterate
    // assume you can just "get the transformation output" and think of when to fetch it later
    //
    // start with the root level.
    //    these are any blocks that are no transformation's output
    // find all the blocks that are not the output of any transformation
    // find the level depth of each block by using the transformation_outputs table, and transformations input_block_ids
    //    for each block:
    //        if it is not in the transformation_outputs, it's level is 0
    //        if it is in the transformation_outputs, increment it's level by 1
    //            get the transformation it is an output from
    //            get the block that is the input to this transformation
    //            search for that block in the transformation_outputs table. if it is there, increment the original block's depth by 1 and repeat
    //              if it is not there, store it at its given level and move on to the next block
    //
    const _blocksByDepth: Record<string, BlockModel[]> = {};

    for (const block of blocks) {
      let depth = 0;
      const transformationOutput = transformationOutputsByBlockId[block._id];
      if (transformationOutput == null) {
        if (_blocksByDepth[depth] == null) {
          _blocksByDepth[depth] = [block];
        } else {
          _blocksByDepth[depth].push(block);
        }
      } else {
        depth += 1;
        const transformation = transformationsById[transformationOutput.transformation_id];
        
      }
    }
    // I could either store these blocks by level depth in a dictionary that has numbers as the keys
    //    ensure this has no problems
    //    a dictionary could be more flexible. Because inside each level I could store the elements by id. think of how this will be consumed.
    // or I could store them in the dictionary by level depth keys to start, and then convert this into a 2darray before setting the state value
  }, [blocks]);

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

  useEffect(() => {
    fetchBlocks();
    fetchTransformations();
    fetchTransformationOutputs();
    arrangeBlocksByDepth();
  }, [fetchBlocks, fetchTransformations, fetchTransformationOutputs, arrangeBlocksByDepth]);

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
      {blocks.map((block) => {
        const transformation = transformationsByBlockId[block._id];
        return (
          <div className="group-block-container" key={block._id}>
            <Block key={block._id} block={block} fetchBlocks={fetchBlocks} />
            {transformation ?
              <Transformation key={transformation._id} transformation={transformation} />
              :
              <button className="add-transformation-button" onClick={() => addTransformation(block._id)}>New Transformation</button>
            }
          </div>
        )
      })}
    </div>
  </div>;
}

export default Group;
