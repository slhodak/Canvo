import { useState, useEffect, useCallback } from 'react';
import './Transformation.css';
import { SERVER_URL } from './constants';
import { TransformationModel } from '@wb/shared-types';

interface TransformationProps {
  transformation: TransformationModel;
}

const Transformation = ({ transformation }: TransformationProps) => {
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
      <button className="transformation-run-button">Run</button>
    </div>
  );
}

export default Transformation;