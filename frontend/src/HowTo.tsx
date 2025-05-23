import React, { useEffect, useRef } from 'react';
import './Modal.css';

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
    <div className="modal-overlay">
      <div className="modal-content" ref={contentRef}>
        <div className="modal-content-header">
          <h2>How To Use Canvo</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <h3>Demo Video</h3>
        <ul><li>Summarize, embed, and search the text of an imported file</li></ul>
        <iframe
          width="500"
          height="315"
          src="https://www.youtube.com/embed/nYXb6dLqz1k"
          title="Canvo Demo Video"
          style={{ border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        <section>
          <h2>tl;dr</h2>
          <li>Tab to add, delete to create, right click to pan, scroll to zoom, connect outputs to inputs, display using the little rectangle on the left of the node</li>
          <li>Start by creating a new Project</li>
        </section>

        <section>
          <h3>The Network Editor</h3>
          <ul>
            <li>Use the Tab key while hovering over the canvas to open the node selection menu</li>
            <li>Click on a node or start typing and hit Enter to select one by name</li>
            <li>Right click and drag in the editor to pan around</li>
            <li>Use the scroll wheel to zoom in and out</li>
            <li>The delete or backspace key deletes the selected node</li>
          </ul>
        </section>

        <section>
          <h3>Nodes</h3>
          <ul>
            <li>Drag from one node's output to another node's input to connect them</li>
            <li>Choose a node to display by clicking on the rectangle on the left side of the node</li>
            <li>Some nodes must be run manually by clicking on the "play" icon to the right of the node</li>
            <li>AI nodes cost tokens to run</li>
            <li>Nodes have different types of outputs and inputs</li>
            <li>If you connect an output that sends an array to an input that expects a single value, the Parameters pane will show an Inputs parameter that lets you choose the index of the array input to operate on, for each input of the node</li>
          </ul>
        </section>

        <section>
          <h3>The Parameters Pane</h3>
          <li>The Parameters pane will show the parameters for the selected node</li>
          <li>See the last note in the "Nodes" section pertaining to array outputs</li>
        </section>

        <section>
          <h3>The Output Pane</h3>
          <li>The Output pane on the right shows the output of the currently displayed node</li>
          <li>The tabs at the top of the pane allow you to select different types of output, but nodes typically have only one at a time</li>
        </section>

        <section>
          <h3>Tokens</h3>
          <li>You can have up to 500 tokens</li>
          <li>You will get up to 50 new tokens every hour</li>
          <li>Running the PromptNode costs 5 tokens</li>
          <li>Embedding a document costs 1 token</li>
          <li>Searching embeddings costs 1 token</li>
        </section>
      </div>
    </div>
  );
};

export default HowTo;
