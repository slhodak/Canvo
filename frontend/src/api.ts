import { BaseNode } from '../../shared/types/src/models/node';
import { SERVER_URL } from './constants';

export default class NodesAPI {
  static async updateNode(projectId: string, node: BaseNode) {
    try {
      const response = await fetch(`${SERVER_URL}/api/update_node`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          node,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.node;
      } else {
        console.error('Server error while updating node:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Could not update node:', error);
      return null;
    }
  };
}
