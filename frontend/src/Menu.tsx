import {
  // useEffect,
  useState } from "react";
import BurgerMenu from "./assets/BurgerMenu";
// import { GroupModel } from "@wb/shared-types";
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

// interface GroupPreviewProps {
//   highlighted: boolean;
//   group: GroupModel;
//   deleteGroup: (groupId: string) => void;
//   setGroup: (group: GroupModel) => void;
// }

// const GroupPreview = ({ highlighted, group, deleteGroup, setGroup }: GroupPreviewProps) => {
//   return (
//     <div
//       role="button"
//       tabIndex={0}
//       className={`group-preview-container ${highlighted ? 'highlighted-group-preview' : ''}`}
//       onClick={() => setGroup(group)}
//     >
//       <span>{group.label.length > 0 ? group.label : 'untitled'}</span>
//       <button
//         className="group-preview-delete-button"
//         onClick={(e) => {
//           e.stopPropagation();
//           deleteGroup(group._id);
//         }}
//       >
//         <svg className="delete-group-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
//           <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z" />
//         </svg>
//       </button>
//     </div>
//   );
// }
