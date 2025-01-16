import { useState, useEffect } from 'react';
import './App.css'
import { SERVER_URL } from './constants';
import { GroupModel } from '@wb/shared-types';
import { Group, GroupPreview } from './Group';

const App = () => {
  const [group, setGroup] = useState<GroupModel | null>(null);
  const [groups, setGroups] = useState<GroupModel[]>([]);

  //////////////////////////////
  // Functions
  //////////////////////////////

  const fetchAllGroups = async () => {
    const response = await fetch(`${SERVER_URL}/api/get_all_groups`, {
      credentials: 'include',
    });
    const data = await response.json();
    setGroups(data.groups);
  }

  const createGroup = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/new_group`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status == 'success') {
        fetchAllGroups();
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  }

  //////////////////////////////
  // useEffect Hooks
  //////////////////////////////

  useEffect(() => {
    fetchAllGroups();
  }, []);

  // Fetch the latest group
  useEffect(() => {
    async function fetchLatestGroup() {
      const response = await fetch(`${SERVER_URL}/api/get_latest_group`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status == 'success') {
        setGroup(data.group);
      } else {
        console.error('Error fetching latest group:', data.error);
      }
    }

    fetchLatestGroup();
  }, []);

  return (
    <div className="app-container">
      <div className="top-section">
        <div className="top-header-container">
          <h2 className="app-title-header">Canvo</h2>
          <button className="add-group-button" onClick={createGroup}>New Group</button>
        </div>
        {group ? <Group group={group} /> : <div>No group selected</div>}
      </div>

      <div className="bottom-section">
        <h3>Groups</h3>
        <div className="group-previews-container">
          {groups.map((group) => (
            <button className="group-preview-container-button" key={group._id} onClick={() => setGroup(group)}>
              <GroupPreview group={group} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
