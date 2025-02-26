import './App.css'
import Menu from './Menu';
import { useState, useEffect } from 'react';
import { ProjectModel } from '../../shared/types/src/models/project';
import { SERVER_URL } from './constants';
import Project from './Project';
import { UserModel } from '../../shared/types/src/models/user';

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
          : <div>No project selected</div>}
      </div>
    </div>
  );
}

export default App;


// TODO: The frontend is responsible for handling cascading,
// and it only sends requests to the backend to handle prompt querying
// Use this cascading logic but adapt it to be run by the frontend
// ... or actually don't because I think the frontend already does descendent node running
// In any case I wasn't ready to delete this code yet

// const errors: string[] = [];
// let outputs: number = 0;
// // Transformation cascading: running a transformation will run all of its (unlocked) child transformations
// // This is done iteratively insted of recursively in order to collect errors and the total count of outputs
// try {
//   const queue = [node];
//   while (queue.length > 0) {
//     const node = queue.shift();
//     if (!node) {
//       break;
//     }

//     const block = await db.getBlock(transformation.input_block_id, user._id);
//     if (!block) {
//       errors.push(`Block not found for transformation: ${transformation.input_block_id}`);
//       continue;
//     }

//     if (block.locked || transformation.locked) {
//       continue;
//     }

//     // Run the transformation and store the results
//     const transformationResult: TransformationResult = await runTransformation(transformation, user._id);
//     outputs += transformationResult.outputs;
//     errors.push(...transformationResult.errors);
//     queue.push(...transformationResult.childTransformations);
//   }

//   await db.updateGroupUpdatedAt(groupId);

//   return res.json({ status: "success", outputs, errors });

// } catch (error) {
//   if (error instanceof Error) {
//     return res.status(500).json({ status: "failed", error: error.message });
//   } else {
//     return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
//   }
// }
