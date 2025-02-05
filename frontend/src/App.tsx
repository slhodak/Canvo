import './App.css'
import NetworkEditor, { VisualNode } from './NetworkEditor';
import ParametersPane from './ParametersPane';
import Menu from './Menu';
import { useState, useEffect, useCallback } from 'react';
import { TextNode } from './NodeModel';
import { PromptNode } from './NodeModel';
import { OutputNode } from './NodeModel';

interface DropdownPosition {
  x: number;
  y: number;
}

const App = () => {
  const [nodePropertyChanges, setNodePropertyChanges] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [nodes, setNodes] = useState<Record<string, VisualNode>>({
    '1': { id: '1', node: new TextNode('1'), x: 100, y: 100 },
    '2': { id: '2', node: new PromptNode('2'), x: 300, y: 100 },
    '3': { id: '3', node: new OutputNode('3'), x: 500, y: 100 },
  });
  const [isHoveringEditor, setIsHoveringEditor] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState<DropdownPosition>({ x: 0, y: 0 });

  const handleNodePropertyChanged = () => {
    setNodePropertyChanges(nodePropertyChanges + 1);
  }

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setMousePosition({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const createNewNode = (type: 'text' | 'prompt' | 'output') => {
    const newId = String(Date.now());
    const newNodes = { ...nodes };
    const newNode = (() => {
      switch (type) {
        case 'text':
          return new TextNode(newId);
        case 'prompt':
          return new PromptNode(newId);
        case 'output':
          return new OutputNode(newId);
      }
    })();

    newNodes[newId] = {
      id: newId,
      node: newNode,
      x: mousePosition.x,
      y: mousePosition.y,
    };

    setNodes(newNodes);
    setShowDropdown(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        const newNodes = { ...nodes };
        delete newNodes[selectedNode.id];
        setNodes(newNodes);
        setSelectedNode(null);
      } else if (event.key === 'Tab' && isHoveringEditor) {
        event.preventDefault();
        setDropdownPosition(mousePosition);
        setShowDropdown(true);
      } else if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, nodes, isHoveringEditor, mousePosition]);

  return (
    <div className="app-container">
      <Menu />

      <div className="right-section">
        <div className="right-section-header">
          <h2 className="app-title-header">Canvo</h2>
        </div>

        <div className="right-section-panes">
          <div className="left-pane"
            onMouseEnter={() => setIsHoveringEditor(true)}
            onMouseLeave={() => {
              setIsHoveringEditor(false);
              setShowDropdown(false);
            }}
            onMouseMove={handleMouseMove}>
            <NetworkEditor
              nodes={nodes}
              setNodes={setNodes}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              setShowDropdown={setShowDropdown}
            />
            {showDropdown && (
              <div
                className={`app-dropdown ${showDropdown ? 'visible' : ''}`}
                style={{
                  left: dropdownPosition.x,
                  top: dropdownPosition.y
                }}
              >
                <div className="app-dropdown-option" onClick={() => createNewNode('text')}>
                  Text Node
                </div>
                <div className="app-dropdown-option" onClick={() => createNewNode('prompt')}>
                  Prompt Node
                </div>
                <div className="app-dropdown-option" onClick={() => createNewNode('output')}>
                  Output Node
                </div>
              </div>
            )}
          </div>

          <div className="right-pane">
            <ParametersPane node={selectedNode} handleNodePropertyChanged={handleNodePropertyChanged} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
