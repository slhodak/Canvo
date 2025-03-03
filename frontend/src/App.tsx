import { useState, useEffect } from 'react';
import './App.css';
import Menu from './Menu';
import Project from './Project';
import { ProjectModel } from '../../shared/types/src/models/project';
import { UserModel } from '../../shared/types/src/models/user';
import { SERVER_URL } from './constants';

interface AppProps {
  user: UserModel;
}

const App = ({ user }: AppProps) => {
  const [project, setProject] = useState<ProjectModel | null>(null);
  const [projects, setProjects] = useState<ProjectModel[]>([]);

  const fetchAllProjects = async () => {
    const response = await fetch(`${SERVER_URL}/api/get_all_projects`, {
      credentials: 'include',
    });
    const data = await response.json();
    setProjects(data.projects);
  }

  // Update the project title on the server and in the projects list
  const handleProjectTitleChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<boolean> => {
    if (!project) return false;

    const newTitle = event.target.value;
    try {
      const response = await fetch(`${SERVER_URL}/api/update_project_title`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: project.projectId, title: newTitle }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        // Update the project in the projects list
        setProjects(prev => prev.map(p =>
          p.projectId === project.projectId
            ? { ...p, title: newTitle }
            : p
        ));
        return true;
      } else {
        console.error('Error updating project title:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating project title:', error);
      return false;
    }
  }

  //////////////////////////////
  // React Hooks
  //////////////////////////////

  useEffect(() => {
    fetchAllProjects();
  }, []);

  //////////////////////////////
  // UI Rendering
  //////////////////////////////

  return (
    <div className="app-container">
      <div className="left-section">
        <Menu user={user} project={project} setProject={setProject} projects={projects} fetchAllProjects={fetchAllProjects} />
      </div>
      <div className="right-section">
        {project
          ? <Project user={user} project={project} handleProjectTitleChange={handleProjectTitleChange} />
          : <div className="app-no-project-notice">No project selected</div>}
      </div>
    </div>
  );
}

export default App;
