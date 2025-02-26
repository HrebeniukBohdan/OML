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
  constructor(public name: string, public type: string, public value: ASTNode | null) {
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
      this.nameOrObjectPath = nameOrObjectPath; // Ліва частина: може бути або IdentifierNode, або ObjectAccessNode
      this.value = value; // Права частина: вираз для присвоєння
  }

  accept(visitor: ASTVisitor): any {
      return visitor.visitAssignmentNode(this);
  }
}

export class BinaryExpressionNode extends ASTNode {
  constructor(public left: ASTNode, public operator: string, public right: ASTNode) {
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

// AST Node для об'єктних літералів
export class ObjectLiteralNode extends ASTNode {
  properties: { [key: string]: ASTNode };

  constructor(properties: { [key: string]: ASTNode }) {
    super();
    this.properties = properties;
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitObjectLiteralNode(this);
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

// Вузол для доступу до властивості об'єкта
export class ObjectAccessNode extends ASTNode {
  public object: ASTNode;   // Це може бути або змінна, або інший ObjectAccessNode (для вкладеного доступу)
  public property: string;  // Ім'я властивості, до якої ми отримуємо доступ

  constructor(object: ASTNode, property: string) {
    super();
    this.object = object;   // Об'єкт, до якого ми отримуємо доступ
    this.property = property; // Властивість об'єкта
  }

  accept(visitor: ASTVisitor): any {
    return visitor.visitObjectAccessNode(this);
  }
}

export class FunctionDeclarationNode extends ASTNode {
  constructor(
    public name: string,
    public parameters: { name: string, type: string }[], // Зберігаємо типи параметрів
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
      public condition: ASTNode,      // Умова розгалуження
      public trueBranch: ASTNode[],   // Гілка для істинної умови
      public falseBranch: ASTNode[]   // Гілка для хибної умови (else)
  ) {
      super();
  }

  accept(visitor: ASTVisitor) {
      return visitor.visitBranchingNode(this);
  }
}

export class LoopNode extends ASTNode {
  constructor(
      public condition: ASTNode,  // Умова циклу
      public body: ASTNode[]      // Тіло циклу
  ) {
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
  visitObjectAccessNode(node: ObjectAccessNode): any;
  visitOutputNode(node: OutputNode): any;
  visitUnaryExpressionNode(node: UnaryExpressionNode): any;
  visitReturnNode(node: ReturnNode): any;
}

function abs(x: number): number {
  if (x >= 0) {
    return x;
  } else {
    return -x;
  }
}
function sqrt(num: number): number {
  if (num < 0) {
    return NaN;
  }
  let approx: number;
  approx = num;
  let betterApprox: number;
  betterApprox = approx + num / approx / 2;
  while (abs(approx - betterApprox) > 1e-8) {
    approx = betterApprox;
    betterApprox = approx + num / approx / 2;
  }
  return betterApprox;
}
function solveQuadratic(a: number, b: number, c: number): void {
  let discriminant: number;
  let x1: number;
  let x2: number;
  discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    console.log('No real solutions');
  }
  if (discriminant == 0) {
    x1 = (-b / 2) * a;
    console.log('One solution: ');
    console.log(x1);
  }
  if (discriminant > 0) {
    x1 = -b + (sqrt(discriminant) / 2) * a;
    x2 = -b - (sqrt(discriminant) / 2) * a;
    console.log('Two solutions: ');
    console.log(x1);
    console.log(x2);
  }
}
//solveQuadratic(1, 7, -8);