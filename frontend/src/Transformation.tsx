import { TransformationModel } from '@wb/shared-types';

interface TransformationProps {
  transformation: TransformationModel;
}

const Transformation = ({ transformation }: TransformationProps) => {
  return (
    <div>
      <h1>Transformation</h1>
      <p>{transformation.label}</p>
      <p>{transformation.prompt}</p>
      <button>Run</button>
    </div>
  );
}

export default Transformation;