export abstract class ASTNode {
  abstract accept(visitor: ASTVisitor): any;
}

export class ProgramNode extends ASTNode {
  constructor(public statements: ASTNode[]) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitProgramNode(this);
  }
}

export class VariableDeclarationNode extends ASTNode {
  constructor(
    public name: string,
    public type: string,
    public value: ASTNode | null
  ) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitVariableDeclarationNode(this);
  }
}

export class AssignmentNode extends ASTNode {
  public nameOrObjectPath: ASTNode;
  public value: ASTNode;

  constructor(nameOrObjectPath: ASTNode, value: ASTNode) {
    super();
    this.nameOrObjectPath = nameOrObjectPath;
    this.value = value;
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitAssignmentNode(this);
  }
}

export class BinaryExpressionNode extends ASTNode {
  constructor(
    public left: ASTNode,
    public operator: string,
    public right: ASTNode
  ) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitBinaryExpressionNode(this);
  }
}

export class LiteralNode extends ASTNode {
  constructor(public value: any) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitLiteralNode(this);
  }
}

export class ObjectLiteralNode extends ASTNode {
  properties: { [key: string]: ASTNode };

  constructor(properties: { [key: string]: ASTNode }) {
    super();
    this.properties = properties;
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitObjectLiteralNode(this);
  }

  getType(structTypes: Map<string, { [key: string]: string }>): string | null {
    for (const [structName, structFields] of structTypes.entries()) {
      if (this.isMatchingStruct(structFields)) {
        return `object<${structName}>`;
      }
    }
    return null;
  }

  private isMatchingStruct(structFields: { [key: string]: string }): boolean {
    const propertyKeys = Object.keys(this.properties);
    const structKeys = Object.keys(structFields);

    if (propertyKeys.length !== structKeys.length) {
      return false;
    }

    for (const key of propertyKeys) {
      if (!structFields[key]) {
        return false;
      }
    }

    return true;
  }
}

export class IdentifierNode extends ASTNode {
  constructor(public name: string) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitIdentifierNode(this);
  }
}

export class IndexAccessNode extends ASTNode {
  constructor(public object: ASTNode, public index: ASTNode) {
    super();
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitIndexAccessNode(this);
  }
}

export class IndexAssignmentNode extends ASTNode {
  constructor(
    public object: ASTNode,
    public index: ASTNode,
    public value: ASTNode
  ) {
    super();
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitIndexAssignmentNode(this);
  }
}

export class FunctionDeclarationNode extends ASTNode {
  constructor(
    public name: string,
    public parameters: { name: string; type: string }[],
    public returnType: string,
    public body: ASTNode[]
  ) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitFunctionDeclarationNode(this);
  }
}

export class FunctionCallNode extends ASTNode {
  constructor(public name: string, public args: ASTNode[]) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitFunctionCallNode(this);
  }
}

export class BranchingNode extends ASTNode {
  constructor(
    public condition: ASTNode,
    public trueBranch: ASTNode[],
    public falseBranch: ASTNode[]
  ) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitBranchingNode(this);
  }
}

export class LoopNode extends ASTNode {
  constructor(public condition: ASTNode, public body: ASTNode[]) {
    super();
  }

  accept(visitor: ASTVisitor) {
    return visitor.visitLoopNode(this);
  }
}

export class OutputNode extends ASTNode {
  public value: ASTNode;

  constructor(value: ASTNode) {
    super();
    this.value = value;
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitOutputNode(this);
  }
}

export class UnaryExpressionNode extends ASTNode {
  public operator: string;
  public operand: ASTNode;

  constructor(operator: string, operand: ASTNode) {
    super();
    this.operator = operator;
    this.operand = operand;
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitUnaryExpressionNode(this);
  }
}

export class ReturnNode extends ASTNode {
  constructor(public returnValue: ASTNode) {
    super();
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitReturnNode(this);
  }
}

export class TypeConstructionNode extends ASTNode {
  constructor(public type: string, public values: ASTNode[]) {
    super();
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitTypeConstructionNode(this);
  }
}

export class StructTypeNode extends ASTNode {
  constructor(public name: string, public fields: { [key: string]: string }) {
    super();
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitStructTypeNode(this);
  }
}

export class PropertyAccessNode extends ASTNode {
  constructor(public object: ASTNode, public property: string, public isAssignment: boolean = false) {
    super();
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitPropertyAccessNode(this);
  }
}

export interface ASTVisitor {
  visitProgramNode(node: ProgramNode): any;
  visitVariableDeclarationNode(node: VariableDeclarationNode): any;
  visitBinaryExpressionNode(node: BinaryExpressionNode): any;
  visitFunctionDeclarationNode(node: FunctionDeclarationNode): any;
  visitFunctionCallNode(node: FunctionCallNode): any;
  visitAssignmentNode(node: AssignmentNode): any;
  visitBranchingNode(node: BranchingNode): any;
  visitLoopNode(node: LoopNode): any;
  visitLiteralNode(node: LiteralNode): any;
  visitIdentifierNode(node: IdentifierNode): any;
  visitObjectLiteralNode(node: ObjectLiteralNode): any;
  visitIndexAccessNode(node: IndexAccessNode): any;
  visitIndexAssignmentNode(node: IndexAssignmentNode): any;
  visitOutputNode(node: OutputNode): any;
  visitUnaryExpressionNode(node: UnaryExpressionNode): any;
  visitReturnNode(node: ReturnNode): any;
  visitTypeConstructionNode(node: TypeConstructionNode): any;
  visitStructTypeNode(node: StructTypeNode): any;
  visitPropertyAccessNode(node: PropertyAccessNode): any;
}
