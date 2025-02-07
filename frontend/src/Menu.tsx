import { useState } from "react";
import './Menu.css';
import BurgerMenu from "./assets/BurgerMenu";
import PlusIcon from "./assets/PlusIcon";
import { SERVER_URL } from "./constants";
import { ProjectModel } from '../../shared/types/src/models/project';
import { TrashIcon } from "./assets/TrashIcon";

interface MenuProps {
  project: ProjectModel | null;
  setProject: (project: ProjectModel | null) => void;
  projects: ProjectModel[];
  fetchAllProjects: () => void;
}

const Menu = ({ project, setProject, projects, fetchAllProjects }: MenuProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        if (project?._id == projectId) {
          setProject(null);
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }

  return (
    <div className={`menu-container ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className="menu-header-container">
        <button className="collapse-button" onClick={() => setIsCollapsed(!isCollapsed)}>
          <BurgerMenu isCollapsed={isCollapsed} strokeColor={"var(--font-color)"} />
        </button>
        <h2 className="app-title-header">{isCollapsed ? 'C' : 'Canvo'}</h2>
      </div>
      {!isCollapsed && (
        <div className="menu-items-container">
          <div className="menu-items-header">
            <h3>Projects</h3>
            <button className="add-project-button" onClick={createProject}>
              <PlusIcon />
            </button>
          </div>
          <div className="menu-items-projects">
            {projects.map((_project) => {
              const highlighted = _project._id === project?._id;
              return (
                <ProjectPreview key={_project._id} highlighted={highlighted} project={_project} deleteProject={deleteProject} setProject={setProject} />
              )
            })}
          </div>
        </div>
      )}
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
          deleteProject(project._id);
        }}
      >
        <TrashIcon />
      </button>
    </div>
  );
}
