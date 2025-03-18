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
  ObjectAccessNode,
  ObjectLiteralNode,
  OutputNode,
  ProgramNode,
  ReturnNode,
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

  visitObjectAccessNode(node: ObjectAccessNode): any {
    return {
      type: 'ObjectAccess',
      object: node.object.accept(this), // Викликаємо accept, щоб обробити об'єкт, який може бути вкладеним
      property: node.property, // Властивість, до якої здійснюється доступ
    };
  }

  visitOutputNode(node: OutputNode): any {
    return {
      type: 'Output',
      value: node.value.accept(this), // Обробляємо значення через візітор
    };
  }

  visitUnaryExpressionNode(node: UnaryExpressionNode): any {
    return {
      type: "UnaryExpression",
      operator: node.operator,
      operand: node.operand.accept(this) // Обробляємо операнд
    };
  }

  visitReturnNode(node: ReturnNode): any {
    return {
      type: 'Return',
      returnValue: node.returnValue.accept(this)
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
}

export class OMLToTypeScriptVisitor implements ASTVisitor {

  visitProgramNode(node: ProgramNode): string {
    return node.statements.map(statement => statement.accept(this)).join('\n');
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): string {
    const typeMapping: { [key: string]: string } = {
      'number': 'number',
      'string': 'string',
      'bool': 'boolean',
      'object': 'any'
    };

    const varType = typeMapping[node.type] || 'any';
    const varValue = node.value ? ` = ${node.value.accept(this)}` : '';
    return `let ${node.name}: ${varType}${varValue};`;
  }

  visitAssignmentNode(node: AssignmentNode): string {
    return `${node.nameOrObjectPath.accept(this)} = ${node.value.accept(this)};`;
  }

  private getOperatorPrecedence(operator: string): number {
    switch (operator) {
      case '||': return 1;
      case '&&': return 2;
      case '==': case '!=': return 3;
      case '<': case '>': case '<=': case '>=': return 4;
      case '+': case '-': return 5;
      case '*': case '/': return 6;
      case '.': return 0;  // Пріоритет для конкатенації
      default: return 0;
    }
  }

  private wrapWithParentheses(expression: string, parentPrecedence: number, currentPrecedence: number): string {
    if (currentPrecedence < parentPrecedence) {
      return `(${expression})`;
    }
    return expression;
  }

  visitBinaryExpressionNode(node: BinaryExpressionNode, parentPrecedence: number = 0): string {
    const operatorPrecedence = this.getOperatorPrecedence(node.operator);

    const left = node.left instanceof BinaryExpressionNode
      ? this.visitBinaryExpressionNode(node.left, operatorPrecedence)
      : node.left.accept(this);
    const right = node.right instanceof BinaryExpressionNode
      ? this.visitBinaryExpressionNode(node.right, operatorPrecedence)
      : node.right.accept(this);

    const operator = node.operator === '.' ? '+' : node.operator; // Замінюємо '.' на '+' для TypeScript

    return this.wrapWithParentheses(`${left} ${operator} ${right}`, parentPrecedence, operatorPrecedence);
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

  visitObjectAccessNode(node: ObjectAccessNode): string {
    return `${node.object.accept(this)}.${node.property}`;
  }

  visitFunctionDeclarationNode(node: FunctionDeclarationNode): string {
    const paramTypes = node.parameters
      .map(param => `${param.name}: ${param.type}`)
      .join(', ');
    const returnType = node.returnType === 'none' ? 'void' : node.returnType;
    const body = node.body.map(statement => `  ${statement.accept(this)}`).join('\n');
    return `function ${node.name}(${paramTypes}): ${returnType} {\n${body}\n}`;
  }

  visitFunctionCallNode(node: FunctionCallNode): string {
    const args = node.args.map(arg => arg.accept(this)).join(', ');
    return `${node.name}(${args})`;
  }

  visitBranchingNode(node: BranchingNode): string {
    const trueBranch = node.trueBranch.map(stmt => `  ${stmt.accept(this)}`).join('\n');
    const falseBranch = node.falseBranch.length > 0 ? ` else {\n${node.falseBranch.map(stmt => `  ${stmt.accept(this)}`).join('\n')}\n}` : '';
    return `if (${node.condition.accept(this)}) {\n${trueBranch}\n}${falseBranch}`;
  }

  visitLoopNode(node: LoopNode): string {
    const body = node.body.map(stmt => `  ${stmt.accept(this)}`).join('\n');
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
      if (node.value instanceof LiteralNode && typeof node.value.value === 'string') {
        if (node.value.value.length !== 1) {
          throw new Error(`Value for string assignment must be a single character.`);
        }
      } else if (typeof value !== 'string' || value.length !== 1) {
        throw new Error(`Value for string assignment must be a single character.`);
      }
    }

    return `${object}[${index}] = ${value};`;
  }

  visitTypeConstructionNode(node: TypeConstructionNode): string {
    //const type = node.type;
    const value = node.value.accept(this);
    return `String(${value})`;
  }
}

export class ASTTreeVisitor implements ASTVisitor {
  private depth: number = 0;

  private indent(depth: number = this.depth): string {
    return ' '.repeat(depth * 2);
  }

  visitProgramNode(node: ProgramNode): string {
    return node.statements.map(stmt => this.visitNode(stmt)).join('\n');
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): string {
    const value = node.value ? this.visitNode(node.value) : 'null';
    return `${this.indent()}+ ${node.name} : ${node.type} = ${value}`;
  }

  visitBinaryExpressionNode(node: BinaryExpressionNode): string {
    // Manually handle left and right without relying on `accept`
    const currentDepth = this.depth;
    const left = this.visitNodeDirectly(node.left, currentDepth + 2);
    const right = this.visitNodeDirectly(node.right, currentDepth + (node.right instanceof BinaryExpressionNode ? 3 : 2));

    // Generate formatted output
    let result = `${this.indent()}${node.operator} (\n`;
    result += `${left}\n${right}\n${this.indent()}  )`;

    return result;
  }

  visitFunctionDeclarationNode(node: FunctionDeclarationNode): string {
    const signature = `${this.indent()}@${node.name}(${node.parameters.join(', ')}) -> ${node.returnType}\n`;
    this.depth++;
    const body = `${node.body.map(stmt => this.visitNode(stmt)).join('\n')}`;
    this.depth--;
    return signature + body;
  }

  visitFunctionCallNode(node: FunctionCallNode): string {
    const args = node.args.map(arg => this.visitNode(arg)).join(', ');
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
    result += `${this.indent()}then\n${node.trueBranch.map(stmt => this.visitNode(stmt)).join('\n')}`;
    if (node.falseBranch.length > 0) {
      result += `\n${this.indent()}else\n${node.falseBranch.map(stmt => this.visitNode(stmt)).join('\n')}`;
    }
    this.depth--;
    return result;
  }

  visitLoopNode(node: LoopNode): string {
    let result = `${this.indent()}while (${this.visitNode(node.condition)})\n`;
    this.depth++;
    result += `${node.body.map(stmt => this.visitNode(stmt)).join('\n')}`;
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

  visitObjectAccessNode(node: ObjectAccessNode): string {
    return `${this.indent()}${this.visitNode(node.object)}->${node.property}`;
  }

  visitOutputNode(node: OutputNode): string {
    return `${this.indent()}^^ ${this.visitNode(node.value)}`;
  }

  visitUnaryExpressionNode(node: UnaryExpressionNode): string {
    // Оператор (унарний)
    const operator = node.operator;
  
    // Операнд, який має бути відображений після оператора
    const operand = node.operand.accept(this);
  
    // Формуємо відображення унарного виразу
    return `${this.indent()}${operator} ${operand}`;  // Наприклад, '- 5' або '! isTrue'
  }

  visitReturnNode(node: ReturnNode): string {
    const returnValue = node.returnValue.accept(this); // Отримуємо значення для повернення
    return `${this.indent()}@ <- ${returnValue}`; // Формуємо рядок для повернення
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
}

export class OMLInterpreter implements ASTVisitor {
  private variables: Map<string, any> = new Map(); // Для збереження змінних
  private functions: Map<string, FunctionDeclarationNode> = new Map(); // Для збереження оголошених функцій
  private output: string[] = []; // Для збереження результату виведення

  visitProgramNode(node: ProgramNode): any {
    for (const stmt of node.statements) {
      stmt.accept(this); // Виконуємо кожну інструкцію
    }
  }

  visitVariableDeclarationNode(node: VariableDeclarationNode): any {
    const value = node.value ? node.value.accept(this) : null; // Отримуємо початкове значення, якщо є
    this.variables.set(node.name, value); // Зберігаємо змінну
  }

  visitAssignmentNode(node: AssignmentNode): any {
    const value = node.value.accept(this); // Обчислюємо праву частину
    if (node.nameOrObjectPath instanceof ObjectAccessNode) {
      this.visitObjectAccessAssignment(node.nameOrObjectPath, value);
    } else {
      this.variables.set((node.nameOrObjectPath as IdentifierNode).name, value); // Присвоєння змінній
    }
  }

  visitBinaryExpressionNode(node: BinaryExpressionNode): any {
    const left = node.left.accept(this);
    const right = node.right.accept(this);
    
    if (node.operator === '.') {
      return `${left}${right}`;  // Перетворюємо на рядки та конкатенуємо
    }

    switch (node.operator) {
      // Математичні операції
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
        
      // Логічні операції
      case '&&':
        return left && right;
      case '||':
        return left || right;
        
      // Оператори порівняння
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

  // Оголошення функцій
  visitFunctionDeclarationNode(node: FunctionDeclarationNode): any {
    this.functions.set(node.name, node); // Зберігаємо функцію у функціях
  }

  // Виклик функцій
  visitFunctionCallNode(node: FunctionCallNode): any {
    const func = this.functions.get(node.name);
    if (!func) {
      throw new Error(`Function ${node.name} is not defined`);
    }

    // Створюємо новий контекст для параметрів функції
    const oldVariables = new Map(this.variables); // Зберігаємо попередній контекст змінних
    for (let i = 0; i < func.parameters.length; i++) {
      const param = func.parameters[i];
      const argValue = node.args[i].accept(this); // Обчислюємо аргументи
      this.variables.set(param.name, argValue); // Присвоюємо аргументи параметрам
    }

    // Виконуємо тіло функції
    let result = null;
    try {
      for (const stmt of func.body) {
        stmt.accept(this);
      }
    } catch (returnResult) {
      result = returnResult; // Отримуємо результат із виклику ReturnNode
    }

    // Відновлюємо попередній контекст змінних
    this.variables = oldVariables;

    return result;
  }

  visitBranchingNode(node: BranchingNode): any {
    const condition = node.condition.accept(this);
    if (condition) {
      for (const stmt of node.trueBranch) {
        stmt.accept(this); // Виконуємо істинну гілку
      }
    } else {
      for (const stmt of node.falseBranch) {
        stmt.accept(this); // Виконуємо хибну гілку
      }
    }
  }

  visitLoopNode(node: LoopNode): any {
    while (node.condition.accept(this)) {
      for (const stmt of node.body) {
        stmt.accept(this); // Виконуємо тіло циклу
      }
    }
  }

  visitLiteralNode(node: LiteralNode): any {
    return node.value; // Повертаємо літеральне значення (число, рядок тощо)
  }

  visitIdentifierNode(node: IdentifierNode): any {
    return this.variables.get(node.name); // Повертаємо значення змінної
  }

  visitObjectLiteralNode(node: ObjectLiteralNode): any {
    const obj: any = {};
    for (const [key, valueNode] of Object.entries(node.properties)) {
      obj[key] = valueNode.accept(this); // Обчислюємо кожну властивість
    }
    return obj; // Повертаємо об'єкт
  }

  visitObjectAccessNode(node: ObjectAccessNode): any {
    const object = node.object.accept(this);
    return object[node.property]; // Отримуємо значення властивості об'єкта
  }

  visitObjectAccessAssignment(node: ObjectAccessNode, value: any): any {
    const object = node.object.accept(this);
    object[node.property] = value; // Присвоюємо значення властивості
  }

  visitOutputNode(node: OutputNode): any {
    const value = node.value.accept(this);
    this.output.push(value); // Зберігаємо результат виведення
  }

  visitUnaryExpressionNode(node: UnaryExpressionNode): any {
    const operand = node.operand.accept(this);
    switch (node.operator) {
      case '-':
        return -operand; // Унарний мінус
      case '!':
        return !operand; // Логічне заперечення
      default:
        throw new Error(`Unsupported unary operator ${node.operator}`);
    }
  }

  visitReturnNode(node: ReturnNode): any {
    const returnValue = node.returnValue.accept(this);
    throw returnValue; // Використовуємо виключення для зупинки виконання функції
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
        throw new Error(`Value for string assignment must be a single character`);
      }
      const characters = object.split('');
      characters[index] = value;
      this.variables.set((node.object as IdentifierNode).name, characters.join(''));
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
        return ' '.repeat(value); // Створюємо новий рядок з пробілами заданої довжини
      }
      if (typeof value === 'string') {
        return `${value}`; // Створюємо новий рядок за заданим літералом
      }
      
    }

    throw new Error(`Unsupported type construction: ${type}`);
  }

  getOutput(): string {
    return this.output.join('\n'); // Повертаємо результат виведення
  }
}
