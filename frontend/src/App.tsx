import './App.css'
import NetworkEditor, { VisualNode } from './NetworkEditor';
import ParametersPane from './ParametersPane';
import Menu from './Menu';
import { useState, useEffect } from 'react';
import { TextNode } from './NodeModel';
import { PromptNode } from './NodeModel';
import { OutputNode } from './NodeModel';

const App = () => {
  const [nodePropertyChanges, setNodePropertyChanges] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [nodes, setNodes] = useState<Record<string, VisualNode>>({
    '1': { id: '1', node: new TextNode('1'), x: 100, y: 100 },
    '2': { id: '2', node: new PromptNode('2'), x: 300, y: 100 },
    '3': { id: '3', node: new OutputNode('3'), x: 500, y: 100 },
  });

  const handleNodePropertyChanged = () => {
    setNodePropertyChanges(nodePropertyChanges + 1);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        const newNodes = { ...nodes };  // Create a shallow copy
        delete newNodes[selectedNode.id];
        setNodes(newNodes);
        setSelectedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, nodes]);

  return (
    <div className="app-container">
      <Menu />

      <div className="right-section">
        <div className="right-section-header">
          <h2 className="app-title-header">Canvo</h2>
        </div>

        <div className="right-section-panes">
          <div className="left-pane">
            <NetworkEditor
              nodes={nodes}
              setNodes={setNodes}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
            />
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
