import { useState } from 'react';
import './Transformation.css';
import { SERVER_URL } from './constants';
import { TransformationModel } from '@wb/shared-types';
import { XSymbol } from './assets/XSymbol';
import { LockIcon } from './assets/LockIcon';

interface TransformationProps {
  transformation: TransformationModel;
  fetchTransformations: () => Promise<void>;
  runTransformation: (transformationId: string) => Promise<void>;
}

const Transformation = ({ transformation, fetchTransformations, runTransformation }: TransformationProps) => {
  const [locked, setLocked] = useState<boolean>(transformation.locked);
  const [prompt, setPrompt] = useState<string>(transformation.prompt);
  const [outputs, setOutputs] = useState<number>(transformation.outputs);

  const toggleLock = () => {
    updateTransformation({ newLocked: !locked });
    setLocked(!locked);
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Fan out update and reset to current prompt if server update fails
    updateTransformation({ newPrompt: event.target.value });
    console.log('updating prompt', event.target.value);
    setPrompt(event.target.value);
  };

  const handleOutputsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateTransformation({ newOutputs: Number(event.target.value) });
    setOutputs(Number(event.target.value));
  };

  const handleRun = () => {
    if (!locked && prompt) {
      runTransformation(transformation._id);
    } else {
      console.warn('Transformation is locked or has no prompt');
    }
  };

  const updateTransformation = async ({ newPrompt, newOutputs, newLocked }: { newPrompt?: string, newOutputs?: number, newLocked?: boolean }) => {
    const oldPrompt = prompt;
    const oldOutputs = outputs;
    const oldLocked = locked;
  
    const body: Record<string, string | number> = {
      transformationId: transformation._id,
      groupId: transformation.group_id,
    };
    if (newOutputs) {
      body['outputs'] = newOutputs;
    }
    if (newPrompt) {
      body['prompt'] = newPrompt;
    }
    if (newLocked !== undefined) {
      body['locked'] = newLocked.toString();
    }

    console.log('updating transformation', body);
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
        setLocked(oldLocked);
        console.error('Error updating transformation:', data.error);
      }
    } catch (error) {
      setPrompt(oldPrompt);
      setOutputs(oldOutputs);
      setLocked(oldLocked);
      console.error('Error updating transformation:', error);
    }
  }

  const deleteTransformation = async () => {
    try {
      await fetch(`${SERVER_URL}/api/delete_transformation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId: transformation.group_id, transformationId: transformation._id }),
      });
      fetchTransformations();
    } catch (error) {
      console.error('Error deleting transformation:', error);
    }
  };

  return (
    <div className="transformation-container">
      <div className="transformation-header-container">
        <p className="transformation-position">{transformation.position}</p>
        <button className="transformation-lock-button" onClick={toggleLock}>
          <LockIcon locked={locked} />
        </button>
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

        <button className={`transformation-run-button ${locked ? 'locked' : ''}`} onClick={handleRun}>Run</button>
      </div>
    </div>
  );
}

export default Transformation;
