import { ThoughtNode } from './core/types.js';

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Refresh by removing and re-adding
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = Array.from(this.cache.keys())[0];
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    // Add new value
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

export class StateManager {
  private cache: LRUCache<string, ThoughtNode>;
  private nodes = new Map<string, ThoughtNode>();

  constructor(cacheSize: number) {
    this.cache = new LRUCache(cacheSize);
  }

  async getNode(id: string): Promise<ThoughtNode | undefined> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) return cached;

    // Check main storage
    const node = this.nodes.get(id);
    if (node) {
      this.cache.set(id, node);
      return node;
    }

    return undefined;
  }

  async saveNode(node: ThoughtNode): Promise<void> {
    this.nodes.set(node.id, node);
    this.cache.set(node.id, node);
  }

  async getChildren(nodeId: string): Promise<ThoughtNode[]> {
    const node = await this.getNode(nodeId);
    if (!node) return [];

    const children = await Promise.all(
      node.children.map(id => this.getNode(id))
    );

    return children.filter((n): n is ThoughtNode => n !== undefined);
  }

  async getPath(nodeId: string): Promise<ThoughtNode[]> {
    const path: ThoughtNode[] = [];
    let currentId = nodeId;

    while (currentId) {
      const node = await this.getNode(currentId);
      if (!node) break;
      
      path.unshift(node);
      currentId = node.parentId || '';
    }

    return path;
  }

  async getAllNodes(): Promise<ThoughtNode[]> {
    return Array.from(this.nodes.values());
  }

  clear(): void {
    this.nodes.clear();
    this.cache.clear();
  }
}
