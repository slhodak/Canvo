import { useState, useEffect } from 'react';
import './ParametersPane.css';
import { VisualNode } from './NetworkTypes';
import { NodeProperty, NodePropertyType } from 'wc-shared';
import { FileNode } from './nodes/source';

////////////////////////////////////////////////////////////
// ParametersPane
////////////////////////////////////////////////////////////

interface ParametersPaneProps {
  node: VisualNode | null;
  updateNode: (updatedNode: VisualNode, propertyChanged?: boolean, shouldSync?: boolean) => void;
}

const ParametersPane = ({ node, updateNode }: ParametersPaneProps) => {
  const [indexSelections, setIndexSelections] = useState<(number | null)[]>([]);

  useEffect(() => {
    if (!node) return;
    setIndexSelections(node.node.indexSelections);
  }, [node]);

  const handleIndexSelectionChange = (index: number, value: string) => {
    if (!node) return;

    node.node.indexSelections[index] = Number(value);
    setIndexSelections(node.node.indexSelections);
    updateNode(node);
  }

  return (
    <div className="parameters-pane-container">
      <div className="parameters-pane-header">
        <h3>Parameters<span className="parameters-pane-node-id">{node?.node.nodeId}</span></h3>
      </div>

      <div className="parameters-pane-content">
        {node && indexSelections.filter(val => val !== null).length > 0 && (
          <div className="parameters-pane-index-selections-container">
            <label className="parameters-pane-index-selections-label">Inputs</label>
            <div className="parameters-pane-index-selections">
              {indexSelections.map((val, index) => (
                val !== null && (
                  <div key={`${node.node.nodeId}-input-selection-${index}`} className="parameters-pane-index-selection-container">
                    <label className="parameters-pane-index-selection-label">{index}:</label>
                    <input
                      type="number"
                      key={index}
                      value={val}
                      onChange={(e) => handleIndexSelectionChange(index, e.target.value)}
                      className="parameters-pane-index-selection-input"
                    />
                  </div>
                )
              ))}
            </div>
          </div>
        )}
        {node && Object.entries(node.node.properties).filter(([, property]) => property.displayed).map(([key, property]) => {
          return (
            <PropertyInputContainer key={property.label} propertyKey={key} property={property} node={node} updateNode={updateNode} />
          )
        })}
      </div>
    </div>
  )
}

export default ParametersPane;

////////////////////////////////////////////////////////////
// PropertyInputContainer
////////////////////////////////////////////////////////////

interface PropertyInputContainerProps {
  propertyKey: string;
  property: NodeProperty;
  node: VisualNode;
  updateNode: (updatedNode: VisualNode, shouldSync?: boolean) => void;
}

// Using this container allows us to use a switch statement to determine the input type to display
const PropertyInputContainer = ({ propertyKey, property, node, updateNode }: PropertyInputContainerProps) => {
  switch (property.type) {
    case NodePropertyType.String:
      return <TextPropertyInput
        propertyKey={propertyKey}
        label={property.label}
        editable={property.editable}
        initialValue={property.value as string}
        node={node}
        updateNode={updateNode}
      />;
    case NodePropertyType.Number:
      return <NumberPropertyInput
        propertyKey={propertyKey}
        label={property.label}
        editable={property.editable}
        initialValue={property.value as number}
        node={node}
        updateNode={updateNode}
      />;
    case NodePropertyType.File:
      return <FilePropertyInput
        propertyKey={propertyKey}
        label={property.label}
        editable={property.editable}
        initialValue={property.value as string}
        node={node}
        updateNode={updateNode}
      />;
    case NodePropertyType.Boolean:
      return <BooleanPropertyInput
        propertyKey={propertyKey}
        label={property.label}
        editable={property.editable}
        initialValue={property.value as boolean}
        node={node}
        updateNode={updateNode}
      />;

    // So far, no 'object' properties are editable
    default:
      return null;
  }
}

////////////////////////////////////////////////////////////
// Shared Property Input Props
////////////////////////////////////////////////////////////

