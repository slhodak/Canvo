import { useState, useEffect } from 'react';
import './ParametersPane.css';
import { BaseNode } from './NodeModel';
import { VisualNode } from './NetworkEditor';
import { NodeProperty } from './NodeModel';

interface ParametersPaneProps {
  node: VisualNode | null;
}

const ParametersPane = ({ node }: ParametersPaneProps) => (
  <div className="parameters-pane-container">
    <div className="parameters-pane-header">
      <h3>Parameters</h3>
    </div>

    <div className="parameters-pane-content">
      {node && Object.entries(node.node.properties).filter(([, property]) => property.displayed).map(([key, property]) => (
        <PropertyInputContainer key={property.label} propertyKey={key} property={property} node={node.node} />
      ))}
    </div>
  </div>
)

export default ParametersPane;

interface PropertyInputContainerProps {
  propertyKey: string;
  property: NodeProperty;
  node: BaseNode;
}

// Using this container allows us to use a switch statement to determine the input type to display
const PropertyInputContainer = ({ propertyKey, property, node }: PropertyInputContainerProps) => {
  switch (property.type) {
    case 'string':
      return <TextPropertyInput propertyKey={propertyKey} label={property.label} editable={property.editable} initialValue={property.value as string} node={node} />;
    default:
      return null;
  }
}

interface PropertyInputProps {
  propertyKey: string;
  label: string;
  editable: boolean;
  initialValue: string;
  node: BaseNode;
}

const TextPropertyInput = ({ propertyKey, label, editable, initialValue, node }: PropertyInputProps) => {
  const [value, setValue] = useState<string>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePropertyChange = (newValue: string) => {
    setValue(newValue);
    node.setProperty(propertyKey, newValue);
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
