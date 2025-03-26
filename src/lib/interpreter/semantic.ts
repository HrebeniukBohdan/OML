import {
  ASTNode,
  ASTVisitor,
  AssignmentNode,
  BinaryExpressionNode,
  BranchingNode,
  FunctionCallNode,
  FunctionDeclarationNode,
  IdentifierNode,
  IndexAccessNode,
  IndexAssignmentNode,
  LiteralNode,
  LoopNode,
  ObjectLiteralNode,
  OutputNode,
  ProgramNode,
  PropertyAccessNode,
  ReturnNode,
  StructTypeNode,
  TypeConstructionNode,
  UnaryExpressionNode,
  VariableDeclarationNode,
} from './ast';

export class SymbolTable {
  private symbols: Map<string, string> = new Map();
  enclosingScope: SymbolTable | null;

  constructor(enclosingScope: SymbolTable | null = null) {
    this.enclosingScope = enclosingScope;
  }

  public declareVariable(name: string, type: string): void {
    if (this.symbols.has(name)) {
      throw new Error(`Variable "${name}" is already declared in this scope.`);
    }
    this.symbols.set(name, type);
  }

  public lookupVariable(name: string): string | null {
    if (this.symbols.has(name)) {
      return this.symbols.get(name);
    }
    if (this.enclosingScope) {
      return this.enclosingScope.lookupVariable(name);
    }
    return null;
  }

  public isDeclaredInCurrentScope(name: string): boolean {
    return this.symbols.has(name);
  }
}

export class SemanticAnalyzer implements ASTVisitor {
  private currentScope: SymbolTable = new SymbolTable();
  private functions: Map<string, FunctionDeclarationNode> = new Map();
  private currentFunctionReturnType: string | null = null;
  private structTypes: Map<string, { [key: string]: string }> = new Map();

  private enterScope(): void {
    this.currentScope = new SymbolTable(this.currentScope);
  }

  private exitScope(): void {
    if (this.currentScope.enclosingScope) {
      this.currentScope = this.currentScope.enclosingScope;
    } else {
      throw new Error('No enclosing scope to exit to.');
    }
  }

  private declareVariable(name: string, type: string): void {
    this.currentScope.declareVariable(name, type);
  }

  private lookupVariable(name: string): string | null {
    return this.currentScope.lookupVariable(name);
  }

  visitProgramNode(node: ProgramNode): void {
    for (const statement of node.statements) {
      statement.accept(this);
    }
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): void {
    if (this.currentScope.isDeclaredInCurrentScope(node.name)) {
      throw new Error(`Variable '${node.name}' is already declared.`);
    }
    this.declareVariable(node.name, node.type);

    if (node.value) {
      const valueType = node.value.accept(this);
      if (valueType !== node.type) {
        throw new Error(
          `Type mismatch: expected '${node.type}', got '${valueType}' in variable '${node.name}'.`
        );
      }
    }
  }

  visitAssignmentNode(node: AssignmentNode): void {
    if (node.nameOrObjectPath instanceof IdentifierNode) {
      const varName = node.nameOrObjectPath.name;
      const expectedType = this.lookupVariable(varName);
      if (!expectedType) {
        throw new Error(`Undeclared variable '${varName}'.`);
      }
      const valueType = node.value.accept(this);
      if (valueType !== expectedType) {
        throw new Error(
          `Type mismatch: expected '${expectedType}', got '${valueType}' in assignment to '${varName}'.`
        );
      }
    } else if (node.nameOrObjectPath instanceof PropertyAccessNode) {
      const propertyType = node.nameOrObjectPath.accept(this);
      const valueType = node.value.accept(this);
      if (propertyType !== valueType) {
        throw new Error(
          `Type mismatch: expected '${propertyType}', got '${valueType}' in assignment to property '${node.nameOrObjectPath.property}'.`
        );
      }
    } else {
      throw new Error(`Unsupported assignment target.`);
    }
  }

  visitFunctionDeclarationNode(node: FunctionDeclarationNode): void {
    if (this.functions.has(node.name)) {
      throw new Error(`Function '${node.name}' is already declared.`);
    }
    this.functions.set(node.name, node);
    this.currentFunctionReturnType = node.returnType;

    this.enterScope();

    node.parameters.forEach((param) => {
      this.declareVariable(param.name, param.type);
    });

    for (const statement of node.body) {
      statement.accept(this);
    }

    if (
      this.currentFunctionReturnType !== 'void' &&
      !this.hasReturnStatement(node.body)
    ) {
      throw new Error(`Missing return statement in function '${node.name}'.`);
    }

    this.exitScope();
    this.currentFunctionReturnType = null;
  }

