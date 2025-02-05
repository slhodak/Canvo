import './App.css'
import NetworkEditor from './NetworkEditor';
import { VisualNode, VisualConnection } from './NetworkTypes';
import ParametersPane from './ParametersPane';
import OutputView from './OutputView';
import Menu from './Menu';
import { useState, useEffect, useCallback } from 'react';
import { TextNode, PromptNode, SaveNode, ViewNode, MergeNode } from './NodeModel';

interface Coordinates {
  x: number;
  y: number;
}

const App = () => {
  const [nodePropertyChanges, setNodePropertyChanges] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [nodes, setNodes] = useState<Record<string, VisualNode>>({
    '1': { id: '1', node: new TextNode('1'), x: 100, y: 100 },
    '2': { id: '2', node: new PromptNode('2'), x: 300, y: 100 },
    '3': { id: '3', node: new SaveNode('3'), x: 400, y: 150 },
    '4': { id: '4', node: new ViewNode('4'), x: 200, y: 150 },
    '5': { id: '5', node: new MergeNode('5'), x: 200, y: 200 },
  });
  const [connections, setConnections] = useState<VisualConnection[]>([]);
  const [isHoveringEditor, setIsHoveringEditor] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<Coordinates>({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState<Coordinates>({ x: 0, y: 0 });

  const handleNodePropertyChanged = () => {
    setNodePropertyChanges(nodePropertyChanges + 1);
    // Let the node know that its properties have changed
    const node = nodes[selectedNode?.id ?? ''];
    if (node) {
      node.node.setDirty();
    }
  }

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setMousePosition({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const createNewNode = (type: 'text' | 'prompt' | 'save' | 'view' | 'merge') => {
    const newId = String(Date.now());
    const newNodes = { ...nodes };
    const newNode = (() => {
      switch (type) {
        case 'text':
          return new TextNode(newId);
        case 'prompt':
          return new PromptNode(newId);
        case 'save':
          return new SaveNode(newId);
        case 'view':
          return new ViewNode(newId);
        case 'merge':
          return new MergeNode(newId);
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
      // Don't delete the node if the user is editing text
      const activeElement = document.activeElement;
      const isEditingText = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode && !isEditingText && isHoveringEditor) {
        const newNodes = { ...nodes };
        delete newNodes[selectedNode.id];
        setNodes(newNodes);
        setSelectedNode(null);
        return;
      }

      if (event.key === 'Tab' && isHoveringEditor) {
        event.preventDefault();
        setDropdownPosition(mousePosition);
        setShowDropdown(true);
        return;
      }

      if (event.key === 'Escape') {
        setShowDropdown(false);
        return;
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
          <div className="left-pane">
            <div className="left-pane-top"
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
                connections={connections}
                setConnections={setConnections}
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
                  <div className="app-dropdown-option" onClick={() => createNewNode('save')}>
                    Save Node
                  </div>
                  <div className="app-dropdown-option" onClick={() => createNewNode('view')}>
                    View Node
                  </div>
                  <div className="app-dropdown-option" onClick={() => createNewNode('merge')}>
                    Merge Node
                  </div>
                </div>
              )}
            </div>
            <div className="left-pane-bottom">
              <ParametersPane node={selectedNode} handleNodePropertyChanged={handleNodePropertyChanged} />
            </div>
          </div>

          <div className="right-pane">
            <OutputView text="Hello, world!" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
