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

export class JSONVisitor implements ASTVisitor {
  visitProgramNode(node: ProgramNode): any {
    return {
      type: 'Program',
      statements: node.statements.map((statement) => statement.accept(this)),
    };
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): any {
    return {
      type: 'VariableDeclaration',
      name: node.name,
      varType: node.type,
      value: node.value ? node.value.accept(this) : null,
    };
  }

  visitBinaryExpressionNode(node: BinaryExpressionNode): any {
    return {
      type: node.operator === '.' ? 'Concatenation' : 'BinaryExpression',
      left: node.left.accept(this),
      operator: node.operator,
      right: node.right.accept(this),
    };
  }

  visitFunctionDeclarationNode(node: FunctionDeclarationNode): any {
    return {
      type: 'FunctionDeclaration',
      name: node.name,
      parameters: node.parameters,
      returnType: node.returnType,
      body: node.body.map((statement) => statement.accept(this)),
    };
  }

  visitFunctionCallNode(node: FunctionCallNode): any {
    return {
      type: 'FunctionCall',
      name: node.name,
      arguments: node.args.map((arg) => arg.accept(this)),
    };
  }

  visitAssignmentNode(node: AssignmentNode): any {
    return {
      type: 'Assignment',
      nameOrObjectPath: node.nameOrObjectPath.accept(this),
      value: node.value.accept(this),
    };
  }

  visitBranchingNode(node: BranchingNode): any {
    return {
      type: 'Branching',
      condition: node.condition.accept(this),
      trueBranch: node.trueBranch.map((statement) => statement.accept(this)),
      falseBranch: node.falseBranch.map((statement) => statement.accept(this)),
    };
  }

  visitLoopNode(node: LoopNode): any {
    return {
      type: 'Loop',
      condition: node.condition.accept(this),
      body: node.body.map((statement) => statement.accept(this)),
    };
  }

  visitLiteralNode(node: LiteralNode): any {
    return {
      type: 'Literal',
      value: node.value,
    };
  }

  visitObjectLiteralNode(node: ObjectLiteralNode): any {
    const result: { [key: string]: any } = {};
    for (const key in node.properties) {
      result[key] = node.properties[key].accept(this);
    }
    return result;
  }

  visitIdentifierNode(node: IdentifierNode): any {
    return {
      type: 'Identifier',
      name: node.name,
    };
  }

  visitOutputNode(node: OutputNode): any {
    return {
      type: 'Output',
      value: node.value.accept(this),
    };
  }

  visitUnaryExpressionNode(node: UnaryExpressionNode): any {
    return {
      type: 'UnaryExpression',
      operator: node.operator,
      operand: node.operand.accept(this),
    };
  }

  visitReturnNode(node: ReturnNode): any {
    return {
      type: 'Return',
      returnValue: node.returnValue.accept(this),
    };
  }

  visitIndexAccessNode(node: IndexAccessNode): any {
    return {
      type: 'IndexAccess',
      object: node.object.accept(this),
      index: node.index.accept(this),
    };
  }

  visitIndexAssignmentNode(node: IndexAssignmentNode): any {
    return {
      type: 'IndexAssignment',
      object: node.object.accept(this),
      index: node.index.accept(this),
      value: node.value.accept(this),
    };
  }

  visitTypeConstructionNode(node: TypeConstructionNode): any {
    return {
      type: 'TypeConstruction',
      typeName: node.type,
      value: node.value.accept(this),
    };
  }

  visitStructTypeNode(node: StructTypeNode): any {
    return {
      type: 'StructType',
      name: node.name,
      fields: node.fields,
    };
  }

  visitPropertyAccessNode(node: PropertyAccessNode): any {
    return {
      type: 'PropertyAccess',
      object: node.object.accept(this),
      property: node.property,
      isAssignment: node.isAssignment,
    };
  }
}

export class OMLToTypeScriptVisitor implements ASTVisitor {
  visitProgramNode(node: ProgramNode): string {
    return node.statements
      .map((statement) => statement.accept(this))
      .join('\n');
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): string {
    const type = this.mapType(node.type);
    const name = node.name;
    const value = node.value ? node.value.accept(this) : 'undefined';
    return `let ${name}: ${type} = ${value};`;
  }
  
  private mapType(type: string): string {
    if (type.startsWith('object<')) {
      return type.slice(7, -1); // Extract the object type name
    }
    const typeMapping: { [key: string]: string } = {
      number: 'number',
      string: 'string',
      bool: 'boolean',
      array: 'any[]',
      void: 'void',
    };
    return typeMapping[type] || 'any';
  }

