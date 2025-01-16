import { useState, useEffect, useCallback } from 'react';
import './Transformation.css';
import { SERVER_URL } from './constants';
import { TransformationModel } from '@wb/shared-types';
import { XSymbol } from './assets/XSymbol';

interface TransformationProps {
  transformation: TransformationModel;
  fetchTransformations: () => Promise<void>;
}

const Transformation = ({ transformation, fetchTransformations }: TransformationProps) => {
  const [prompt, setPrompt] = useState<string>(transformation.prompt);

  const updateTransformation = useCallback(async () => {
    await fetch(`${SERVER_URL}/api/update_transformation/${transformation._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
  }, [transformation._id, prompt]);

  const deleteTransformation = useCallback(async () => {
    await fetch(`${SERVER_URL}/api/delete_transformation/${transformation._id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    fetchTransformations();
  }, [transformation._id, fetchTransformations]);

  useEffect(() => {
    updateTransformation();
  }, [updateTransformation]);

  return (
    <div className="transformation-container">
      <textarea
        className="transformation-prompt-textarea"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="transformation-footer-container">
        <button className="transformation-delete-button" onClick={deleteTransformation}>
          <XSymbol />
        </button>
        <button className="transformation-run-button">Run</button>
      </div>
    </div>
  );
}

export default Transformation;