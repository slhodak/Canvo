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
  const [outputs, setOutputs] = useState<number>(transformation.outputs);

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Fan out update and reset to current prompt if server update fails
    updateTransformation({ newPrompt: event.target.value });
    setPrompt(event.target.value);
  };

  const handleOutputsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateTransformation({ newOutputs: Number(event.target.value) });
    setOutputs(Number(event.target.value));
  };

  const updateTransformation = async ({ newPrompt, newOutputs }: { newPrompt?: string, newOutputs?: number }) => {
    const oldPrompt = prompt;
    const oldOutputs = outputs;

    const body: Record<string, string | number> = {
      transformationId: transformation._id,
    };
    if (newOutputs) {
      body['outputs'] = newOutputs;
    }
    if (newPrompt) {
      body['prompt'] = newPrompt;
    }

    try {
      const response = await fetch(`${SERVER_URL}/api/update_transformation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.status !== 'success') {
        setPrompt(oldPrompt);
        setOutputs(oldOutputs);
        console.error('Error updating transformation:', data.error);
      }
    } catch (error) {
      setPrompt(oldPrompt);
      setOutputs(oldOutputs);
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
      <div className="transformation-header-container">
        <p className="transformation-position">{transformation.position}</p>
        <button className="transformation-delete-button" onClick={deleteTransformation}>
          <XSymbol />
        </button>
      </div>

      <textarea
        className="transformation-prompt-textarea"
        value={prompt}
        onChange={handlePromptChange}
      />

      <div className="transformation-footer-container">
        <p className="transformation-outputs-label">Outputs:</p>
        <input
          type="number"
          className="transformation-outputs-number-input"
          value={outputs}
          onChange={handleOutputsChange}
        />

        <button className="transformation-run-button" onClick={runTransformation}>Run</button>
      </div>
    </div>
  );
}

export default Transformation;
