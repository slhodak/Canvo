import { useState, useEffect } from "react";
import './Menu.css';
import PlusIcon from "./assets/PlusIcon";
import { SERVER_URL } from "./constants";
import { ProjectModel } from '../../shared/types/src/models/project';
import { UserModel } from '../../shared/types/src/models/user';
import HowTo from './HowTo';
import ProjectListItem from './ProjectListItem';

interface MenuProps {
  user: UserModel;
  project: ProjectModel | null;
  setProject: (project: ProjectModel | null) => void;
  projects: ProjectModel[];
  fetchAllProjects: () => void;
}

const Menu = ({ user, project, setProject, projects, fetchAllProjects }: MenuProps) => {
  const [tokenBalance, setTokenBalance] = useState(0);
  const [isHowToOpen, setIsHowToOpen] = useState(false);

  const createProject = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/new_project`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status == 'success') {
        await fetchAllProjects();
        setProject(data.project);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/delete_project/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status == 'success') {
        await fetchAllProjects();
        // If you deleted the current group, set the group to null
        if (project?.projectId == projectId) {
          setProject(null);
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }

  const handleLogout = async () => {
    try {
      // Call our backend logout endpoint
      await fetch(`${SERVER_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      // Reload the page to return to login
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    const fetchTokenBalance = async () => {
      const response = await fetch(`${SERVER_URL}/token/get_balance`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status == 'success') {
        setTokenBalance(data.tokenBalance);
      }
    }
    fetchTokenBalance();
  }, []);

  return (
    <div className="menu-container">
      <div className="menu-header-container">
        <h2 className="app-title-header">Canvo</h2>
        <button
          className="help-button"
          onClick={() => setIsHowToOpen(true)}
          title="Show Help"
        >
          ?
        </button>
      </div>
      <div className="menu-body-container">
        <div className="menu-projects-container">
          <div className="menu-projects-header">
            <h3>Projects</h3>
            <button className="add-project-button" onClick={createProject}>
              <PlusIcon />
            </button>
          </div>
          <div className="menu-items-projects">
            {projects.map((_project) => {
              const highlighted = _project.projectId === project?.projectId;
              return (
                <ProjectListItem key={_project.projectId} highlighted={highlighted} project={_project} deleteProject={deleteProject} setProject={setProject} />
              )
            })}
          </div>
        </div>
        <div className="menu-user">
          <p className="menu-user-info">User: <span className="menu-user-email">{user.email}</span></p>
          <div className="menu-user-tokens-container">
            <p className="menu-user-info">Balance: <span className="menu-user-tokens">{tokenBalance} tokens</span></p>
          </div>
          <button className="logout-button" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      <HowTo isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} />
    </div>
  )
}

export default Menu;
