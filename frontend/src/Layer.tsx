import { useEffect, useState, useCallback } from 'react';
import './Layer.css';
import { compareTransformationPositions } from './Utils';
import Block from './Block';
import Transformation from './Transformation';
import { BlockModel, TransformationModel } from '@wb/shared-types';
import CopyIcon from './assets/CopyIcon';
import { SERVER_URL } from './constants';
import TripleButton from './TripleButton';

interface LayerProps {
  groupId: string;
  depth: string;
  blocks: BlockModel[];
  addBlock: (depth?: number) => Promise<void>;
  fetchBlocks: () => Promise<void>;
}

enum Zoom {
  Small = 's',
  Medium = 'm',
  Large = 'l'
}

export const Layer = ({ groupId, depth, blocks, addBlock, fetchBlocks }: LayerProps) => {
  const [transformationsByBlockId, setTransformationsByBlockId] = useState<Record<string, TransformationModel[]>>({});
  const [zoom, setZoom] = useState(Zoom.Small);

  const setZoomFromChoice = (choice: number) => {
    switch (choice) {
      case 0:
        setZoom(Zoom.Small);
        break;
      case 1:
        setZoom(Zoom.Medium);
        break;
      case 2:
        setZoom(Zoom.Large);
        break;
    }
  }

  const copyAllBlocks = () => {
    const textToCopy = blocks.map(block => `${block.position}\n${block.content}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      console.log('All blocks content copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy content: ', err);
    });
  }

  const runAllTransformations = (blockId: string) => {
    const transformations = transformationsByBlockId[blockId];
    for (const transformation of transformations) {
      if (!transformation.locked) {
        runTransformation(transformation._id);
      }
    }
  }

  const runTransformation = async (transformationId: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/run_transformation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId: groupId, transformationId: transformationId }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchBlocks();
      } else {
        console.error('Error running transformation:', data.error);
      }
    } catch (error) {
      console.error('Error running transformation:', error);
    }
  };

  const fetchTransformations = useCallback(async () => {
    const response = await fetch(`${SERVER_URL}/api/get_transformations_for_group/${groupId}`, {
      credentials: 'include',
    });
    const data = await response.json();

    if (data.status === 'success') {
      // Convert the returned flat list into the map we need
      const _transformationsByBlockId: Record<string, TransformationModel[]> = {};

      const transformations: TransformationModel[] = data.transformations;
      for (const transformation of transformations) {
        if (!_transformationsByBlockId[transformation.input_block_id]) {
          _transformationsByBlockId[transformation.input_block_id] = [];
        }
        _transformationsByBlockId[transformation.input_block_id].push(transformation);
      }

      // Sort the transformations for each block
      for (const blockId in _transformationsByBlockId) {
        _transformationsByBlockId[blockId].sort((a, b) => compareTransformationPositions(a, b));
      }

      setTransformationsByBlockId(_transformationsByBlockId);
    } else {
      console.error(`Could not get transformations: ${data.error}`)
    }
  }, [groupId]);

  const nextTransformationPositionForBlock = (blockId: string) => {
    const transformations = transformationsByBlockId[blockId];
    if (!transformations || transformations.length == 0) {
      return 'a';
    }
    return String.fromCharCode(transformations[transformations.length - 1].position.charCodeAt(0) + 1);
  }

  const addTransformation = async (blockId: string) => {
    const position = nextTransformationPositionForBlock(blockId);
    try {
      const response = await fetch(`${SERVER_URL}/api/new_transformation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'groupId': groupId,
          'blockId': blockId,
          'position': position
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

  useEffect(() => {
    fetchTransformations();
  }, [fetchTransformations]);

  return (
    <div className="layer-container" key={`block-depth-${depth}`}>
      <div className="layer-header">
        <TripleButton onChange={setZoomFromChoice} />
        <button className="layer-copy-button" onClick={() => copyAllBlocks()}>
          <CopyIcon />
        </button>
        {Number(depth) > 0 && <button className="layer-add-block-button" onClick={() => addBlock(Number(depth))}>Add Block</button>}
      </div>

      <div className="layer-blocks-container" key={`block-depth-${depth}`}>
        {blocks.map((block) => {
          const transformations = transformationsByBlockId[block._id];
          return (
            <div className={`layer-block-container layer-block-zoom-${zoom}`} key={`block-${block._id}`}>
              <Block depth={Number(depth)} block={block} fetchBlocks={fetchBlocks} zoom={zoom} />
              {(transformations && transformations.length > 0) &&
                transformations.map((transformation) => (
                  <Transformation key={transformation._id} transformation={transformation} fetchTransformations={fetchTransformations} runTransformation={runTransformation} />
                ))
              }
              {(transformations && transformations.length > 1) && 
                <button className="layer-run-all-transformations-button" onClick={() => runAllTransformations(block._id)}>Run All</button>
              }
              <button className="layer-add-transformation-button" onClick={() => addTransformation(block._id)}>Add Transformation</button>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default Layer;
