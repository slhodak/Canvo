// import { useEffect } from 'react';
import './App.css'
// import { SERVER_URL } from './constants';
import NetworkEditor from './NetworkEditor';
import ParametersPane from './ParametersPane';
import Menu from './Menu';

const App = () => {
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
            <NetworkEditor />
          </div>

          <div className="right-pane">
            <ParametersPane />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
