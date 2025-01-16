import React, { useState, useEffect } from 'react';
import './Block.css';
import { SERVER_URL } from './constants';
import { BlockModel } from '@wb/shared-types';
import { XSymbol } from './assets/XSymbol';

interface BlockProps {
  block: BlockModel;
  fetchBlocks: () => Promise<void>;
}

export const Block = ({ block, fetchBlocks }: BlockProps) => {
  const [content, setContent] = useState<string>(block.content);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
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

  useEffect(() => {
    const updateBlock = async () => {
      const response = await fetch(`${SERVER_URL}/api/update_block`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blockId: block._id,
          content: content,
        }),
      });
      const data = await response.json();
      if (data.status !== 'success') {
        console.error('Error updating block:', data.error);
      }
    };

    updateBlock();
  }, [block._id, content])

  return (
    <div className="block-container">
      <div className="block-header">
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
