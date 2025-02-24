import './OutputView.css';
import { IOState } from '../../shared/types/src/models/node';
import * as tf from '@tensorflow/tfjs';

interface OutputViewProps {
  outputState: IOState;
}

// Let there be multiple panes for the output view
const OutputView = ({ outputState }: OutputViewProps) => {
  const renderValue = (value: string | number | string[] | tf.Tensor | null) => {
    switch (typeof value) {
      case 'string':
        return value;
      case 'number':
        return value.toString();
      case 'object':
        if (value instanceof tf.Tensor) {
          return value.toString();
        }
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="output-view-container">
      {Object.entries(outputState.getStateDict()).map(([key, value], index) => (
        value !== null && (
          <div key={index} className="output-view-content">
            <div className="output-view-header">{key}</div>
            <div className="output-view-text">{renderValue(value)}</div>
          </div>
        )
      ))}
    </div>
  );
};

export default OutputView;
