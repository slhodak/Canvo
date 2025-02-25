import './OutputView.css';
import { IOState, IOStateType } from '../../shared/types/src/models/node';
import { useState, useCallback, useEffect } from 'react';

interface OutputViewProps {
  outputState: IOState;
}

const SelectorDisplayNames: Record<IOStateType, string> = {
  [IOStateType.String]: 'Text',
  [IOStateType.Number]: 'Number',
  [IOStateType.StringArray]: 'Text Array',
  [IOStateType.Table]: 'Table',
  [IOStateType.Empty]: 'None',
}

// Let there be multiple panes for the output view
const OutputView = ({ outputState }: OutputViewProps) => {
  const [selectedStateType, setSelectedStateType] = useState<IOStateType>(outputState.type);
  const validOutputTypes = Object.values(IOStateType).filter((type) => type !== IOStateType.Empty);

  const renderValue = useCallback((): string => {
    // Just because a state type is selected doesn't mean this output state has any value of that type
    switch (selectedStateType) {
      case IOStateType.String:
        if (outputState.type === IOStateType.String) {
          return outputState.getValue() as string;
        } else {
          return 'N/A';
        }
      case IOStateType.Number:
        if (outputState.type === IOStateType.Number) {
          return (outputState.getValue() as number).toString();
        } else {
          return 'N/A';
        }
      case IOStateType.StringArray:
        if (outputState.type === IOStateType.StringArray) {
          return (outputState.getValue() as string[]).join(', ');
        } else {
          return 'N/A';
        }
      case IOStateType.Table:
        if (outputState.type === IOStateType.Table) {
          return (outputState.getValue() as string[][]).join(', ');
        } else {
          return 'N/A';
        }
      default:
        return 'None';
    }
  }, [selectedStateType, outputState]);

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
        {/* Room for different kinds of display components based on output type */}
        {selectedStateType === IOStateType.String ? (
          <div className="output-view-text">{renderValue()}</div>
        ) : selectedStateType === IOStateType.Number ? (
          <div className="output-view-number">{renderValue()}</div>
        ) : selectedStateType === IOStateType.StringArray ? (
          <div className="output-view-string-array">
            <div className="output-view-string-array-items">
              {outputState.stringArrayValue?.map((value, index) => (
                <div key={`string-array-value-${index}`} className="output-view-string-array-item">{value}</div>
              ))}
            </div>
          </div>
        ) : selectedStateType === IOStateType.Table ? (
          <TableView outputState={outputState} />
        ): (
            <div className = "output-view-text">None</div>
        )}
    </div>
    </div >
  );
};

export default OutputView;

const TableView = ({ outputState }: OutputViewProps) => {
  return (
    <div className="output-view-table">
      <div className="output-view-table-header">
        {outputState.tableValue?.[0].map((header, index) => (
          <div key={`table-header-${index}`} className="output-view-table-header-item">
            {header}
          </div>
        ))}
      </div>
      <div className="output-view-table-body">
        {outputState.tableValue?.slice(1).map((row, index) => (
          <div key={`table-row-${index}`} className="output-view-table-row">
            {row.map((cell, cellIndex) => (
              <div key={`table-cell-${cellIndex}`} className="output-view-table-cell">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}