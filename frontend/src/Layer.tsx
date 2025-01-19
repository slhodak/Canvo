import { useEffect, useState, useCallback } from 'react';
import './Layer.css';
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
  const [transformationsByBlockId, setTransformationsByBlockId] = useState<Record<string, TransformationModel>>({});
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

  const fetchTransformations = useCallback(async () => {
    const response = await fetch(`${SERVER_URL}/api/get_transformations_for_group/${groupId}`, {
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
  }, [groupId]);

  const addTransformation = async (blockId: string) => {
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
          const transformation = transformationsByBlockId[block._id];
          return (
            <div className={`layer-block-container layer-block-zoom-${zoom}`} key={`block-${block._id}`}>
              <Block block={block} fetchBlocks={fetchBlocks} zoom={zoom} />
              {transformation ?
                <Transformation transformation={transformation} fetchTransformations={fetchTransformations} fetchBlocks={fetchBlocks} />
                :
                <button className="layer-add-transformation-button" onClick={() => addTransformation(block._id)}>New Transformation</button>
              }
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default Layer;
