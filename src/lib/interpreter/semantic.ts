import {
  ASTNode,
  ASTVisitor,
  AssignmentNode,
  BinaryExpressionNode,
  BranchingNode,
  FunctionCallNode,
  FunctionDeclarationNode,
  IdentifierNode,
  LiteralNode,
  LoopNode,
  ObjectAccessNode,
  ObjectLiteralNode,
  OutputNode,
  ProgramNode,
  ReturnNode,
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

  // Перевіряє наявність змінної тільки в поточному скоупі
  public isDeclaredInCurrentScope(name: string): boolean {
    return this.symbols.has(name);
  }
}

export class SemanticAnalyzer implements ASTVisitor {
  private currentScope: SymbolTable = new SymbolTable();
  private functions: Map<string, FunctionDeclarationNode> = new Map(); // Таблиця функцій
  private currentFunctionReturnType: string | null = null; // Для перевірки типу повернення функції

  private enterScope(): void {
    this.currentScope = new SymbolTable(this.currentScope); // Створюємо новий вкладений скоуп
  }

  private exitScope(): void {
    if (this.currentScope.enclosingScope) {
      this.currentScope = this.currentScope.enclosingScope; // Повертаємось до зовнішнього скоупу
    } else {
      throw new Error("No enclosing scope to exit to.");
    }
  }

  private declareVariable(name: string, type: string): void {
    this.currentScope.declareVariable(name, type); // Оголошуємо змінну у поточному скоупі
  }

  private lookupVariable(name: string): string | null {
    return this.currentScope.lookupVariable(name); // Шукаємо змінну у поточному скоупі і в усіх зовнішніх
  }

  visitProgramNode(node: ProgramNode): void {
    for (const statement of node.statements) {
      statement.accept(this);
    }
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): void {
    // Перевіряємо наявність змінної тільки в поточному скоупі
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
    const varName = (node.nameOrObjectPath as IdentifierNode).name;
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
  }

  visitFunctionDeclarationNode(node: FunctionDeclarationNode): void {
    if (this.functions.has(node.name)) {
        throw new Error(`Function '${node.name}' is already declared.`);
    }
    this.functions.set(node.name, node);
    this.currentFunctionReturnType = node.returnType;

    this.enterScope();

    // Оголошуємо параметри у функціональному скоупі
    node.parameters.forEach(param => {
        this.declareVariable(param.name, param.type);
    });

    // Перевірка всіх операторів у тілі функції
    for (const statement of node.body) {
        statement.accept(this);
    }

    // Використовуємо метод для перевірки наявності return
    if (this.currentFunctionReturnType !== 'void' && !this.hasReturnStatement(node.body)) {
        throw new Error(`Missing return statement in function '${node.name}'.`);
    }

    this.exitScope();
    this.currentFunctionReturnType = null;
  }

  // Метод для рекурсивної перевірки наявності ReturnNode
  private hasReturnStatement(statements: ASTNode[]): boolean {
      for (const statement of statements) {
          if (statement instanceof ReturnNode) {
              return true;
          } else if (statement instanceof BranchingNode) {
              // Перевіряємо true і false гілки розгалуження
              if (this.hasReturnStatement(statement.trueBranch) || this.hasReturnStatement(statement.falseBranch)) {
                  return true;
              }
          } else if (statement instanceof LoopNode) {
              // Перевірка тіла циклу
              if (this.hasReturnStatement(statement.body)) {
                  return true;
              }
          }
      }
      return false;
  }

  /*
  visitFunctionDeclarationNode(node: FunctionDeclarationNode): void {
    if (this.functions.has(node.name)) {
      throw new Error(`Function '${node.name}' is already declared.`);
    }
    this.functions.set(node.name, node);
    this.currentFunctionReturnType = node.returnType;
  
    // Входимо в новий скоуп для параметрів функції та тіла
    this.enterScope();
    node.parameters.forEach((param) => {
      this.declareVariable(param.name, param.type); // Використовуємо declareVariable для параметрів
    });
  
    // Перевіряємо тіло функції
    for (const statement of node.body) {
      statement.accept(this);
    }
  
    // Виходимо з локального скоупу функції
    this.exitScope();
    this.currentFunctionReturnType = null;
  }*/  

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
      if (['string', 'number', 'bool'].includes(leftType) && ['string', 'number', 'bool'].includes(rightType)) {
          return 'string';  // Конкатенація завжди повертає рядок
      } else {
          throw new Error(`Invalid types for concatenation: '${leftType}' and '${rightType}'.`);
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
    const obj: { [key: string]: string } = {};
    for (const [key, valueNode] of Object.entries(node.properties)) {
      obj[key] = valueNode.accept(this);
    }
    return 'object';
  }

  visitObjectAccessNode(node: ObjectAccessNode): string {
    const objectType = node.object.accept(this);
    if (objectType !== 'object') {
      throw new Error(
        `Type mismatch: expected 'object' for property access, but got '${objectType}'.`
      );
    }
    return 'any';
  }

  visitBranchingNode(node: BranchingNode): void {
    const conditionType = node.condition.accept(this);
    if (conditionType !== 'bool') {
      throw new Error(
        `Condition in branching must be of type 'bool', but got '${conditionType}'.`
      );
    }

    // Входимо у вкладений скоуп для гілок розгалуження
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
    node.value.accept(this); // Перевірка типу значення, яке виводимо
  }
}

