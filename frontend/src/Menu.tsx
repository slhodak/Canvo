import { useState, useEffect } from "react";
import './Menu.css';
import PlusIcon from "./assets/PlusIcon";
import SettingsWindow from './SettingsWindow';
import HowTo from './HowTo';
import ProjectListItem from './ProjectListItem';
import { SERVER_URL } from "./constants";
import { ProjectModel, UserModel } from "wc-shared";
import GearIcon from "./assets/GearIcon";

interface MenuProps {
  user: UserModel;
  project: ProjectModel | null;
  setProject: (project: ProjectModel | null) => void;
  projects: ProjectModel[];
  fetchAllProjects: () => void;
}

const Menu = ({ user, project, setProject, projects, fetchAllProjects }: MenuProps) => {
  const [isHowToOpen, setIsHowToOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);

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
        <div className="menu-header-buttons-container">
          <button className="settings-button" onClick={() => setIsSettingsOpen(true)}>
            <GearIcon />
          </button>
          <button
            className="help-button"
            onClick={() => setIsHowToOpen(true)}
            title="Show Help"
          >
            ?
          </button>
        </div>
      </div>
      <div className="menu-projects-container">
        <div className="menu-projects-header">
          <h3>Projects</h3>
          <button className="add-project-button" onClick={createProject}>
            <PlusIcon color="var(--background-dark-4)" />
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
      <div className="menu-footer-container">
        <p>Token Balance: <span className="menu-footer-tokens">{tokenBalance}</span> </p>
      </div>
      <HowTo isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} />
      <SettingsWindow user={user} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}

export default Menu;