  visitAssignmentNode(node: AssignmentNode): string {
    return `${node.nameOrObjectPath.accept(this)} = ${node.value.accept(
      this
    )};`;
  }

  private getOperatorPrecedence(operator: string): number {
    switch (operator) {
      case '||':
        return 1;
      case '&&':
        return 2;
      case '==':
      case '!=':
        return 3;
      case '<':
      case '>':
      case '<=':
      case '>=':
        return 4;
      case '+':
      case '-':
        return 5;
      case '*':
      case '/':
        return 6;
      case '.':
        return 0;
      default:
        return 0;
    }
  }

  private wrapWithParentheses(
    expression: string,
    parentPrecedence: number,
    currentPrecedence: number
  ): string {
    if (currentPrecedence < parentPrecedence) {
      return `(${expression})`;
    }
    return expression;
  }

  visitBinaryExpressionNode(
    node: BinaryExpressionNode,
    parentPrecedence: number = 0
  ): string {
    const operatorPrecedence = this.getOperatorPrecedence(node.operator);

    const left =
      node.left instanceof BinaryExpressionNode
        ? this.visitBinaryExpressionNode(node.left, operatorPrecedence)
        : node.left.accept(this);
    const right =
      node.right instanceof BinaryExpressionNode
        ? this.visitBinaryExpressionNode(node.right, operatorPrecedence)
        : node.right.accept(this);

    const operator = node.operator === '.' ? '+' : node.operator;

    return this.wrapWithParentheses(
      `${left} ${operator} ${right}`,
      parentPrecedence,
      operatorPrecedence
    );
  }

  visitLiteralNode(node: LiteralNode): string {
    return typeof node.value === 'string' ? `"${node.value}"` : `${node.value}`;
  }

  visitIdentifierNode(node: IdentifierNode): string {
    return node.name;
  }

  visitObjectLiteralNode(node: ObjectLiteralNode): string {
    const properties = Object.entries(node.properties)
      .map(([key, value]) => `${key}: ${value.accept(this)}`)
      .join(', ');
    return `{ ${properties} }`;
  }

  visitFunctionDeclarationNode(node: FunctionDeclarationNode): string {
    const paramTypes = node.parameters
      .map((param) => `${param.name}: ${this.mapType(param.type)}`)
      .join(', ');
    const returnType = this.mapType(node.returnType);
    const body = node.body
      .map((statement) => `  ${statement.accept(this)}`)
      .join('\n');
    return `function ${node.name}(${paramTypes}): ${returnType} {\n${body}\n}`;
  }

  visitFunctionCallNode(node: FunctionCallNode): string {
    const args = node.args.map((arg) => arg.accept(this)).join(', ');
    return `${node.name}(${args})`;
  }

  visitBranchingNode(node: BranchingNode): string {
    const trueBranch = node.trueBranch
      .map((stmt) => `  ${stmt.accept(this)}`)
      .join('\n');
    const falseBranch =
      node.falseBranch.length > 0
        ? ` else {\n${node.falseBranch
            .map((stmt) => `  ${stmt.accept(this)}`)
            .join('\n')}\n}`
        : '';
    return `if (${node.condition.accept(
      this
    )}) {\n${trueBranch}\n}${falseBranch}`;
  }

  visitLoopNode(node: LoopNode): string {
    const body = node.body.map((stmt) => `  ${stmt.accept(this)}`).join('\n');
    return `while (${node.condition.accept(this)}) {\n${body}\n}`;
  }

  visitOutputNode(node: OutputNode): string {
    return `console.log(${node.value.accept(this)});`;
  }

  visitUnaryExpressionNode(node: UnaryExpressionNode): string {
    const operator = node.operator;
    const operand = node.operand.accept(this);
    return `${operator}${operand}`;
  }

  visitReturnNode(node: ReturnNode): string {
    return `return ${node.returnValue.accept(this)};`;
  }

  visitIndexAccessNode(node: IndexAccessNode): string {
    const object = node.object.accept(this);
    const index = node.index.accept(this);
    return `${object}[${index}]`;
  }