  private hasReturnStatement(statements: ASTNode[]): boolean {
    for (const statement of statements) {
      if (statement instanceof ReturnNode) {
        return true;
      } else if (statement instanceof BranchingNode) {
        if (
          this.hasReturnStatement(statement.trueBranch) ||
          this.hasReturnStatement(statement.falseBranch)
        ) {
          return true;
        }
      } else if (statement instanceof LoopNode) {
        if (this.hasReturnStatement(statement.body)) {
          return true;
        }
      }
    }
    return false;
  }

  visitFunctionCallNode(node: FunctionCallNode): string {
    const func = this.functions.get(node.name);
    if (!func) {
      throw new Error(`Function '${node.name}' is not declared.`);
    }

    if (node.args.length !== func.parameters.length) {
      throw new Error(
        `Function '${node.name}' expects ${func.parameters.length} arguments, but got ${node.args.length}.`
      );
    }

    node.args.forEach((arg, i) => {
      const argType = arg.accept(this);
      const paramType = func.parameters[i].type;
      if (argType !== paramType) {
        throw new Error(
          `Type mismatch in function call to '${node.name}': expected '${paramType}', got '${argType}'.`
        );
      }
    });

    return func.returnType;
  }

  visitBinaryExpressionNode(node: BinaryExpressionNode): string {
    const leftType = node.left.accept(this);
    const rightType = node.right.accept(this);

    if (node.operator === '.') {
      if (
        ['string', 'number', 'bool'].includes(leftType) &&
        ['string', 'number', 'bool'].includes(rightType)
      ) {
        return 'string';
      } else {
        throw new Error(
          `Invalid types for concatenation: '${leftType}' and '${rightType}'.`
        );
      }
    }

    if (leftType !== rightType) {
      throw new Error(
        `Type mismatch in binary expression: left is '${leftType}', right is '${rightType}'.`
      );
    }

    if (['+', '-', '*', '/'].includes(node.operator)) {
      if (leftType !== 'number') {
        throw new Error(
          `Operator '${node.operator}' requires numeric operands.`
        );
      }
      return 'number';
    }

    if (['==', '!=', '<', '>', '<=', '>='].includes(node.operator)) {
      return 'bool';
    }

    if (['&&', '||'].includes(node.operator)) {
      if (leftType !== 'bool') {
        throw new Error(
          `Operator '${node.operator}' requires boolean operands.`
        );
      }
      return 'bool';
    }

    throw new Error(`Unsupported operator '${node.operator}'.`);
  }

  visitLiteralNode(node: LiteralNode): string {
    if (typeof node.value === 'boolean') {
      return 'bool';
    }
    if (typeof node.value === 'number') {
      return 'number';
    }
    if (typeof node.value === 'string') {
      return 'string';
    }
    return typeof node.value;
  }

  visitTypeConstructionNode(node: TypeConstructionNode): string {
    const type = node.type;
    const values = node.values.map(value => value.accept(this));

    if (type.startsWith('array<')) {
      const elementType = type.slice(6, -1);
      if (values.length === 1) {
        if (values[0] !== 'number') {
          throw new Error(`Array size must be of type 'number', but got '${values[0]}'.`);
        }
        return type;
      } else {
        for (const value of values) {
          if (value !== elementType) {
            throw new Error(`Array elements must be of type '${elementType}', but got '${value}'.`);
          }
        }
        return type;
      }
    }

    if (type === 'string') {
      if (values.length !== 1) {
        throw new Error(`String constructor expects one argument, but got ${values.length}.`);
      }
      if (values[0] !== 'number' && values[0] !== 'string') {
        throw new Error(
          `String constructor expects a number or string argument, but got ${values[0]}.`
        );
      }
      return 'string';
    }

    throw new Error(`Unsupported type construction: ${type}`);
  }

  visitIdentifierNode(node: IdentifierNode): string {
    const variableType = this.lookupVariable(node.name);
    if (!variableType) {
      throw new Error(`Undeclared variable '${node.name}'.`);
    }
    return variableType;
  }

  visitUnaryExpressionNode(node: UnaryExpressionNode): string {
    const operandType = node.operand.accept(this);
    if (node.operator === '-' && operandType === 'number') {
      return 'number';
    }
    if (node.operator === '!' && operandType === 'bool') {
      return 'bool';
    }
    throw new Error(
      `Unsupported unary operator '${node.operator}' for type '${operandType}'.`
    );
  }

  visitReturnNode(node: ReturnNode): void {
    const returnType = node.returnValue.accept(this);
    if (returnType !== this.currentFunctionReturnType) {
      throw new Error(
        `Return type mismatch: expected '${this.currentFunctionReturnType}', got '${returnType}'.`
      );
    }
  }

