import './ParametersPane.css';
import { VisualNode } from './NetworkEditor';

interface ParametersPaneProps {
  node: VisualNode | null;
}

const ParametersPane = ({ node }: ParametersPaneProps) => {
  return (
    <div className="parameters-pane-container">
      <div className="parameters-pane-header">
        <h3>Parameters</h3>
      </div>

      <div className="parameters-pane-content">
        {node && Object.values(node.node.properties).filter((property) => property.displayed).map((property) => (
          <div key={property.label} className="parameters-pane-property-container">
            <label className="parameters-pane-property-label">{property.label}</label>
            <input type={property.type} value={property.value} disabled={!property.editable} />
            <div className="parameters-pane-property-spacer" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ParametersPane;
