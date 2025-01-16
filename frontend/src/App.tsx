import { useState, useEffect } from 'react';
import './App.css'
import { SERVER_URL } from './constants';
import { GroupModel } from '@wb/shared-types';
import { Group } from './Group';

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

  const deleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/delete_group/${groupId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    const data = await response.json();
    if (data.status == 'success') {
      fetchAllGroups();
      }
    } catch (error) {
      console.error('Error deleting group:', error);
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
        {group ? <Group group={group} deleteGroup={deleteGroup} /> : <div>No group selected</div>}
      </div>

      <div className="bottom-section">
        <h3 className="group-previews-header">Groups</h3>
        <div className="group-previews-container">
          {groups.map((group) => (
            <GroupPreview key={group._id} group={group} deleteGroup={deleteGroup} setGroup={setGroup} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;

interface GroupPreviewProps {
  group: GroupModel;
  deleteGroup: (groupId: string) => void;
  setGroup: (group: GroupModel) => void;
}

const GroupPreview = ({ group, deleteGroup, setGroup }: GroupPreviewProps) => {
  return (
    <div role="button" tabIndex={0} className="group-preview-container" onClick={() => setGroup(group)}>
      <div className="group-preview-label">{group.label ?? 'unknown'}</div>
      <button className="group-preview-delete-button" onClick={(e) => {
        e.stopPropagation();
        deleteGroup(group._id);
      }}>
        <svg className="delete-group-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
          <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z" />
        </svg>
      </button>
    </div>
  );
}
