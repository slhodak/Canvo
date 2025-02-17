import { useState, useEffect } from 'react';
import './ParametersPane.css';
import { VisualNode } from './NetworkTypes';
import { NodeProperty, NodeType } from '../../shared/types/src/models/node';
import { FileNode } from './nodes';

////////////////////////////////////////////////////////////
// ParametersPane
////////////////////////////////////////////////////////////

interface ParametersPaneProps {
  node: VisualNode | null;
  updateNode: (updatedNode: VisualNode, shouldSync?: boolean) => void;
}

const ParametersPane = ({ node, updateNode }: ParametersPaneProps) => (
  <div className="parameters-pane-container">
    <div className="parameters-pane-header">
      <h3>Parameters<span className="parameters-pane-node-id">{node?.node.nodeId}</span></h3>
    </div>

    <div className="parameters-pane-content">
      {node && Object.entries(node.node.properties).filter(([, property]) => property.displayed).map(([key, property]) => (
        <PropertyInputContainer key={property.label} propertyKey={key} property={property} node={node} updateNode={updateNode} />
      ))}
    </div>
  </div>
)

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
  // Special case for FileNode content property
  if (node.node.type === NodeType.File && propertyKey === 'content') {
    return <FilePropertyInput
      propertyKey={propertyKey}
      label={property.label}
      editable={property.editable}
      initialValue={property.value as string}
      node={node}
      updateNode={updateNode}
    />;
  }

  switch (property.type) {
    case 'string':
      return <TextPropertyInput
        propertyKey={propertyKey}
        label={property.label}
        editable={property.editable}
        initialValue={property.value as string}
        node={node}
        updateNode={updateNode}
      />;
    case 'number':
      return <NumberPropertyInput
        propertyKey={propertyKey}
        label={property.label}
        editable={property.editable}
        initialValue={property.value as number}
        node={node}
        updateNode={updateNode}
      />;
    default:
      return null;
  }
}

////////////////////////////////////////////////////////////
// TextPropertyInput
////////////////////////////////////////////////////////////

interface PropertyInputProps {
  propertyKey: string;
  label: string;
  editable: boolean;
  node: VisualNode;
  updateNode: (updatedNode: VisualNode, shouldSync?: boolean) => void;
}

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
    updateNode(node, true);
  }

  return (
    <div key={propertyKey} className="parameters-pane-property-container">
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
    updateNode(node, true);
  }

  return (
    <div key={propertyKey} className="parameters-pane-property-container">
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
    updateNode(node, true);
  };

  return (
    <div className="parameters-pane-property-container">
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