  visitIndexAssignmentNode(node: IndexAssignmentNode): string {
    const object = node.object.accept(this);
    const index = node.index.accept(this);
    const value = node.value.accept(this);

    if (typeof object === 'string') {
      if (
        node.value instanceof LiteralNode &&
        typeof node.value.value === 'string'
      ) {
        if (node.value.value.length !== 1) {
          throw new Error(
            `Value for string assignment must be a single character.`
          );
        }
      } else if (typeof value !== 'string' || value.length !== 1) {
        throw new Error(
          `Value for string assignment must be a single character.`
        );
      }
    }

    return `${object}[${index}] = ${value};`;
  }

  visitTypeConstructionNode(node: TypeConstructionNode): string {
    const value = node.value.accept(this);
    return `String(${value})`;
  }

  visitStructTypeNode(node: StructTypeNode): string {
    const fields = Object.entries(node.fields)
      .map(([key, type]) => `${key}: ${this.mapType(type)}`)
      .join('; ');
    return `type ${node.name} = { ${fields} };`;
  }

  visitPropertyAccessNode(node: PropertyAccessNode): string {
    const object = node.object.accept(this);
    const property = node.property;
    return `${object}.${property}`;
  }
}

export class ASTTreeVisitor implements ASTVisitor {
  private depth: number = 0;

  private indent(depth: number = this.depth): string {
    return ' '.repeat(depth * 2);
  }

  visitProgramNode(node: ProgramNode): string {
    return node.statements.map((stmt) => this.visitNode(stmt)).join('\n');
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): string {
    const value = node.value ? this.visitNode(node.value) : 'null';
    return `${this.indent()}+ ${node.name} : ${node.type} = ${value}`;
  }

  visitBinaryExpressionNode(node: BinaryExpressionNode): string {
    // Manually handle left and right without relying on `accept`
    const currentDepth = this.depth;
    const left = this.visitNodeDirectly(node.left, currentDepth + 2);
    const right = this.visitNodeDirectly(
      node.right,
      currentDepth + (node.right instanceof BinaryExpressionNode ? 3 : 2)
    );

    // Generate formatted output
    let result = `${this.indent()}${node.operator} (\n`;
    result += `${left}\n${right}\n${this.indent()}  )`;

    return result;
  }

  visitFunctionDeclarationNode(node: FunctionDeclarationNode): string {
    const signature = `${this.indent()}@${node.name}(${node.parameters.join(
      ', '
    )}) -> ${node.returnType}\n`;
    this.depth++;
    const body = `${node.body.map((stmt) => this.visitNode(stmt)).join('\n')}`;
    this.depth--;
    return signature + body;
  }

  visitFunctionCallNode(node: FunctionCallNode): string {
    const args = node.args.map((arg) => this.visitNode(arg)).join(', ');
    return `${this.indent()}${node.name}(${args})`;
  }

  visitAssignmentNode(node: AssignmentNode): string {
    const name = this.visitNode(node.nameOrObjectPath);
    const value = this.visitNode(node.value);
    return `${name} <- ${value}`;
  }

  visitBranchingNode(node: BranchingNode): string {
    let result = `${this.indent()}if (${this.visitNode(node.condition)})\n`;
    this.depth++;
    result += `${this.indent()}then\n${node.trueBranch
      .map((stmt) => this.visitNode(stmt))
      .join('\n')}`;
    if (node.falseBranch.length > 0) {
      result += `\n${this.indent()}else\n${node.falseBranch
        .map((stmt) => this.visitNode(stmt))
        .join('\n')}`;
    }
    this.depth--;
    return result;
  }

  visitLoopNode(node: LoopNode): string {
    let result = `${this.indent()}while (${this.visitNode(node.condition)})\n`;
    this.depth++;
    result += `${node.body.map((stmt) => this.visitNode(stmt)).join('\n')}`;
    this.depth--;
    return result;
  }

  visitLiteralNode(node: LiteralNode): string {
    return `${this.indent()}${node.value}`;
  }

  visitIdentifierNode(node: IdentifierNode): string {
    return `${this.indent()}${node.name}`;
  }

  visitObjectLiteralNode(node: ObjectLiteralNode): string {
    let result = `${this.indent()}(\n`;
    this.depth++;
    for (const [key, value] of Object.entries(node.properties)) {
      result += `${this.indent()}${key}: ${this.visitNode(value)}\n`;
    }
    this.depth--;
    result += `${this.indent()})`;
    return result;
  }

  visitOutputNode(node: OutputNode): string {
    return `${this.indent()}^^ ${this.visitNode(node.value)}`;
  }

  visitUnaryExpressionNode(node: UnaryExpressionNode): string {
    const operator = node.operator;
    const operand = node.operand.accept(this);

    return `${this.indent()}${operator} ${operand}`;
  }

