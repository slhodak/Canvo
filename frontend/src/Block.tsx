import React, { useState, useRef, useEffect } from 'react';
import './Block.css';
import { SERVER_URL } from './constants';
import { XSymbol } from './assets/XSymbol';
import { BlockModel } from '@wb/shared-types';
import CopyIcon from './assets/CopyIcon';

interface BlockProps {
  block: BlockModel;
  fetchBlocks: () => Promise<void>;
  zoom: string;
}

const Block = ({ block, fetchBlocks, zoom }: BlockProps) => {
  const [content, setContent] = useState<string>(block.content);
  const blockIdRef = useRef<string>(block._id); // Is this really still necessary?

  // If we don't do this, the content will not update when a new block arrives
  // It's okay because content is not a dependency for any other hooks
  useEffect(() => {
    setContent(block.content);
  }, [block]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Fan out update and reset to current content if server update fails
    updateBlock(content, event.target.value);
    setContent(event.target.value);
  };

  const updateBlock = async (oldContent: string, newContent: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/update_block`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blockId: blockIdRef.current,
          content: newContent,
        }),
      });

      const data = await response.json();
      if (data.status !== 'success') {
        console.error('Error updating block:', data.error);
        setContent(oldContent);
      }
    } catch (error) {
      setContent(oldContent);
      console.error('Error updating block:', error);
    }
  };

  const deleteBlock = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/delete_block/${block._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status !== 'success') {
        console.error('Error deleting block:', data.error);
      }
      fetchBlocks();
    } catch (error) {
      console.error('Error deleting block:', error);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = `${block.position}${content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      console.log('Content copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy content: ', err);
    });
  };

  return (
    <div className={`block-container block-zoom-${zoom}`}>
      <div className="block-header">
        <div className="block-position">{block.position}</div>
        <button className="block-copy-button" onClick={copyToClipboard}>
          <CopyIcon />
        </button>
        <button className="block-delete-button" onClick={deleteBlock}>
          <XSymbol />
        </button>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        className="block-content-textarea"
        placeholder="What's poppin?"
      />
    </div>
  );
};

export default Block;
