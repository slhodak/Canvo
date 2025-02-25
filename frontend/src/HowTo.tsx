import React, { useEffect, useRef } from 'react';
import './HowTo.css';

interface HowToProps {
  isOpen: boolean;
  onClose: () => void;
}

const HowTo: React.FC<HowToProps> = ({ isOpen, onClose }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="howto-overlay">
      <div className="howto-content" ref={contentRef}>
        <button className="howto-close" onClick={onClose}>×</button>
        <h2>How to Use the Network Editor</h2>

        <section>
          <h3>Basic Operations</h3>
          <ul>
            <li>Double-click on the canvas to add a new node</li>
            <li>Click and drag nodes to move them</li>
            <li>Click a node to select it and view its parameters</li>
            <li>Drag from one node's output to another node's input to connect them</li>
          </ul>
        </section>

        <section>
          <h3>Node Types</h3>
          <ul>
            <li><strong>Source Nodes:</strong> Provide initial data input</li>
            <li><strong>Run Nodes:</strong> Process input and produce output</li>
            <li><strong>Cache Nodes:</strong> Store intermediate results</li>
          </ul>
        </section>

        <section>
          <h3>Tips</h3>
          <ul>
            <li>Use the parameters pane to configure selected nodes</li>
            <li>The output view shows results from displayed nodes</li>
            <li>Connections automatically validate compatible input/output types</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HowTo;