  visitReturnNode(node: ReturnNode): string {
    const returnValue = node.returnValue.accept(this);
    return `${this.indent()}@ <- ${returnValue}`;
  }

  visitIndexAccessNode(node: IndexAccessNode): string {
    const object = this.visitNode(node.object);
    const index = this.visitNode(node.index);
    return `${this.indent()}${object}->(${index})`;
  }

  visitIndexAssignmentNode(node: IndexAssignmentNode): string {
    const object = this.visitNode(node.object);
    const index = this.visitNode(node.index);
    const value = this.visitNode(node.value);
    return `${this.indent()}${object}->(${index}) = ${value}`;
  }

  visitTypeConstructionNode(node: TypeConstructionNode): string {
    const type = node.type;
    const value = this.visitNode(node.value);
    return `${this.indent()}${type}(${value})`;
  }

  // New helper methods to visit nodes directly
  private visitNode(node: ASTNode): string {
    return node.accept(this);
  }

  private visitNodeDirectly(node: ASTNode, newDepth: number): string {
    // Save the current depth and adjust for direct visitation
    const originalDepth = this.depth;
    this.depth = newDepth;

    let result = '';
    switch (node.constructor) {
      case BinaryExpressionNode:
        result = this.visitBinaryExpressionNode(node as BinaryExpressionNode);
        break;
      case LiteralNode:
        result = this.visitLiteralNode(node as LiteralNode);
        break;
      case IdentifierNode:
        result = this.visitIdentifierNode(node as IdentifierNode);
        break;
      default:
        result = this.visitNode(node);
    }

    // Restore the original depth
    this.depth = originalDepth;

    return result;
  }

  visitStructTypeNode(node: StructTypeNode): string {
    const fields = Object.entries(node.fields)
      .map(([key, type]) => `${this.indent()}${key}: ${type};`)
      .join('\n');
    return `${this.indent()}type ${node.name} = {\n${fields}\n${this.indent()}};`;
  }

  visitPropertyAccessNode(node: PropertyAccessNode): string {
    const object = this.visitNode(node.object);
    const property = node.property;
    return `${this.indent()}${object}->${property}`;
  }
}

export class OMLInterpreter implements ASTVisitor {
  private variables: Map<string, any> = new Map();
  private functions: Map<string, FunctionDeclarationNode> = new Map();
  private output: string[] = [];
  private structTypes: Map<string, { [key: string]: string }> = new Map();

  visitProgramNode(node: ProgramNode): any {
    for (const stmt of node.statements) {
      stmt.accept(this);
    }
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): any {
    const value = node.value ? node.value.accept(this) : null;
    this.variables.set(node.name, value);
  }

  visitAssignmentNode(node: AssignmentNode): any {
    const value = node.value.accept(this);
    if (node.nameOrObjectPath instanceof PropertyAccessNode) {
      this.visitPropertyAccessAssignment(node.nameOrObjectPath, value);
    } else {
      this.variables.set((node.nameOrObjectPath as IdentifierNode).name, value);
    }
  }

  visitPropertyAccessAssignment(node: PropertyAccessNode, value: any): any {
    const object = node.object.accept(this);
    if (typeof object === 'object' && object !== null) {
      object[node.property] = value;
    } else {
      throw new Error(`Cannot assign property '${node.property}' on non-object type.`);
    }
  }

  visitBinaryExpressionNode(node: BinaryExpressionNode): any {
    const left = node.left.accept(this);
    const right = node.right.accept(this);

    if (node.operator === '.') {
      return `${left}${right}`; // Strings concatenation
    }

    switch (node.operator) {
      // Math operations
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;

      // Logical operations
      case '&&':
        return left && right;
      case '||':
        return left || right;

      // Comparison operations
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;

      default:
        throw new Error(`Unsupported operator ${node.operator}`);
    }
  }

  visitFunctionDeclarationNode(node: FunctionDeclarationNode): any {
    this.functions.set(node.name, node);
  }

  visitFunctionCallNode(node: FunctionCallNode): any {
    const func = this.functions.get(node.name);
    if (!func) {
      throw new Error(`Function ${node.name} is not defined`);
    }

    // Create a new scope for the function
    const oldVariables = new Map(this.variables); // Save the previous context
    for (let i = 0; i < func.parameters.length; i++) {
      const param = func.parameters[i];
      const argValue = node.args[i].accept(this);
      this.variables.set(param.name, argValue);
    }

    // Execute the function body
    let result = null;
    try {
      for (const stmt of func.body) {
        stmt.accept(this);
      }
    } catch (returnResult) {
      result = returnResult; // Get a return value
    }

    this.variables = oldVariables; // Restore the previous context

    return result;
  }

