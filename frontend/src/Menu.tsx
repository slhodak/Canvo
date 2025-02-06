import {
  // useEffect,
  useState } from "react";
import BurgerMenu from "./assets/BurgerMenu";
// import { GroupModel } from "@wc/shared-types";
// import PlusIcon from "./assets/PlusIcon";
// import { SERVER_URL } from "./constants";
import './Menu.css';

const Menu = () => {
  // const [groups, setGroups] = useState<GroupModel[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // const fetchAllGroups = async () => {
  //   const response = await fetch(`${SERVER_URL}/api/get_all_groups`, {
  //     credentials: 'include',
  //   });
  //   const data = await response.json();
  //   setGroups(data.groups);
  // }

  // const createGroup = async () => {
  //   try {
  //     const response = await fetch(`${SERVER_URL}/api/new_group`, {
  //       method: 'POST',
  //       credentials: 'include',
  //     });
  //     const data = await response.json();
  //     if (data.status == 'success') {
  //       await fetchAllGroups();
  //       setGroup(data.group);
  //     }
  //   } catch (error) {
  //     console.error('Error creating group:', error);
  //   }
  // }

  // const deleteGroup = async (groupId: string) => {
  //   try {
  //     const response = await fetch(`${SERVER_URL}/api/delete_group/${groupId}`, {
  //       method: 'DELETE',
  //       credentials: 'include',
  //     });
  //     const data = await response.json();
  //     if (data.status == 'success') {
  //       fetchAllGroups();
  //       // If you deleted the current group, set the group to null
  //       if (group?._id == groupId) {
  //         setGroup(null);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error deleting group:', error);
  //   }
  // }

  // const updateGroupLabel = async (label: string) => {
  //   try {
  //     const response = await fetch(`${SERVER_URL}/api/update_group_label`, {
  //       method: 'POST',
  //       credentials: 'include',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ groupId: group?._id, label: label }),
  //     });
  //     const data = await response.json();
  //     if (data.status == 'success') {
  //       fetchAllGroups();
  //     } else {
  //       console.error('Error updating group label:', data.error);
  //     }
  //   } catch (error) {
  //     console.error('Error updating group label:', error);
  //   }
  // }

  // useEffect(() => {
  //   fetchAllGroups();
  // }, []);

  return (
    <div className={`left-section ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className="left-section-header-container">
        <button className="collapse-button" onClick={() => setIsCollapsed(!isCollapsed)}>
          <BurgerMenu isCollapsed={isCollapsed} strokeColor={"var(--font-color)"} />
        </button>
      </div>
      {!isCollapsed && (
        <div className="menu-items-container">
          <div className="menu-items-header">
            <h3>Projects</h3>
            {/* <button className="add-group-button" onClick={createGroup}>
              <PlusIcon />
            </button> */}
          </div>
          <div className="menu-items-projects">
            {/* {groups.map((_group) => {
              const highlighted = group?._id === _group._id;
              return (
                <GroupPreview key={_group._id} highlighted={highlighted} group={_group} deleteGroup={deleteGroup} setGroup={setGroup} />
              )
            })} */}
          </div>
        </div>
      )}
    </div>
  )
}

export default Menu;