  visitObjectLiteralNode(node: ObjectLiteralNode): string {
    const objType = node.getType(this.structTypes);
    if (!objType) {
      throw new Error(`Object literal does not match any declared struct type.`);
    }

    const structFields = this.structTypes.get(objType.slice(7, -1))!;
    for (const [key, valueNode] of Object.entries(node.properties)) {
      const expectedType = structFields[key];
      const valueType = valueNode.accept(this);

      if (expectedType !== valueType) {
        throw new Error(`Type mismatch for property '${key}': expected '${expectedType}', got '${valueType}'.`);
      }
    }

    return objType;
  }

  visitBranchingNode(node: BranchingNode): void {
    const conditionType = node.condition.accept(this);
    if (conditionType !== 'bool') {
      throw new Error(
        `Condition in branching must be of type 'bool', but got '${conditionType}'.`
      );
    }

    this.enterScope();
    node.trueBranch.forEach((stmt) => stmt.accept(this));
    this.exitScope();

    if (node.falseBranch.length > 0) {
      this.enterScope();
      node.falseBranch.forEach((stmt) => stmt.accept(this));
      this.exitScope();
    }
  }

  visitLoopNode(node: LoopNode): void {
    const conditionType = node.condition.accept(this);
    if (conditionType !== 'bool') {
      throw new Error(
        `Condition in loop must be of type 'bool', but got '${conditionType}'.`
      );
    }

    this.enterScope();
    node.body.forEach((stmt) => stmt.accept(this));
    this.exitScope();
  }

  visitOutputNode(node: OutputNode): void {
    node.value.accept(this);
  }

  visitIndexAccessNode(node: IndexAccessNode): void {
    const objectType = node.object.accept(this);
    const indexType = node.index.accept(this);

    if (objectType === 'string') {
      if (indexType !== 'number') {
        throw new Error(
          `Index for string must be of type 'number', but got '${indexType}'.`
        );
      }
      return;
    }
    if (objectType.startsWith('array<')) {
      if (indexType !== 'number') {
        throw new Error(
          `Index for array must be of type 'number', but got '${indexType}'.`
        );
      }
      return;
    }

    throw new Error(`Unsupported index access on type '${objectType}'.`);
  }

  visitIndexAssignmentNode(node: IndexAssignmentNode): void {
    const objectType = node.object.accept(this);
    const indexType = node.index.accept(this);
    const valueType = node.value.accept(this);

    if (objectType === 'string') {
      if (indexType !== 'number') {
        throw new Error(
          `Index for string must be of type 'number', but got '${indexType}'.`
        );
      }
      if (valueType !== 'string') {
        throw new Error(
          `Value for string assignment must be a string type, but got '${valueType}'.`
        );
      }
      if (
        node.value instanceof LiteralNode &&
        typeof node.value.value === 'string'
      ) {
        if (node.value.value.length !== 1) {
          throw new Error(
            `Value for string assignment must be a single character, but got '${node.value.value}'.`
          );
        }
      }
      return;
    }
    if (objectType.startsWith('array<')) {
      if (indexType !== 'number') {
        throw new Error(
          `Index for array must be of type 'number', but got '${indexType}'.`
        );
      }
      return;
    }

    throw new Error(`Unsupported index assignment on type '${objectType}'.`);
  }

  visitStructTypeNode(node: StructTypeNode): void {
    if (this.structTypes.has(node.name)) {
      throw new Error(`Struct type '${node.name}' is already declared.`);
    }
    this.structTypes.set(node.name, node.fields);
  }

  visitPropertyAccessNode(node: PropertyAccessNode): string {
    const objectType = node.object.accept(this);

    if (objectType === 'string' && node.property === 'length') {
      if (node.isAssignment) {
        throw new Error(`Cannot assign to read-only property 'length' of type 'string'.`);
      }
      return 'number';
    }

    if (objectType.startsWith('array<') && node.property === 'length') {
      if (node.isAssignment) {
        throw new Error(`Cannot assign to read-only property 'length' of type 'array'.`);
      }
      return 'number';
    }

    if (objectType.startsWith('object<')) {
      const structTypeName = objectType.slice(7, -1);
      const structType = this.structTypes.get(structTypeName);
      if (!structType) {
        throw new Error(`Struct type '${structTypeName}' is not declared.`);
      }
      const propertyType = structType[node.property];
      if (!propertyType) {
        throw new Error(`Property '${node.property}' does not exist on type '${objectType}'.`);
      }
      return propertyType;
    }

    if (node.object instanceof PropertyAccessNode) {
      return this.visitPropertyAccessNode(node.object);
    }

    throw new Error(`Unsupported property access on type '${objectType}'.`);
  }
}
