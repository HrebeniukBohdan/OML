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
import { SyntaxError } from './errors';
import { Token, TokenType } from './tokenizer';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private contextStack: string[] = [];
  private code: string;

  constructor(code: string, tokens: Token[]) {
    this.code = code;
    this.tokens = tokens;
  }

  public parse(): ASTNode {
    return this.parseProgram();
  }

  private parseProgram(): ASTNode {
    const statements = [];
    while (!this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    return new ProgramNode(statements);
  }

  private parseStatement(): ASTNode {
    if (this.match(TokenType.StructType)) return this.parseStructType();
    const semicolonStatement: ASTNode = this.parseSemicolonStatement();
    if (semicolonStatement) return semicolonStatement;
    if (this.match(TokenType.AtSymbol)) return this.parseFunctionDeclaration();
    if (this.match(TokenType.Branching)) return this.parseBranching();
    if (this.match(TokenType.Loop)) return this.parseLoop();
    if (this.match(TokenType.Colon)) return this.parseExpression();

    return this.throwErrorWithContext('Unexpected statement');
  }

  private parseSemicolonStatement(): ASTNode {
    let statement: ASTNode | null = null;

    if (this.match(TokenType.Operator) && this.peek().value === '+') {
      statement = this.parseVariableDeclaration();
    } else if (this.match(TokenType.Addition)) {
      statement = this.parseFunctionCall();
    } else if (this.match(TokenType.Assignment)) {
      statement = this.parseAssignment();
    } else if (
      this.match(TokenType.Identifier) &&
      this.checkNext(TokenType.AccessOperator)
    ) {
      statement = this.parseIndexAssignment();
    } else if (this.match(TokenType.Output)) {
      statement = this.parseOutput();
    } else if (
      this.match(TokenType.AtSymbol) &&
      this.checkNext(TokenType.Identifier) &&
      this.checkNext(TokenType.Assignment, 2)
    ) {
      statement = this.parseReturnStatement();
    }

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

    const type = this.parseType();

    let value: ASTNode | null = null;
    if (this.match(TokenType.Equals)) {
      this.advance();
      value = this.parseExpression();
    }
    return new VariableDeclarationNode(name, type, value);
  }

  private parseAssignment(): ASTNode {
    this.consume(TokenType.Assignment, null, "Expect '<-' for assignment");

    const name: ASTNode = this.parseIdentifierOrPropertyAccess();

    this.consume(TokenType.Equals, null, "Expect '=' after variable name");
    const value = this.parseExpression();

    if (name instanceof PropertyAccessNode) {
      name.isAssignment = true;
    }

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

    return identifier;
  }

  private parseIdentifierOrPropertyAccess(): ASTNode {
    let identifier = this.parseIdentifier();

    while (this.match(TokenType.AccessOperator)) {
      this.consume(TokenType.AccessOperator, '->', "Expect '->' for property access");
      const property = this.consume(TokenType.Identifier, null, 'Expect property name').value;
      identifier = new PropertyAccessNode(identifier, property);
    }

    return identifier;
  }

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
    const returnValue = this.parseExpression();
    return new ReturnNode(returnValue);
  }

  private parseParameters(): { name: string; type: string }[] {
    const parameters: { name: string; type: string }[] = [];

    if (this.match(TokenType.None)) {
      this.consume(
        TokenType.None,
        null,
        "Expect 'none' in a case when function has no parameters"
      );
      return parameters;
    }

    this.consume(
      TokenType.LogicOperator,
      '<',
      "Expect '<' to start parameter list"
    );

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
      const paramType = this.parseType();
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
    let expression = this.parsePrimaryExpression();

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
      const operator = this.advance().value;
      const precedence = this.getOperatorPrecedence(operator);
      let right = this.parsePrimaryExpression();

      while (
        !this.isAtEnd() &&
        this.getOperatorPrecedence(this.peek().value) > precedence
      ) {
        right = this.parseBinaryExpression(right);
      }

      left = new BinaryExpressionNode(left, operator, right);
    }

    return left;
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
      case '.':
        return 5;
      case '+':
      case '-':
        return 6;
      case '*':
      case '/':
        return 7;
      default:
        return 0;
    }
  }

  private parsePrimaryExpression(): ASTNode {
    if (
      this.match(TokenType.Operator) &&
      (this.peek().value === '-' || this.peek().value === '!')
    ) {
      const operator = this.advance().value;
      const operand = this.parsePrimaryExpression();
      if (
        !(operand instanceof LiteralNode || operand instanceof IdentifierNode)
      ) {
        throw new Error(
          'Unary operations are only supported for literals and variables'
        );
      }
      return new UnaryExpressionNode(operator, operand);
    }
    if (this.match(TokenType.Bool)) {
      const value = this.advance().value === 'yes';
      return new LiteralNode(value);
    }
    if (this.match(TokenType.Number))
      return new LiteralNode(parseFloat(this.advance().value));
    if (this.match(TokenType.String))
      return new LiteralNode(this.advance().value.slice(1, -1));

    if (this.match(TokenType.Type)) {
      return this.parseTypeConstruction();
    }

    if (
      this.match(TokenType.Identifier) &&
      this.checkNext(TokenType.AccessOperator) &&
      this.checkNext(TokenType.Punctuation, 2)
    ) {
      return this.parseIndexAccess();
    }
    if (this.match(TokenType.Identifier)) {
      let node: ASTNode = new IdentifierNode(this.advance().value);

      while (this.match(TokenType.AccessOperator) && this.advance()) {
        const property = this.consume(
          TokenType.Identifier,
          null,
          "Expect property name after '->'"
        );
        node = new PropertyAccessNode(node, property.value);
      }

      return node;
    }

    if (
      this.match(TokenType.Punctuation) &&
      this.peek().value === '(' &&
      this.checkNext(TokenType.Identifier) &&
      this.checkNext(TokenType.Colon, 2)
    ) {
      return this.parseObjectLiteral();
    } else if (this.match(TokenType.Punctuation) && this.peek().value === '(') {
      this.consume(TokenType.Punctuation, '(', "Expect '(' to open expression");
      const expr = this.parseExpression();
      this.consume(
        TokenType.Punctuation,
        ')',
        "Expect ')' to close expression"
      );
      return expr;
    }

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

    if (this.match(TokenType.Addition)) {
      return this.parseFunctionCall();
    }

    this.throwErrorWithContext('Unexpected token in expression');
  }

  private parseTypeConstruction(): TypeConstructionNode {
    const type = this.parseType();

    this.consume(
      TokenType.Punctuation,
      '(',
      "Expect '(' to open type construction"
    );

    const values: ASTNode[] = [];
    do {
      values.push(this.parseExpression());
    } while (this.match(TokenType.Punctuation) && this.peek().value === ',' && this.advance());

    this.consume(
      TokenType.Punctuation,
      ')',
      "Expect ')' to close type construction"
    );

    return new TypeConstructionNode(type, values);
  }

  private parseIndexAccess(): IndexAccessNode {
    const objectId = this.parseIdentifier();
    this.consume(
      TokenType.AccessOperator,
      '->',
      "Expect '->' for index access"
    );
    this.consume(TokenType.Punctuation, '(', "Expect '(' for index access");
    const index = this.parseExpression();
    this.consume(TokenType.Punctuation, ')', "Expect ')' after index");
    return new IndexAccessNode(objectId, index);
  }

  private parseIndexAssignment(): IndexAssignmentNode {
    const objectId = this.parseIdentifier();
    this.consume(
      TokenType.AccessOperator,
      '->',
      "Expect '->' for index access"
    );
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

    do {
      const key = this.consume(
        TokenType.Identifier,
        null,
        'Expect object property name'
      ).value;
      this.consume(TokenType.Colon, ':', "Expect ':' after property name");
      const value = this.parseExpression();
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

  private parseOutput(): ASTNode {
    this.consume(TokenType.Output, '^^', "Expect '^^' for output");
    const value = this.parseExpression();
    return new OutputNode(value);
  }

  private parseStructType(): StructTypeNode {
    const key = this.consume(TokenType.StructType, null, "Expect struct type name declaration");
    const name = key.value.replace('$', ''); // Remove '$' from the name
    const fields: { [key: string]: string } = {};

    this.consume(TokenType.FunctionDeclaration, null, "Expect sign '::' after struct type name");
    this.consume(TokenType.Punctuation, '{', "Expect '{' to start struct type");

    do {
      const fieldName = this.consume(TokenType.Identifier, null, "Expect field name").value;
      this.consume(TokenType.Colon, ':', "Expect ':' after field name");
      const fieldType = this.parseType();
      fields[fieldName] = fieldType;
      this.consume(TokenType.Punctuation, ';', "Expect ';' after field declaration");
    } while (this.match(TokenType.Identifier));

    this.consume(TokenType.Punctuation, '}', "Expect '}' to end struct type");

    return new StructTypeNode(name, fields);
  }

  private parseType(): string {
    if (this.match(TokenType.Type)) {
      const type = this.advance().value;

      if (type === 'array' || type === 'object') {
        this.consume(TokenType.LogicOperator, '<', "Expect '<' for complex type");
        const innerType = type === 'array' ? this.parseType() : this.consume(
          TokenType.Identifier,
          null,
          'Expect struct type name without "$" symbol'
        ).value;
        this.consume(TokenType.LogicOperator, '>', "Expect '>' for complex type");
        return `${type}<${innerType}>`;
      }

      return type;
    }

    this.throwErrorWithContext("Expect type declaration");
  }

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

    const snippetStart = Math.max(0, token.position - 40);
    const snippetEnd = Math.min(this.code.length, token.position + 40);

    const snippetBefore = this.code.slice(snippetStart, token.position);
    const unknownChar = this.code[token.position];
    const snippetAfter = this.code.slice(token.position + 1, snippetEnd);

    const leadingEllipsis = snippetStart > 0 ? '...' : '';
    const trailingEllipsis = snippetEnd < this.code.length ? '...' : '';
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
