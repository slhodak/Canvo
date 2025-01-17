import React, { useState, useEffect, useRef } from 'react';
import './Block.css';
import { SERVER_URL } from './constants';
import { XSymbol } from './assets/XSymbol';

interface BlockProps {
  blockId: string;
  fetchBlockIds: () => Promise<void>;
}

export const Block = ({ blockId, fetchBlockIds }: BlockProps) => {
  const [content, setContent] = useState<string>('');
  const blockIdRef = useRef<string>(blockId);

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
      const response = await fetch(`${SERVER_URL}/api/delete_block/${blockId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status !== 'success') {
        console.error('Error deleting block:', data.error);
      }
      fetchBlockIds();
    } catch (error) {
      console.error('Error deleting block:', error);
    }
  };

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/get_block/${blockIdRef.current}`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        if (data.status === 'success') {
          setContent(data.block.content);
        } else {
          console.error(`Could not get block: ${data.error}`)
        }
      } catch (error) {
        console.error('Error fetching block:', error);
      }
    };

    fetchBlock();
  }, [blockIdRef])

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
