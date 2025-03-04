import { BaseNode } from '../models/node';
import { ProjectModel } from '../models/project';
import { UserModel } from '../models/user';
import { SERVER_URL } from './constants';

export async function updateNode(node: BaseNode): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/api/update_node`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: node.projectId,
        node,
      }),
    });
    const data = await response.json();
    if (data.status === 'success') {
      return true;
    } else {
      console.error('Server error while updating node:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Could not update node:', error);
    return false;
  }
}

export async function updateProjectTitle(projectId: string, title: string): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/api/update_project_title`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId: projectId, title: title }),
    });
    const data = await response.json();
    if (data.status === 'success') {
      return true;
    } else {
      console.error('Error updating project title:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Error updating project title:', error);
    return false;
  }
};

export async function getAllProjects(): Promise<ProjectModel[]> {
  const response = await fetch(`${SERVER_URL}/api/get_all_projects`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.projects;
};

export async function checkAuthentication(): Promise<boolean> {
  const response = await fetch(`${SERVER_URL}/auth/check`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.status === 'success';
};

export async function getUser(): Promise<UserModel | null> {
  const response = await fetch(`${SERVER_URL}/api/get_user`, {
    credentials: 'include',
  });
  const data = await response.json();
  if (data.status === 'success') {
    return data.user;
  } else {
    return null;
  }
};
