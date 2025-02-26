import './OutputView.css';
import { IOState, IOStateType } from '../../shared/types/src/models/node';
import { useState, useEffect } from 'react';
import TableView from './TableView';

export interface OutputViewProps {
  outputState: IOState;
}

const SelectorDisplayNames: Record<IOStateType, string> = {
  [IOStateType.String]: 'Text',
  [IOStateType.Number]: 'Number',
  [IOStateType.StringArray]: 'Text Array',
  [IOStateType.Table]: 'Table',
  [IOStateType.Empty]: 'None',
}

const OutputView = ({ outputState }: OutputViewProps) => {
  const [selectedStateType, setSelectedStateType] = useState<IOStateType>(outputState.type);
  const validOutputTypes = Object.values(IOStateType).filter((type) => type !== IOStateType.Empty);

  useEffect(() => {
    setSelectedStateType(outputState.type);
  }, [outputState]);

  return (
    <div className="output-view-container">
      <div className="output-view-selector">
        {validOutputTypes.map((type) => {
          const isSelected = selectedStateType === type;
          return (
            <button
              key={type}
              className={`output-view-selector-item ${isSelected ? 'selected' : ''} ${outputState.type === type ? 'has-value' : ''}`}
              onClick={() => setSelectedStateType(type)}>
              {SelectorDisplayNames[type]}
            </button>
          );
        })}
      </div>
      <div className="output-view-content">
        {/* Different kinds of display components based on output type */}
        {selectedStateType === IOStateType.String ? (
          <div className="output-view-text">{outputState.stringValue}</div>
        ) : selectedStateType === IOStateType.Number ? (
          <div className="output-view-number">{outputState.numberValue}</div>
        ) : selectedStateType === IOStateType.StringArray ? (
          <div className="output-view-string-array">
            <div className="output-view-string-array-items">
              {outputState.stringArrayValue?.map((value, index) => (
                <div key={`string-array-value-${index}`} className="output-view-string-array-item">
                  <div className="output-view-string-array-item-index">{index}</div>
                  <div className="output-view-string-array-item-value">{value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedStateType === IOStateType.Table ? (
          <TableView outputState={outputState} />
        ) : (
          <div className="output-view-text">None</div>
        )}
      </div>
    </div >
  );
};

export default OutputView;
