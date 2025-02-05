import { useState, useEffect } from 'react';
import './ParametersPane.css';
import { VisualNode } from './NetworkEditor';
import { NodeProperty } from './NodeModel';

interface ParametersPaneProps {
  node: VisualNode | null;
  handleNodePropertyChanged: () => void;
}

const ParametersPane = ({ node, handleNodePropertyChanged }: ParametersPaneProps) => {
  useEffect(() => {
    console.log("node changed");
  }, [node]);

  return (
    <div className="parameters-pane-container">
      <div className="parameters-pane-header">
        <h3>Parameters</h3>
      </div>

      <div className="parameters-pane-content">
        {node && Object.entries(node.node.properties).filter(([, property]) => property.displayed).map(([key, property]) => (
          <PropertyInputContainer key={property.label} propertyKey={key} property={property} node={node} handleNodePropertyChanged={handleNodePropertyChanged} />
        ))}
      </div>
    </div>
  )
}

export default ParametersPane;

interface PropertyInputContainerProps {
  propertyKey: string;
  property: NodeProperty;
  node: VisualNode;
  handleNodePropertyChanged: () => void;
}

// Using this container allows us to use a switch statement to determine the input type to display
const PropertyInputContainer = ({ propertyKey, property, node, handleNodePropertyChanged }: PropertyInputContainerProps) => {
  switch (property.type) {
    case 'string':
      return <TextPropertyInput propertyKey={propertyKey} label={property.label} editable={property.editable} initialValue={property.value as string} node={node} handleNodePropertyChanged={handleNodePropertyChanged} />;
    case 'number':
      return <NumberPropertyInput propertyKey={propertyKey} label={property.label} editable={property.editable} initialValue={property.value as number} node={node} handleNodePropertyChanged={handleNodePropertyChanged} />;
    default:
      return null;
  }
}

interface PropertyInputProps {
  propertyKey: string;
  label: string;
  editable: boolean;
  node: VisualNode;
  handleNodePropertyChanged: () => void;
}

interface TextPropertyInputProps extends PropertyInputProps {
  initialValue: string;
}

const TextPropertyInput = ({ propertyKey, label, editable, initialValue, node, handleNodePropertyChanged }: TextPropertyInputProps) => {
  const [value, setValue] = useState<string>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePropertyChange = (newValue: string) => {
    setValue(newValue);
    node.node.setProperty(propertyKey, newValue);
    handleNodePropertyChanged();
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

const NumberPropertyInput = ({ propertyKey, label, editable, initialValue, node, handleNodePropertyChanged }: NumberPropertyInputProps) => {
  const [value, setValue] = useState<number>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePropertyChange = (newValue: string) => {
    setValue(Number(newValue));
    node.node.setProperty(propertyKey, Number(newValue));
    handleNodePropertyChanged();
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