interface PropertyInputProps {
  propertyKey: string;
  label: string;
  editable: boolean;
  node: VisualNode;
  updateNode: (updatedNode: VisualNode, parameterChanged?: boolean, shouldSync?: boolean) => void;
}

////////////////////////////////////////////////////////////
// TextPropertyInput
////////////////////////////////////////////////////////////

interface TextPropertyInputProps extends PropertyInputProps {
  initialValue: string;
}

const TextPropertyInput = ({ propertyKey, label, editable, initialValue, node, updateNode }: TextPropertyInputProps) => {
  const [value, setValue] = useState<string>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePropertyChange = (newValue: string) => {
    setValue(newValue);
    node.node.setProperty(propertyKey, newValue);
    updateNode(node);
  }

  return (
    <div key={propertyKey} className={`parameters-pane-property-container text-property ${editable ? "editable" : ""}`}>
      <label className="parameters-pane-property-label">{label}</label>
      {editable ? (
        <textarea
          value={value}
          onChange={(e) => handlePropertyChange(e.target.value)}
          className="parameters-pane-property-textarea" />
      ) : (
        <div className="parameters-pane-property-value">{value}</div>
      )}
    </div>
  )
}

////////////////////////////////////////////////////////////
// NumberPropertyInput
////////////////////////////////////////////////////////////

interface NumberPropertyInputProps extends PropertyInputProps {
  initialValue: number;
}

const NumberPropertyInput = ({ propertyKey, label, editable, initialValue, node, updateNode }: NumberPropertyInputProps) => {
  const [value, setValue] = useState<number>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePropertyChange = (newValue: string) => {
    setValue(Number(newValue));
    node.node.setProperty(propertyKey, Number(newValue));
    updateNode(node);
  }

  return (
    <div key={propertyKey} className="parameters-pane-property-container number-property">
      <label className="parameters-pane-property-label">{label}</label>
      {editable ? (
        <input
          type="number"
          value={value}
          onChange={(e) => handlePropertyChange(e.target.value)}
          className="parameters-pane-property-number-input"
        />
      ) : (
        <div className="parameters-pane-property-value">{value}</div>
      )}
    </div >
  )
}

////////////////////////////////////////////////////////////
// FilePropertyInput
////////////////////////////////////////////////////////////

interface FilePropertyInputProps extends PropertyInputProps {
  initialValue: string;
}

const FilePropertyInput = ({ propertyKey, label, node, updateNode }: FilePropertyInputProps) => {
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !('handleFileSelect' in node.node)) return;

    await (node.node as FileNode).handleFileSelect(file);
    updateNode(node);
  };

  return (
    <div key={propertyKey} className="parameters-pane-property-container file-property">
      <label className="parameters-pane-property-label">{label}</label>
      <div className="parameters-pane-file-input">
        <input
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id={`file-input-${node.id}`}
        />
        <button
          onClick={() => document.getElementById(`file-input-${node.id}`)?.click()}
          className="parameters-pane-file-button"
        >
          Select File
        </button>
      </div>
    </div>
  );
};

////////////////////////////////////////////////////////////
// BooleanPropertyInput
////////////////////////////////////////////////////////////

interface BooleanPropertyInputProps extends PropertyInputProps {
  initialValue: boolean;
}

const BooleanPropertyInput = ({ propertyKey, label, editable, initialValue, node, updateNode }: BooleanPropertyInputProps) => {
  const handlePropertyChange = (newValue: boolean) => {
    node.node.setProperty(propertyKey, newValue);
    updateNode(node);
  }

  return <div key={propertyKey} className="parameters-pane-property-container boolean-property">
    <label className="parameters-pane-property-label">{label}</label>
    {editable ? (
      <input type="checkbox" checked={initialValue} onChange={(e) => handlePropertyChange(e.target.checked)} />
    ) : (
      <div className="parameters-pane-property-value">{initialValue ? "True" : "False"}</div>
    )}
  </div>
}
