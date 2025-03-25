import { Tokenizer, Token, TokenType } from './tokenizer';
import { Parser } from './parser';
import { SemanticAnalyzer } from './semantic';
import { OMLToTypeScriptVisitor } from './visitors';
import { ASTNode, ProgramNode } from './ast';

describe("OML Language Integration Tests", () => {

  it("should tokenize, parse, analyze, and transpile a simple variable declaration", () => {
    const code = `
      +a~number;
      <-a = 5;
      ^^ a;
    `;

    // Tokenization
    const tokenizer = new Tokenizer(code);
    const tokens: Token[] = tokenizer.tokenize();
    const expectedTokens = [
      { type: TokenType.Operator, value: '+', line: 2, column: 7, position: 7 },
      { type: TokenType.Identifier, value: 'a', line: 2, column: 8, position: 8 },
      { type: TokenType.Punctuation, value: '~', line: 2, column: 9, position: 9 },
      { type: TokenType.Type, value: 'number', line: 2, column: 10, position: 10 },
      { type: TokenType.Punctuation, value: ';', line: 2, column: 16, position: 16 },
      { type: TokenType.Assignment, value: '<-', line: 3, column: 7, position: 24 },
      { type: TokenType.Identifier, value: 'a', line: 3, column: 9, position: 26 },
      { type: TokenType.Equals, value: '=', line: 3, column: 11, position: 28 },
      { type: TokenType.Number, value: '5', line: 3, column: 13, position: 30 },
      { type: TokenType.Punctuation, value: ';', line: 3, column: 14, position: 31 },
      { type: TokenType.Output, value: '^^', line: 4, column: 7, position: 39 },
      { type: TokenType.Identifier, value: 'a', line: 4, column: 10, position: 42 },
      { type: TokenType.Punctuation, value: ';', line: 4, column: 11, position: 43 }
    ];
    expect(tokens.map(({ type, value, line, column, position }) => ({ type, value, line, column, position }))).toEqual(expectedTokens);

    // Parsing
    const parser = new Parser(code, tokens);
    const ast: ProgramNode = parser.parse() as ProgramNode;

    // Semantic analysis
    const semanticAnalyzer = new SemanticAnalyzer();
    expect(() => semanticAnalyzer.visitProgramNode(ast)).not.toThrow();

    // Transpilation
    const tsVisitor = new OMLToTypeScriptVisitor();
    const transpiledCode = tsVisitor.visitProgramNode(ast);
    const expectedTranspiledCode = `
      let a: number;
      a = 5;
      console.log(a);
    `;

    expect(
      transpiledCode.replace(/ |\n/g, '')
    ).toBe(expectedTranspiledCode.replace(/ |\n/g, ''));
  });

  it("should handle functions with branching and recursion", () => {
    const code = `
      @factorial::<n~number> -> number |
        ? [n <= 1] |
          @factorial <- 1;
        ~ : |
          <-n = n - 1;
          @factorial <- n * <>factorial::(n);
        ~
      ~
    `;

    // Tokenization
    const tokenizer = new Tokenizer(code);
    const tokens: Token[] = tokenizer.tokenize();
    expect(tokens.length).toBeGreaterThan(0);

    // Parsing
    const parser = new Parser(code, tokens);
    const ast: ProgramNode = parser.parse() as ProgramNode;
    expect(ast).toBeDefined();

    // Semantic analysis
    const semanticAnalyzer = new SemanticAnalyzer();
    expect(() => semanticAnalyzer.visitProgramNode(ast)).not.toThrow();

    // Transpilation
    const tsVisitor = new OMLToTypeScriptVisitor();
    const transpiledCode = tsVisitor.visitProgramNode(ast);
    const expectedTranspiledCode = `
      function factorial(n: number): number {
        if (n <= 1) {
          return 1;
        } else {
          n = n - 1;
          return n * factorial(n);
        }
      }
    `;

    expect(
      transpiledCode.replace(/ |\n/g, '')
    ).toBe(expectedTranspiledCode.replace(/ |\n/g, ''));
  });

  it("should catch undeclared variable error", () => {
    const code = `
      +a~number;
      <-b = a + 1; // b is undeclared
    `;

    // Tokenization
    const tokenizer = new Tokenizer(code);
    const tokens: Token[] = tokenizer.tokenize();
    const parser = new Parser(code, tokens);
    const ast: ASTNode = parser.parse();

    const semanticAnalyzer = new SemanticAnalyzer();
    expect(() => semanticAnalyzer.visitProgramNode(ast as ProgramNode)).toThrow("Undeclared variable 'b'");
  });
});