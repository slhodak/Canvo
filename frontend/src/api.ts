import { BaseNode } from '../../shared/types/src/models/node';
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
