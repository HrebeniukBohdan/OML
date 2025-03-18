import {
  ASTNode,
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
import { SyntaxError } from './errors';
import { Token, TokenType } from './tokenizer';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private contextStack: string[] = []; // Стек контекстів
  private code: string;

  constructor(code: string, tokens: Token[]) {
    this.code = code;
    this.tokens = tokens;
  }

  public parse(): ASTNode {
    return this.parseProgram();
  }

  // Парсинг програми: набір інструкцій або функцій
  private parseProgram(): ASTNode {
    const statements = [];
    while (!this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    return new ProgramNode(statements);
  }

  private parseStatement(): ASTNode {
    const semicolonStatement: ASTNode = this.parseSemicolonStatement();
    if (semicolonStatement) return semicolonStatement;
    if (this.match(TokenType.AtSymbol)) return this.parseFunctionDeclaration();
    if (this.match(TokenType.Branching)) return this.parseBranching(); // Додаємо розгалуження
    if (this.match(TokenType.Loop)) return this.parseLoop(); // Додаємо цикл
    if (this.match(TokenType.Colon)) return this.parseExpression();

    return this.throwErrorWithContext('Unexpected statement');
  }

  private parseSemicolonStatement(): ASTNode {
    let statement: ASTNode | null = null;

    // Парсинг оголошення змінної
    if (this.match(TokenType.Operator) && this.peek().value === '+') {
      statement = this.parseVariableDeclaration();
    }
    // Парсинг виклику функції
    else if (this.match(TokenType.Addition)) {
      statement = this.parseFunctionCall();
    }
    // Парсинг присвоєння
    else if (this.match(TokenType.Assignment)) {
      statement = this.parseAssignment();
    }
    // Парсинг індексованого присвоєння
    else if (this.match(TokenType.Identifier) && this.checkNext(TokenType.AccessOperator)) {
      statement = this.parseIndexAssignment();
    }
    // Парсинг виводу
    else if (this.match(TokenType.Output)) {
      statement = this.parseOutput();
    } else if (
      this.match(TokenType.AtSymbol) &&
      this.checkNext(TokenType.Identifier) &&
      this.checkNext(TokenType.Assignment, 2)
    ) {
      statement = this.parseReturnStatement();
    }

    // Додаємо перевірку на закінчення інструкції символом ';'
    if (statement) {
      this.consume(
        TokenType.Punctuation,
        ';',
        "Expected ';' as end of the statement"
      );
    }

    return statement;
  }

  private parseBranching(): ASTNode {
    this.consume(
      TokenType.Branching,
      '?',
      "Expect '?' for branching statement"
    );
    this.consume(TokenType.Punctuation, '[', "Expect '[' for condition start");
    const condition = this.parseExpression();
    this.consume(TokenType.Punctuation, ']', "Expect ']' for condition end");

    const trueBranch = this.parseBlock();

    // Перевіряємо наявність else блоку
    let falseBranch: ASTNode[] = [];
    if (this.match(TokenType.Colon)) {
      this.advance();
      falseBranch = this.parseBlock();
    }

    return new BranchingNode(condition, trueBranch, falseBranch);
  }

  private parseLoop(): ASTNode {
    this.consume(TokenType.Loop, '%', "Expect '%' for loop statement");
    this.consume(
      TokenType.Punctuation,
      '[',
      "Expect '[' for loop condition start"
    );
    const condition = this.parseExpression();
    this.consume(
      TokenType.Punctuation,
      ']',
      "Expect ']' for loop condition end"
    );

    const body = this.parseBlock();

    return new LoopNode(condition, body);
  }

  // Парсинг оголошення змінної
  private parseVariableDeclaration(): ASTNode {
    this.consume(
      TokenType.Operator,
      '+',
      "Expect '+' for variable declaration"
    );
    const name = this.consume(
      TokenType.Identifier,
      null,
      'Expect variable name'
    ).value;
    this.consume(
      TokenType.Punctuation,
      '~',
      "Expect '~' before variable type declaration"
    );
    const type = this.consume(
      TokenType.Type,
      null,
      'Expect type declaration'
    ).value;
    
    let value: ASTNode | null = null;
    if (this.match(TokenType.Equals)) {
      this.advance();
      value = this.parseExpression();
    }
    return new VariableDeclarationNode(name, type, value);
  }

  // Парсинг присвоєння
  private parseAssignment(): ASTNode {
    this.consume(TokenType.Assignment, null, "Expect '<-' for assignment");

    // Ліва частина: має бути або ідентифікатором, або доступом до властивості об'єкта
    const name: ASTNode = this.parseIdentifierOrObjectAccess();

    this.consume(TokenType.Equals, null, "Expect '=' after variable name");
    const value = this.parseExpression(); // Права частина: довільний вираз

    return new AssignmentNode(name, value);
  }

  private parseIdentifier(): ASTNode {
    const identifier = new IdentifierNode(
      this.consume(
        TokenType.Identifier,
        null,
        'Expect variable or object name'
      ).value
    );

    return identifier; // Якщо це просто ідентифікатор
  }

  // Парсинг ідентифікатора або доступу до властивості об'єкта
  private parseIdentifierOrObjectAccess(): ASTNode {
    const identifier = this.parseIdentifier();

    if (this.match(TokenType.AccessOperator)) {
      // Перевірка на оператор '->'
      this.consume(
        TokenType.AccessOperator,
        '->',
        "Expect '->' for object property access"
      );
      const property = this.consume(
        TokenType.Identifier,
        null,
        'Expect object property name'
      ).value;
      return new ObjectAccessNode(identifier, property); // Повертаємо вузол доступу до властивості об'єкта
    }

    return identifier; // Якщо це просто ідентифікатор
  }

  // Парсинг функції
  private parseFunctionDeclaration(): ASTNode {
    this.contextStack.push('function');
    this.consume(
      TokenType.AtSymbol,
      null,
      "Expect '@' for function declaration"
    );
    const name = this.consume(
      TokenType.Identifier,
      null,
      'Expect function name'
    ).value;
    this.consume(TokenType.FunctionDeclaration, '::', "Expect '::'");
    const parameters = this.parseParameters();
    this.consume(
      TokenType.AccessOperator,
      null,
      "Expect '->' after parameters"
    );
    const returnType = this.consume(
      TokenType.Type,
      null,
      'Expect return type'
    ).value;
    const body = this.parseBlock();
    this.contextStack.pop();
    return new FunctionDeclarationNode(name, parameters, returnType, body);
  }

  // Парсинг виклику функції
  private parseFunctionCall(): ASTNode {
    this.consume(TokenType.Addition, '<>', "Expect '<>' for function call");
    const name = this.consume(
      TokenType.Identifier,
      null,
      "Expect function name after '<>'"
    ).value;
    this.consume(
      TokenType.FunctionDeclaration,
      '::',
      "Expect '::' after function name"
    );
    this.consume(
      TokenType.Punctuation,
      '(',
      "Expect '(' for function arguments"
    );
    const args = this.parseArguments();
    this.consume(
      TokenType.Punctuation,
      ')',
      "Expect ')' after function arguments"
    );
    return new FunctionCallNode(name, args);
  }

  // Парсинг блоку (тіло функції або інструкції)
  private parseBlock(): ASTNode[] {
    this.consume(TokenType.Punctuation, '|', "Expect '|' to start block");
    const statements = [];

    while (!this.check(TokenType.Punctuation) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }

    this.consume(TokenType.Punctuation, '~', "Expect '~' to end block");
    return statements;
  }

  private parseReturnStatement(): ASTNode {
    if (!this.contextStack.includes('function')) {
      this.throwErrorWithContext("'return' can only be used inside a function");
    }
    this.consume(
      TokenType.AtSymbol,
      null,
      "Expect '@' for return construction"
    );
    this.consume(
      TokenType.Identifier,
      null,
      'Expect a the fuction name for return construction'
    );
    this.consume(
      TokenType.Assignment,
      '<-',
      "Expect '<-' for return assignment"
    );
    const returnValue = this.parseExpression(); // Обчислення виразу для повернення
    return new ReturnNode(returnValue); // Створення вузла повернення
  }

  // Парсинг параметрів функції
  private parseParameters(): { name: string; type: string }[] {
    const parameters: { name: string; type: string }[] = [];

    // Перевіряємо, чи після '::' йде ключове слово "none", що означає відсутність параметрів
    if (this.match(TokenType.None)) {
      this.consume(
        TokenType.None,
        null,
        "Expect 'none' in a case when function has no parameters"
      );
      return parameters; // Повертаємо порожній масив параметрів, якщо є ключове слово "none"
    }

    this.consume(
      TokenType.LogicOperator,
      '<',
      "Expect '<' to start parameter list"
    );

    // Парсимо список параметрів
    do {
      const paramName = this.consume(
        TokenType.Identifier,
        null,
        'Expect parameter name'
      ).value;
      this.consume(
        TokenType.Punctuation,
        '~',
        "Expect '~' after parameter identifier"
      );
      const paramType = this.consume(
        TokenType.Type,
        null,
        "Expect parameter type after '~'"
      ).value;
      parameters.push({ name: paramName, type: paramType });
    } while (
      this.match(TokenType.Punctuation) &&
      this.peek().value === '&' &&
      this.advance()
    );

    this.consume(
      TokenType.LogicOperator,
      '>',
      "Expect '>' to end parameter list"
    );
    return parameters;
  }

  // Парсинг аргументів функції
  private parseArguments(): ASTNode[] {
    const args = [];
    if (!this.check(TokenType.Punctuation)) {
      do {
        args.push(this.parseExpression());
      } while (
        this.match(TokenType.Punctuation) &&
        this.peek().value === ',' &&
        this.advance()
      );
    }
    return args;
  }

  private parseExpression(): ASTNode {
    // Починаємо з парсингу базового елемента
    let expression = this.parsePrimaryExpression();

    // Якщо є оператори, парсимо бінарні вирази
    if (
      this.match(TokenType.Operator) ||
      this.match(TokenType.LogicOperator) ||
      this.match(TokenType.Dot)
    ) {
      expression = this.parseBinaryExpression(expression);
    }

    return expression;
  }

  private parseBinaryExpression(left: ASTNode): ASTNode {
    while (
      this.match(TokenType.Operator) ||
      this.match(TokenType.LogicOperator) ||
      this.match(TokenType.Dot)
    ) {
      const operator = this.advance().value; // Отримуємо оператор
      const precedence = this.getOperatorPrecedence(operator);
      let right = this.parsePrimaryExpression(); // Парсимо правий операнд

      // Якщо у правого виразу є оператор з вищим пріоритетом, парсимо його
      while (
        !this.isAtEnd() &&
        this.getOperatorPrecedence(this.peek().value) > precedence
      ) {
        right = this.parseBinaryExpression(right);
      }

      left = new BinaryExpressionNode(left, operator, right); // Створюємо вузол для бінарного виразу
    }

    return left;
  }

  // Визначаємо пріоритет операторів
  private getOperatorPrecedence(operator: string): number {
    switch (operator) {
      case '||':
        return 1; // Нижчий пріоритет для логічного OR
      case '&&':
        return 2; // Вищий пріоритет для логічного AND
      case '==':
      case '!=':
        return 3; // Пріоритет порівняння
      case '<':
      case '>':
      case '<=':
      case '>=':
        return 4; // Пріоритет порівняння чисел
      case '.':
        return 5; // Пріоритет конкатенації (нижчий за арифметичні операції)
      case '+':
      case '-':
        return 6; // Пріоритет для додавання і віднімання
      case '*':
      case '/':
        return 7; // Пріоритет для множення і ділення
      default:
        return 0; // Інші оператори
    }
  }

  private parsePrimaryExpression(): ASTNode {
    // Якщо зустрічається унарний мінус
    if (
      this.match(TokenType.Operator) &&
      (this.peek().value === '-' || this.peek().value === '!')
    ) {
      const operator = this.advance().value; // Отримуємо оператор (- або !)
      const operand = this.parsePrimaryExpression(); // Рекурсивно парсимо операнд
      if (
        !(operand instanceof LiteralNode || operand instanceof IdentifierNode)
      ) {
        throw new Error(
          'Унарні операції підтримуються тільки для літералів і змінних'
        );
      }
      return new UnaryExpressionNode(operator, operand); // Повертаємо унарний вузол
    }
    if (this.match(TokenType.Bool)) {
      const value = this.advance().value === 'yes';
      return new LiteralNode(value); // true для "yes" і false для "no"
    }
    if (this.match(TokenType.Number))
      return new LiteralNode(parseFloat(this.advance().value));
    if (this.match(TokenType.String))
      return new LiteralNode(this.advance().value.slice(1, -1));

    if (this.match(TokenType.Type)) {
      return this.parseTypeConstruction();
    }

    // Якщо зустрічаємо ідентифікатор, перевіряємо, чи є доступ до об'єкта (Object Path)
    if (this.match(TokenType.Identifier) && this.checkNext(TokenType.AccessOperator)) {
      return this.parseIndexAccess();
    }
    if (this.match(TokenType.Identifier)) {
      let node: ASTNode = new IdentifierNode(this.advance().value);

      // Якщо далі йде оператор доступу '->', це означає, що ми маємо доступ до властивості об'єкта
      while (this.match(TokenType.AccessOperator) && this.advance()) {
        const property = this.consume(
          TokenType.Identifier,
          null,
          "Expect property name after '->'"
        );
        node = new ObjectAccessNode(node, property.value); // Створюємо вузол доступу до об'єкта
      }

      return node;
    }

    // Логіка для об'єктних літералів
    if (
      this.match(TokenType.Punctuation) &&
      this.peek().value === '(' &&
      this.checkNext(TokenType.Identifier) &&
      this.checkNext(TokenType.Colon, 2)
    ) {
      return this.parseObjectLiteral();
    }
    // Логіка для виразів в дужках
    else if (this.match(TokenType.Punctuation) && this.peek().value === '(') {
      this.consume(TokenType.Punctuation, '(', "Expect '(' to open expression");
      const expr = this.parseExpression();
      this.consume(
        TokenType.Punctuation,
        ')',
        "Expect ')' to close expression"
      );
      return expr;
    }

    // Логіка для виразів в дужках
    if (this.match(TokenType.Punctuation) && this.peek().value === '(') {
      this.consume(TokenType.Punctuation, '(', "Expect '(' to open expression");
      const expr = this.parseExpression();
      this.consume(
        TokenType.Punctuation,
        ')',
        "Expect ')' to close expression"
      );
      return expr;
    }

    // Логіка для виклику функції в якості виразу
    if (this.match(TokenType.Addition)) {
      return this.parseFunctionCall();
    }

    this.throwErrorWithContext('Unexpected token in expression');
  }

  private parseTypeConstruction(): TypeConstructionNode {
    const type = this.consume(
      TokenType.Type,
      'string',
      'Expect type "string"'
    ).value;

    this.consume(TokenType.Punctuation, '(', "Expect '(' to open type construction");
    const value = this.parseExpression();
    this.consume(TokenType.Punctuation, ')', "Expect ')' to close type construction");

    return new TypeConstructionNode(type, value);
  }

  // Парсинг індексованого доступу
  private parseIndexAccess(): IndexAccessNode {
    const objectId = this.parseIdentifier();
    this.consume(TokenType.AccessOperator, '->', "Expect '->' for index access");
    this.consume(TokenType.Punctuation, '(', "Expect '(' for index access");
    const index = this.parseExpression();
    this.consume(TokenType.Punctuation, ')', "Expect ')' after index");
    return new IndexAccessNode(objectId, index);
  }

  // Парсинг індексованого присвоєння
  private parseIndexAssignment(): IndexAssignmentNode {
    const objectId = this.parseIdentifier();
    this.consume(TokenType.AccessOperator, '->', "Expect '->' for index access");
    this.consume(TokenType.Punctuation, '(', "Expect '(' for index access");
    const index = this.parseExpression();
    this.consume(TokenType.Punctuation, ')', "Expect ')' after index");
    this.consume(TokenType.Equals, '=', "Expect '=' for index assignment");
    const value = this.parseExpression();
    return new IndexAssignmentNode(objectId, index, value);
  }
  
  private parseObjectLiteral(): ObjectLiteralNode {
    const properties: { [key: string]: ASTNode } = {};

    this.consume(
      TokenType.Punctuation,
      '(',
      "Expect '(' to start object literal"
    );

    // Парсимо властивості об'єкта
    do {
      const key = this.consume(
        TokenType.Identifier,
        null,
        'Expect object property name'
      ).value;
      this.consume(TokenType.Colon, ':', "Expect ':' after property name"); // Використовуємо TokenType.Colon для ':'
      const value = this.parseExpression(); // Значення властивості може бути будь-яким виразом
      properties[key] = value;
    } while (
      this.match(TokenType.Punctuation) &&
      this.peek().value === ',' &&
      this.consume(
        TokenType.Punctuation,
        ',',
        "Expect ',' between object fields description"
      )
    );

    this.consume(
      TokenType.Punctuation,
      ')',
      "Expect ')' to end object literal"
    );

    return new ObjectLiteralNode(properties);
  }

  // Парсинг виводу
  private parseOutput(): ASTNode {
    this.consume(TokenType.Output, '^^', "Expect '^^' for output");
    const value = this.parseExpression();
    return new OutputNode(value); // Тепер створюємо вузол OutputNode
  }

  // Оновлений метод consume
  private consume(
    type: TokenType,
    expectedValue: string | null,
    errorMessage: string
  ): Token {
    if (
      this.check(type) &&
      (expectedValue === null || this.peek().value === expectedValue)
    ) {
      return this.advance();
    }

    this.throwErrorWithContext(errorMessage);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: TokenType, aheadIndex: number = 1): boolean {
    if (this.isAtEnd()) return false;
    return this.tokens[this.current + aheadIndex].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private throwErrorWithContext(message: string): never {
    const token = this.tokens[this.current];

    // Підраховуємо початок і кінець фрагменту
    const snippetStart = Math.max(0, token.position - 40); // 40 символів до токена
    const snippetEnd = Math.min(this.code.length, token.position + 40); // 40 символів після токена

    const snippetBefore = this.code.slice(snippetStart, token.position); // Фрагмент перед токеном
    const unknownChar = this.code[token.position]; // Проблемний символ
    const snippetAfter = this.code.slice(token.position + 1, snippetEnd); // Фрагмент після токена

    // Додаємо три крапки на початок, якщо перед snippet є ще текст
    const leadingEllipsis = snippetStart > 0 ? '...' : '';
    // Додаємо три крапки в кінець, якщо після snippet є ще текст
    const trailingEllipsis = snippetEnd < this.code.length ? '...' : '';
    // Формуємо сніпет з крапками
    const errorSnippet = `${leadingEllipsis}${snippetBefore}[${unknownChar}]${snippetAfter}${trailingEllipsis}`;

    throw new SyntaxError(
      message,
      token.line,
      token.column,
      errorSnippet,
      token.value
    );
  }
}
