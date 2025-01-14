import React, { useState } from 'react';
import './Block.css';

export interface BlockObject {
  id: number;
  text: string;
}

interface BlockProps {
  block: BlockObject;
}

export const Block: React.FC<BlockProps> = ({ block }) => {
  const [text, setText] = useState<string>(block.text);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  return (
    <div className="block-container">
      <textarea
        value={text}
        onChange={handleChange}
        className="block-textarea"
        placeholder="Enter your text here..."
      />
    </div>
  );
};

export const BlockPreview = ({ block }: BlockProps) => {
  return <div className="block-preview">{block.text.slice(0, 100)}</div>;
};
