import { BlockModel } from '@wb/shared-types';

interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}

export default class BlockTree {
  root: TreeNode<BlockModel> | null;

  constructor() {
    this.root = null;
  }

  addNode(value: BlockModel, parentValue: BlockModel | null = null): void {
    const newNode: TreeNode<BlockModel> = { value, children: [] };

    if (this.root === null) {
      this.root = newNode;
    } else {
      const parentNode = this.findNode(this.root, parentValue);
      if (parentNode) {
        parentNode.children.push(newNode);
      } else {
        throw new Error('Parent node not found');
      }
    }
  }

  findNode(node: TreeNode<BlockModel>, value: BlockModel | null): TreeNode<BlockModel> | null {
    if (node.value === value) {
      return node;
    }

    for (const child of node.children) {
      const result = this.findNode(child, value);
      if (result) {
        return result;
      }
    }

    return null;
  }

  traverse(callback: (node: TreeNode<BlockModel>) => void): void {
    if (this.root) {
      this.traverseNode(this.root, callback);
    }
  }

  private traverseNode(node: TreeNode<BlockModel>, callback: (node: TreeNode<BlockModel>) => void): void {
    callback(node);
    for (const child of node.children) {
      this.traverseNode(child, callback);
    }
  }
}
