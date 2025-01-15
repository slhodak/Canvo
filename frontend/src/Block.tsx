import React, { useState, useEffect } from 'react';
import './Block.css';
import { SERVER_URL } from './constants';

export interface BlockModel {
  id: number;
  author_id: string;
  content: string;
  title: string;
  timestamp: string;
}

interface BlockProps {
  block: BlockModel;
}

export const Block: React.FC<BlockProps> = ({ block }) => {
  const [title, setTitle] = useState<string>(block.title);
  const [content, setContent] = useState<string>(block.content);
  const [timestamp, setTimestamp] = useState<string>(block.timestamp);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
  };

  useEffect(() => {
    setTitle(block.title);
    setContent(block.content);
    setTimestamp(block.timestamp);
  }, [block]);

  useEffect(() => {
    const updateBlock = async () => {
      const response = await fetch(`${SERVER_URL}/api/update_block`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          id: block.id,
          title: title,
          content: content,
          timestamp: new Date().toISOString(),
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        console.log('Block updated successfully');
      } else {
        console.error('Error updating block:', data.error);
      }
    };

    updateBlock();
  }, [block.id, title, content])

  return (
    <div className="block-container">
      <div className="block-header">
        <div className="block-title">{title}</div>
        <div className="block-timestamp">{timestamp}</div>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        className="block-textarea"
        placeholder="Enter your text here..."
      />
    </div>
  );
};

export const BlockPreview = ({ block }: BlockProps) => {
  return <div className="block-preview">{block.content.slice(0, 100)}</div>;
};
