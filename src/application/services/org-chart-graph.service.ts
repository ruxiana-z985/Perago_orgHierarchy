import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PositionStatus } from '../../domain/org-chart.enums';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';

export interface PositionTreeNode {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  path: string;
  depth: number;
  children: PositionTreeNode[];
}

@Injectable()
export class OrgChartGraphService {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
  ) {}

  async getActivePositions(): Promise<PositionEntity[]> {
    return this.positionsRepository.find({
      where: { status: PositionStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }

  async findActivePositionOrFail(id: string): Promise<PositionEntity> {
    const position = await this.positionsRepository.findOne({
      where: { id, status: PositionStatus.ACTIVE },
    });

    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    return position;
  }

  collectDescendantIds(rootId: string, positions: PositionEntity[]): Set<string> {
    const childrenByParent = this.groupByParent(positions);
    const descendants = new Set<string>();
    const stack = [...(childrenByParent.get(rootId) ?? [])];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || descendants.has(current.id)) {
        continue;
      }

      descendants.add(current.id);
      stack.push(...(childrenByParent.get(current.id) ?? []));
    }

    return descendants;
  }

  countDescendants(rootId: string, positions: PositionEntity[]): number {
    return this.collectDescendantIds(rootId, positions).size;
  }

  buildTree(
    positions: PositionEntity[],
    rootId?: string,
    maxDepth?: number,
  ): {
    data: PositionTreeNode[];
    meta: { totalNodes: number; maxDepth: number };
  } {
    const nodeMap = new Map<string, PositionTreeNode>();
    const roots: PositionTreeNode[] = [];

    positions.forEach((position) => {
      nodeMap.set(position.id, {
        id: position.id,
        name: position.name,
        description: position.description,
        parentId: position.parentId,
        path: position.path,
        depth: position.depth,
        children: [],
      });
    });

    positions.forEach((position) => {
      const node = nodeMap.get(position.id);
      if (!node) {
        return;
      }

      const parent = position.parentId ? nodeMap.get(position.parentId) : null;
      if (!parent) {
        roots.push(node);
        return;
      }

      parent.children.push(node);
    });

    const sortNodes = (nodes: PositionTreeNode[]) => {
      nodes.sort((left, right) => left.name.localeCompare(right.name));
      nodes.forEach((node) => sortNodes(node.children));
    };
    sortNodes(roots);

    let treeRoots = roots;
    if (rootId) {
      treeRoots = roots.filter((root) => root.id === rootId);
    }

    const pruned =
      maxDepth === undefined
        ? treeRoots
        : treeRoots.map((node) => this.prune(node, maxDepth));

    return {
      data: pruned,
      meta: {
        totalNodes: this.countNodes(pruned),
        maxDepth: this.maxDepth(pruned),
      },
    };
  }

  async rebuildPaths(manager?: EntityManager): Promise<void> {
    const repository = manager
      ? manager.getRepository(PositionEntity)
      : this.positionsRepository;
    const activePositions = await repository.find({
      where: { status: PositionStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });

    const childrenByParent = this.groupByParent(activePositions);
    const updates: PositionEntity[] = [];
    const roots = (childrenByParent.get(null) ?? []).sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    const visit = (
      position: PositionEntity,
      parentPath: string | null,
      depth: number,
    ) => {
      position.path = parentPath ? `${parentPath} > ${position.name}` : position.name;
      position.depth = depth;
      updates.push(position);
      const children = (childrenByParent.get(position.id) ?? []).sort((left, right) =>
        left.name.localeCompare(right.name),
      );
      children.forEach((child) => visit(child, position.path, depth + 1));
    };

    roots.forEach((root) => visit(root, null, 0));

    if (updates.length > 0) {
      await repository.save(updates);
    }
  }

  async getSubtreeDepth(positionId: string): Promise<number> {
    const positions = await this.getActivePositions();
    const root = positions.find((position) => position.id === positionId);
    if (!root) {
      throw new NotFoundException('Position not found.');
    }

    const childrenByParent = this.groupByParent(positions);
    let maxOffset = 0;
    const stack = [{ id: root.id, offset: 0 }];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }

      maxOffset = Math.max(maxOffset, current.offset);
      (childrenByParent.get(current.id) ?? []).forEach((child) =>
        stack.push({ id: child.id, offset: current.offset + 1 }),
      );
    }

    return maxOffset;
  }

  private groupByParent(positions: PositionEntity[]) {
    const childrenByParent = new Map<string | null, PositionEntity[]>();

    positions.forEach((position) => {
      const key = position.parentId ?? null;
      const siblings = childrenByParent.get(key) ?? [];
      siblings.push(position);
      childrenByParent.set(key, siblings);
    });

    return childrenByParent;
  }

  private prune(node: PositionTreeNode, maxDepth: number): PositionTreeNode {
    if (node.depth >= maxDepth) {
      return { ...node, children: [] };
    }

    return {
      ...node,
      children: node.children.map((child) => this.prune(child, maxDepth)),
    };
  }

  private countNodes(nodes: PositionTreeNode[]): number {
    return nodes.reduce(
      (total, node) => total + 1 + this.countNodes(node.children),
      0,
    );
  }

  private maxDepth(nodes: PositionTreeNode[]): number {
    return nodes.reduce((maxDepth, node) => {
      return Math.max(maxDepth, node.depth, this.maxDepth(node.children));
    }, 0);
  }
}
