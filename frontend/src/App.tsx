import { useState, useEffect } from 'react';
import './App.css'
import { SERVER_URL } from './constants';
import { UserModel, GroupModel } from '@wb/shared-types';
import { Group, GroupPreview } from './Group';

const App = () => {
  const [user, setUser] = useState<UserModel | null>(null);
  const [group, setGroup] = useState<GroupModel | null>(null);
  const [groups, setGroups] = useState<GroupModel[]>([]);

  //////////////////////////////
  // Functions
  //////////////////////////////

  const createGroup = async () => {
    if (!user) {
      console.error('No user found. Cannot create group.');
      return;
    }

    try {
      await fetch(`${SERVER_URL}/api/new_group`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user._id })
      });
    } catch (error) {
      console.error('Error creating group:', error);
    }
  }

  //////////////////////////////
  // useEffect Hooks
  //////////////////////////////

  useEffect(() => {
    async function fetchAllGroups() {
      const response = await fetch(`${SERVER_URL}/api/get_all_groups`, {
        credentials: 'include',
      });
      const data = await response.json();
      setGroups(data.groups);
    }

    fetchAllGroups();
  }, []);

  // Fetch the latest group
  useEffect(() => {
    async function fetchLatestGroup() {
      const response = await fetch(`${SERVER_URL}/api/get_latest_group`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status != 'success') {
        console.error('Error fetching latest group:', data.error);
      }
    }

    fetchLatestGroup();
  }, []);

  // Fetch the user data
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`${SERVER_URL}/api/get_user`, {
          credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setUser(data.user);
      } else {
        console.error('Error fetching user:', data.error);
      }
    } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    fetchUser();
  }, []);

  return (
    <div>
      <div className="top-section">
        {group ? <Group group={group} /> : <div>No group selected</div>}
      </div>

      <div className="bottom-section">
        <button className="add-group-button" onClick={createGroup}>New</button>
        <div className="group-previews-container">
          {groups.map((group) => (
            <button key={group._id} onClick={() => setGroup(group)}>
              <GroupPreview group={group} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
