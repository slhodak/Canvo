import { useState, useEffect } from 'react';
import './App.css';
import Menu from './Menu';
import Project from './Project';
import { ProjectModel, UserModel } from 'wc-shared';
import { getAllProjects, updateProjectTitle } from 'wc-shared';
import { SERVER_URL } from './constants';

interface AppProps {
  user: UserModel;
}

const App = ({ user }: AppProps) => {
  const [project, setProject] = useState<ProjectModel | null>(null);
  const [projects, setProjects] = useState<ProjectModel[]>([]);

  const fetchAllProjects = async () => {
    const projects = await getAllProjects(SERVER_URL);
    setProjects(projects);
  }

  // Update the project title on the server and in the projects list
  const handleProjectTitleChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<boolean> => {
    if (!project) return false;

    const newTitle = event.target.value;
    const success = await updateProjectTitle(project.projectId, newTitle, SERVER_URL);
    if (success) {
      // Update the project in the projects list
      setProjects(prev => prev.map(p =>
        p.projectId === project.projectId
          ? { ...p, title: newTitle }
          : p
      ));
    }
    return success;
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
