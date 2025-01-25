import React, { useState, useRef, useEffect } from 'react';
import './Block.css';
import { SERVER_URL } from './constants';
import { XSymbol } from './assets/XSymbol';
import { BlockModel } from '@wb/shared-types';
import CopyIcon from './assets/CopyIcon';
import { LockIcon } from './assets/LockIcon';

interface BlockProps {
  depth: number;
  block: BlockModel;
  fetchBlocks: () => Promise<void>;
  zoom: string;
}

const Block = ({ depth, block, fetchBlocks, zoom }: BlockProps) => {
  const [locked, setLocked] = useState<boolean>(block.locked);
  const [content, setContent] = useState<string>(block.content);
  // const blockIdRef = useRef<string>(block._id); // Is this really still necessary?

  // If we don't do this, the content will not update when a new block arrives
  // It's okay because content is not a dependency for any other hooks
  useEffect(() => {
    setLocked(block.locked);
    setContent(block.content);
  }, [block]);

  const toggleLock = () => {
    updateBlock({ newLocked: !locked });
    setLocked(!locked);
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateBlock({ newContent: event.target.value });
    setContent(event.target.value);
  };

  const updateBlock = async ({ newContent, newLocked }: { newContent?: string, newLocked?: boolean }) => {
    const oldContent = content;
    const oldLocked = locked;

    const body: Record<string, string | number> = {
      blockId: block._id,
      groupId: block.group_id,
    };
    if (newContent) {
      body['content'] = newContent;
    }
    if (newLocked !== undefined) {
      body['locked'] = newLocked ? 'true' : 'false';
    }

    try {
      const response = await fetch(`${SERVER_URL}/api/update_block`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.status !== 'success') {
        setContent(oldContent);
        setLocked(oldLocked);
        console.error('Error updating block:', data.error);
      }
    } catch (error) {
      setContent(oldContent);
      setLocked(oldLocked);
      console.error('Error updating block:', error);
    }
  };

  const deleteBlock = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/delete_block`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blockId: block._id,
          groupId: block.group_id,
        }),
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
        {depth > 0 && <button className="block-lock-button" onClick={toggleLock}>
          <LockIcon locked={locked} />
        </button>}
        <button className="block-copy-button" onClick={copyToClipboard}>
          <CopyIcon />
        </button>
        <button className="block-delete-button" onClick={deleteBlock}>
          <XSymbol />
        </button>
      </div>
      <textarea
        value={content}
        onChange={handleContentChange}
        className="block-content-textarea"
        placeholder="What's poppin?"
      />
    </div>
  );
};

export default Block;