  visitBranchingNode(node: BranchingNode): any {
    const condition = node.condition.accept(this);
    if (condition) {
      for (const stmt of node.trueBranch) {
        stmt.accept(this); // True branch
      }
    } else {
      for (const stmt of node.falseBranch) {
        stmt.accept(this); // False branch
      }
    }
  }

  visitLoopNode(node: LoopNode): any {
    while (node.condition.accept(this)) {
      for (const stmt of node.body) {
        stmt.accept(this);
      }
    }
  }

  visitLiteralNode(node: LiteralNode): any {
    return node.value; // Literal (number, string, bool)
  }

  visitIdentifierNode(node: IdentifierNode): any {
    return this.variables.get(node.name);
  }

  visitObjectLiteralNode(node: ObjectLiteralNode): any {
    const obj: any = {};
    for (const [key, valueNode] of Object.entries(node.properties)) {
      obj[key] = valueNode.accept(this);
    }
    return obj;
  }

  visitOutputNode(node: OutputNode): any {
    const value = node.value.accept(this);
    this.output.push(value);
  }

  visitUnaryExpressionNode(node: UnaryExpressionNode): any {
    const operand = node.operand.accept(this);
    switch (node.operator) {
      case '-':
        return -operand; // Unary minus
      case '!':
        return !operand; // Logical Not
      default:
        throw new Error(`Unsupported unary operator ${node.operator}`);
    }
  }

  visitReturnNode(node: ReturnNode): any {
    const returnValue = node.returnValue.accept(this);
    throw returnValue;
  }

  visitIndexAccessNode(node: IndexAccessNode): any {
    const object = node.object.accept(this);
    const index = node.index.accept(this);

    if (typeof object === 'string') {
      if (typeof index !== 'number' || index < 0 || index >= object.length) {
        throw new Error(`Index out of bounds`);
      }
      return object[index];
    }

    throw new Error(`Unsupported index access on type '${typeof object}'`);
  }

  visitIndexAssignmentNode(node: IndexAssignmentNode): any {
    const object = node.object.accept(this);
    const index = node.index.accept(this);
    const value = node.value.accept(this);

    if (typeof object === 'string') {
      if (typeof index !== 'number' || index < 0 || index >= object.length) {
        throw new Error(`Index out of bounds`);
      }
      if (typeof value !== 'string' || value.length !== 1) {
        throw new Error(
          `Value for string assignment must be a single character`
        );
      }
      const characters = object.split('');
      characters[index] = value;
      this.variables.set(
        (node.object as IdentifierNode).name,
        characters.join('')
      );
      return;
    }

    throw new Error(`Unsupported index assignment on type '${typeof object}'`);
  }

  visitTypeConstructionNode(node: TypeConstructionNode): any {
    const type = node.type;
    const value = node.value.accept(this);

    if (type === 'string') {
      if (typeof value === 'number') {
        if (value < 1) {
          throw new Error(`String length must be greater than 0`);
        }
        return ' '.repeat(value);
      }
      if (typeof value === 'string') {
        return `${value}`;
      }
    }

    throw new Error(`Unsupported type construction: ${type}`);
  }

  visitStructTypeNode(node: StructTypeNode): void {
    if (this.structTypes.has(node.name)) {
      throw new Error(`Struct type '${node.name}' is already declared.`);
    }
    this.structTypes.set(node.name, node.fields);
  }

  visitPropertyAccessNode(node: PropertyAccessNode): any {
    const object = node.object.accept(this);

    if (typeof object === 'string' && node.property === 'length') {
      if (node.isAssignment) {
        throw new Error(`Cannot assign to read-only property 'length' of type 'string'.`);
      }
      return object.length;
    }

    if (Array.isArray(object) && node.property === 'length') {
      if (node.isAssignment) {
        throw new Error(`Cannot assign to read-only property 'length' of type 'array'.`);
      }
      return object.length;
    }

    if (typeof object === 'object' && object !== null) {
      if (!(node.property in object)) {
        throw new Error(`Property '${node.property}' does not exist on object.`);
      }
      return object[node.property];
    }

    throw new Error(`Unsupported property access on type '${typeof object}'.`);
  }

  getOutput(): string {
    return this.output.join('\n');
  }
}
