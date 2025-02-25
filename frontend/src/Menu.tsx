import { useState, useEffect, useRef } from "react";
import './Menu.css';
import PlusIcon from "./assets/PlusIcon";
import { SERVER_URL } from "./constants";
import { ProjectModel } from '../../shared/types/src/models/project';
import { TrashIcon } from "./assets/TrashIcon";
import { UserModel } from '../../shared/types/src/models/user';
import HowTo from './HowTo';

interface MenuProps {
  user: UserModel;
  project: ProjectModel | null;
  setProject: (project: ProjectModel | null) => void;
  projects: ProjectModel[];
  fetchAllProjects: () => void;
}

const Menu = ({ user, project, setProject, projects, fetchAllProjects }: MenuProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
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
        <h2 className="app-title-header">{isCollapsed ? 'C' : 'Canvo'}</h2>
        <button
          className="help-button"
          onClick={() => setIsHowToOpen(true)}
          title="Show Help"
        >
          ?
        </button>
      </div>
      {!isCollapsed && (
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
                  <ProjectPreview key={_project.projectId} highlighted={highlighted} project={_project} deleteProject={deleteProject} setProject={setProject} />
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
      )}
      <HowTo isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} />
    </div>
  )
}

export default Menu;

interface ProjectPreviewProps {
  highlighted: boolean;
  project: ProjectModel;
  deleteProject: (projectId: string) => void;
  setProject: (project: ProjectModel) => void;
}

const ProjectPreview = ({ highlighted, project, deleteProject, setProject }: ProjectPreviewProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteButtonRect, setDeleteButtonRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowDeleteConfirm(false);
      }
    };

    if (showDeleteConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteConfirm]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`project-preview-container ${highlighted ? 'highlighted-project-preview' : ''}`}
      onClick={() => setProject(project)}
    >
      <span>{project.title.length > 0 ? project.title : 'untitled'}</span>
      <button
        className="project-preview-delete-button"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setDeleteButtonRect(rect);
          setShowDeleteConfirm(true);
        }}
      >
        <TrashIcon />
      </button>
      {showDeleteConfirm && deleteButtonRect && (
        <div
          ref={popoverRef}
          className="delete-confirm-popover"
          style={{
            top: `${deleteButtonRect.bottom + 5}px`,
            left: `${deleteButtonRect.left - 100}px`,
          }}
        >
          <p>Delete this project?</p>
          <div className="delete-confirm-actions">
            <button
              className="project-preview-confirm-button"
              onClick={(e) => {
                e.stopPropagation();
                deleteProject(project.projectId);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </button>
            <button
              className="project-preview-cancel-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
