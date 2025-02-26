import { OutputViewProps } from './OutputView';

export const TableView = ({ outputState }: OutputViewProps) => {
  return (
    <div className="output-view-table">
      {outputState.tableValue?.[0] ? (
        <>
          <div className="output-view-table-header">
            {outputState.tableValue?.[0]?.map((header, index) => (
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
        </>
      ) : (
        <div className="output-view-table-header">No data</div>
      )}
    </div>
  );
}

export default TableView;
