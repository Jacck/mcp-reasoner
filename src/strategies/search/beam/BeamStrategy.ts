import { v4 as uuidv4 } from 'uuid';
import { ThoughtNode, ReasoningRequest, ReasoningResponse, DEFAULT_CONFIG } from '../../../core/types.js';
import { BaseStrategy } from '../../base/BaseStrategy.js';

export class BeamSearchStrategy extends BaseStrategy {
  private beamWidth: number;
  private beams: Map<number, ThoughtNode[]>;

  constructor(stateManager: any, beamWidth: number = DEFAULT_CONFIG.beamWidth) {
    super(stateManager);
    this.beamWidth = beamWidth;
    this.beams = new Map();
  }

  public async processThought(request: ReasoningRequest): Promise<ReasoningResponse> {
    const nodeId = uuidv4();
    const parentNode = request.parentId ? 
      await this.getNode(request.parentId) : undefined;

    const node: ThoughtNode = {
      id: nodeId,
      thought: request.thought,
      depth: request.thoughtNumber - 1,
      score: 0,
      children: [],
      parentId: request.parentId,
      isComplete: !request.nextThoughtNeeded
    };

    // Evaluate and score the node
    node.score = this.evaluateThought(node, parentNode);
    await this.saveNode(node);

    // Update parent if exists
    if (parentNode) {
      parentNode.children.push(node.id);
      await this.saveNode(parentNode);
    }

    // Manage beam at current depth
    let currentBeam = this.beams.get(node.depth) || [];
    currentBeam.push(node);
    currentBeam.sort((a, b) => b.score - a.score);
    
    // Prune beam to maintain beam width
    if (currentBeam.length > this.beamWidth) {
      currentBeam = currentBeam.slice(0, this.beamWidth);
    }
    this.beams.set(node.depth, currentBeam);

    // Calculate path statistics
    const currentPath = await this.stateManager.getPath(nodeId);
    const pathScore = currentPath.reduce((acc, n) => acc + n.score, 0) / currentPath.length;

    // Get best path score from all beams
    const bestBeamScore = Math.max(
      ...Array.from(this.beams.values())
        .flat()
        .map(n => n.score)
    );

    return {
      nodeId: node.id,
      thought: node.thought,
      score: node.score,
      depth: node.depth,
      isComplete: node.isComplete,
      nextThoughtNeeded: request.nextThoughtNeeded,
      possiblePaths: this.calculatePossiblePaths(),
      bestScore: Math.max(pathScore, bestBeamScore)
    };
  }

  private calculatePossiblePaths(): number {
    let totalPaths = 0;
    this.beams.forEach((beam, depth) => {
      const nextBeam = this.beams.get(depth + 1);
      if (nextBeam) {
        totalPaths += beam.length * nextBeam.length;
      } else {
        totalPaths += beam.length;
      }
    });
    return totalPaths;
  }

  public async getBestPath(): Promise<ThoughtNode[]> {
    // Find the deepest beam
    const maxDepth = Math.max(...Array.from(this.beams.keys()));
    const deepestBeam = this.beams.get(maxDepth) || [];
    
    if (deepestBeam.length === 0) return [];

    // Get the best scoring node from deepest beam
    const bestNode = deepestBeam.reduce((a, b) => a.score > b.score ? a : b);
    
    // Reconstruct path
    const path = await this.stateManager.getPath(bestNode.id);
    return path;
  }

  public async getMetrics(): Promise<any> {
    const baseMetrics = await super.getMetrics();
    return {
      ...baseMetrics,
      beamWidth: this.beamWidth,
      activeBeams: this.beams.size,
      totalBeamNodes: Array.from(this.beams.values()).flat().length
    };
  }

  public async clear(): Promise<void> {
    await super.clear();
    this.beams.clear();
  }
}
