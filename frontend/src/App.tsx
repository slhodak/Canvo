// import { useEffect } from 'react';
import './App.css'
// import { SERVER_URL } from './constants';
import NetworkEditor, { VisualNode } from './NetworkEditor';
import ParametersPane from './ParametersPane';
import Menu from './Menu';
import { useState } from 'react';
import { TextNode } from './NodeModel';
import { PromptNode } from './NodeModel';
import { OutputNode } from './NodeModel';

const App = () => {
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [nodes, setNodes] = useState<Record<string, VisualNode>>({
    '1': { id: '1', node: new TextNode('1'), x: 100, y: 100 },
    '2': { id: '2', node: new PromptNode('2'), x: 300, y: 100 },
    '3': { id: '3', node: new OutputNode('3'), x: 500, y: 100 },
  });
  // Fetch the latest group
  // useEffect(() => {
  //   async function fetchLatestGroup() {
  //     const response = await fetch(`${SERVER_URL}/api/get_latest_group`, {
  //       credentials: 'include',
  //     });
  //     const data = await response.json();
  //     if (data.status == 'success') {
  //       setGroup(data.group);
  //     } else {
  //       console.error('Error fetching latest group:', data.error);
  //     }
  //   }

  //   fetchLatestGroup();
  // }, []);

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
            <ParametersPane node={selectedNode} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
