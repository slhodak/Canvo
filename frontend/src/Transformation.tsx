import { useState } from 'react';
import './Transformation.css';
import { SERVER_URL } from './constants';
import { TransformationModel } from '@wb/shared-types';
import { XSymbol } from './assets/XSymbol';

interface TransformationProps {
  transformation: TransformationModel;
  fetchTransformations: () => Promise<void>;
  fetchBlocks: () => Promise<void>;
}

const Transformation = ({ transformation, fetchTransformations, fetchBlocks }: TransformationProps) => {
  const [prompt, setPrompt] = useState<string>(transformation.prompt);

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Fan out update and reset to current prompt if server update fails
    updateTransformation(prompt, event.target.value);
    setPrompt(event.target.value);
  };

  const updateTransformation = async (oldPrompt: string, newPrompt: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/update_transformation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transformationId: transformation._id,
          prompt: newPrompt,
        }),
      });

      const data = await response.json();
      if (data.status !== 'success') {
        setPrompt(oldPrompt);
        console.error('Error updating transformation:', data.error);
      }
    } catch (error) {
      setPrompt(oldPrompt);
      console.error('Error updating transformation:', error);
    }
  }

  const deleteTransformation = async () => {
    try {
      await fetch(`${SERVER_URL}/api/delete_transformation/${transformation._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchTransformations();
    } catch (error) {
      console.error('Error deleting transformation:', error);
    }
  };

  const runTransformation = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/run_transformation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transformationId: transformation._id }),
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

  return (
    <div className="transformation-container">
      <textarea
        className="transformation-prompt-textarea"
        value={prompt}
        onChange={handlePromptChange}
      />
      <div className="transformation-footer-container">
        <button className="transformation-delete-button" onClick={deleteTransformation}>
          <XSymbol />
        </button>
        <button className="transformation-run-button" onClick={runTransformation}>Run</button>
      </div>
    </div>
  );
}

export default Transformation;