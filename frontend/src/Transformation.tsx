import { useState } from 'react';
import { TransformationModel } from '@wb/shared-types';
import './Transformation.css';

interface TransformationProps {
  transformation: TransformationModel;
}

const Transformation = ({ transformation }: TransformationProps) => {
  const [prompt, setPrompt] = useState<string>(transformation.prompt);

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