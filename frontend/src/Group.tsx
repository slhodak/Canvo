import { useState, useEffect, useCallback } from 'react';
import './Group.css';
import { Block } from './Block';
import Transformation from './Transformation';
import { GroupModel, TransformationModel, TransformationOutputModel } from '@wb/shared-types';
import { SERVER_URL } from './constants';


interface GroupProps {
  group: GroupModel;
  updateGroupLabel: (label: string) => void;
}

const Group = ({ group, updateGroupLabel }: GroupProps) => {
  const [label, setLabel] = useState(group.label);
  const [blockIds, setBlockIds] = useState<string[]>([]);
  const [transformationsById, setTransformationsById] = useState<Record<string, TransformationModel>>({});
  const [transformationsByBlockId, setTransformationsByBlockId] = useState<Record<string, TransformationModel>>({});
  const [transformationOutputsByBlockId, setTransformationOutputsByBlockId] = useState<Record<string, TransformationOutputModel>>({})
  const [blocksByDepth, setBlocksByDepth] = useState<Record<string, string[]>>({});

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
        fetchBlockIds();
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

  const fetchBlockIds = useCallback(async () => {
    const response = await fetch(`${SERVER_URL}/api/get_block_ids_for_group/${group._id}`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (data.status === 'success') {
      setBlockIds(data.blockIds);
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
          'blockIds': blockIds,
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
  }, [blockIds])

  const arrangeBlocksByDepth = useCallback(() => {
    const _blocksByDepth: Record<string, string[]> = {};

    const findBlockDepth = (blockId: string, depth: number): number => {
      const transformationOutput = transformationOutputsByBlockId[blockId];
      if (transformationOutput == null) {
        return depth;
      }
      const transformation = transformationsById[transformationOutput.transformation_id];
      return findBlockDepth(transformation.input_block_id, depth + 1)
    }

    for (const blockId of blockIds) {
      const depth = findBlockDepth(blockId, 0)
      if (_blocksByDepth[depth] == null) {
        _blocksByDepth[depth] = [blockId];
      } else {
        _blocksByDepth[depth].push(blockId);
      }
    }

    setBlocksByDepth(_blocksByDepth)
  }, [blockIds, transformationOutputsByBlockId, transformationsById])

  ///////////////////////////////////////////////
  // useEffect Hooks
  ///////////////////////////////////////////////

  useEffect(() => {
    fetchBlockIds();
    fetchTransformations();
  }, [fetchBlockIds, fetchTransformations]);

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
      {Object.entries(blocksByDepth).map(([depth, blockIds]) => {
        return (
          <div className="group-blocks-container" key={`block-depth-${depth}`}>
            {blockIds.map((blockId) => {
              const transformation = transformationsByBlockId[blockId];
              return (
                <div className="group-block-container" key={`block-${blockId}`}>
                  <Block blockId={blockId} fetchBlockIds={fetchBlockIds} />
                  {transformation ?
                    <Transformation transformation={transformation} fetchTransformations={fetchTransformations} />
                    :
                    <button className="add-transformation-button" onClick={() => addTransformation(blockId)}>New Transformation</button>
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
