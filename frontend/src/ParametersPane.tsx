import { useState, useEffect } from 'react';
import './ParametersPane.css';
import { VisualNode } from './NetworkTypes';
import { NodeProperty } from '../../shared/types/src/models/node';

interface ParametersPaneProps {
  node: VisualNode | null;
  updateNodes: (updatedNode: VisualNode, shouldSync?: boolean) => void;
}

const ParametersPane = ({ node, updateNodes }: ParametersPaneProps) => (
  <div className="parameters-pane-container">
    <div className="parameters-pane-header">
      <h3>Parameters<span className="parameters-pane-node-id">{node?.node.nodeId}</span></h3>
    </div>

    <div className="parameters-pane-content">
      {node && Object.entries(node.node.properties).filter(([, property]) => property.displayed).map(([key, property]) => (
        <PropertyInputContainer key={property.label} propertyKey={key} property={property} node={node} updateNodes={updateNodes} />
      ))}
    </div>
  </div>
)

export default ParametersPane;

interface PropertyInputContainerProps {
  propertyKey: string;
  property: NodeProperty;
  node: VisualNode;
  updateNodes: (updatedNode: VisualNode, shouldSync?: boolean) => void;
}

// Using this container allows us to use a switch statement to determine the input type to display
const PropertyInputContainer = ({ propertyKey, property, node, updateNodes }: PropertyInputContainerProps) => {
  switch (property.type) {
    case 'string':
      return <TextPropertyInput propertyKey={propertyKey} label={property.label} editable={property.editable} initialValue={property.value as string} node={node} updateNodes={updateNodes} />;
    case 'number':
      return <NumberPropertyInput propertyKey={propertyKey} label={property.label} editable={property.editable} initialValue={property.value as number} node={node} updateNodes={updateNodes} />;
    default:
      return null;
  }
}

interface PropertyInputProps {
  propertyKey: string;
  label: string;
  editable: boolean;
  node: VisualNode;
  updateNodes: (updatedNode: VisualNode, shouldSync?: boolean) => void;
}

interface TextPropertyInputProps extends PropertyInputProps {
  initialValue: string;
}

const TextPropertyInput = ({ propertyKey, label, editable, initialValue, node, updateNodes }: TextPropertyInputProps) => {
  const [value, setValue] = useState<string>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePropertyChange = (newValue: string) => {
    setValue(newValue);
    node.node.setProperty(propertyKey, newValue);
    updateNodes(node);
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

interface NumberPropertyInputProps extends PropertyInputProps {
  initialValue: number;
}

const NumberPropertyInput = ({ propertyKey, label, editable, initialValue, node, updateNodes }: NumberPropertyInputProps) => {
  const [value, setValue] = useState<number>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePropertyChange = (newValue: string) => {
    setValue(Number(newValue));
    node.node.setProperty(propertyKey, Number(newValue));
    updateNodes(node);
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
