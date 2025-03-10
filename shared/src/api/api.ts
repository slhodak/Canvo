import { BaseNode } from '../models/node';
import { ProjectModel } from '../models/project';
import { UserModel } from '../models/user';

export async function syncNodeUpdate(node: BaseNode, url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/update_node`, {
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

export async function updateProjectTitle(projectId: string, title: string, url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/update_project_title`, {
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

export async function getAllProjects(url: string): Promise<ProjectModel[]> {
  const response = await fetch(`${url}/api/get_all_projects`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.projects;
};

export async function checkAuthentication(url: string): Promise<boolean> {
  const response = await fetch(`${url}/auth/check`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.status === 'success';
};

export async function getUser(url: string): Promise<UserModel | null> {
  const response = await fetch(`${url}/api/get_user`, {
    credentials: 'include',
  });
  const data = await response.json();
  if (data.status === 'success') {
    return data.user;
  } else {
    return null;
  }
};
