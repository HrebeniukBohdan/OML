import { describe, it, expect } from 'vitest';
import { Tokenizer, TokenType } from './tokenizer';

describe('Tokenizer', () => {

  it('should tokenize function declaration', () => {
    const code = `@main::none -> void |`;
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();

    expect(tokens).toEqual([
      { type: TokenType.AtSymbol, value: '@', line: 1, column: 1, position: 0 },
      { type: TokenType.Identifier, value: 'main', line: 1, column: 2, position: 1 },
      { type: TokenType.FunctionDeclaration, value: '::', line: 1, column: 6, position: 5 },
      { type: TokenType.None, value: 'none', line: 1, column: 8, position: 7 },
      { type: TokenType.AccessOperator, value: '->', line: 1, column: 13, position: 12 },
      { type: TokenType.Type, value: 'void', line: 1, column: 16, position: 15 },
      { type: TokenType.Punctuation, value: '|', line: 1, column: 21, position: 20 },
    ]);
  });

  it('should tokenize variable declaration and assignment', () => {
    const code = `+a~number;\n<-a = 10.5;`;
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();

    expect(tokens).toEqual([
      { type: TokenType.Operator, value: '+', line: 1, column: 1, position: 0 },
      { type: TokenType.Identifier, value: 'a', line: 1, column: 2, position: 1 },
      { type: TokenType.Punctuation, value: '~', line: 1, column: 3, position: 2 },
      { type: TokenType.Type, value: 'number', line: 1, column: 4, position: 3 },
      { type: TokenType.Punctuation, value: ';', line: 1, column: 10, position: 9 },
      { type: TokenType.Assignment, value: '<-', line: 2, column: 1, position: 11 },
      { type: TokenType.Identifier, value: 'a', line: 2, column: 3, position: 13 },
      { type: TokenType.Equals, value: '=', line: 2, column: 5, position: 15 },
      { type: TokenType.Number, value: '10.5', line: 2, column: 7, position: 17 },
      { type: TokenType.Punctuation, value: ';', line: 2, column: 11, position: 21 },
    ]);
  });

  it('should tokenize object creation and access', () => {
    const code = `+obj~object;\n<-obj = (name: "Test", value: 123);\n<-b = a -> value;`;
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();

    expect(tokens).toEqual([
      { type: TokenType.Operator, value: '+', line: 1, column: 1, position: 0 },
      { type: TokenType.Identifier, value: 'obj', line: 1, column: 2, position: 1 },
      { type: TokenType.Punctuation, value: '~', line: 1, column: 5, position: 4 },
      { type: TokenType.Type, value: 'object', line: 1, column: 6, position: 5 },
      { type: TokenType.Punctuation, value: ';', line: 1, column: 12, position: 11 },
      { type: TokenType.Assignment, value: '<-', line: 2, column: 1, position: 13 },
      { type: TokenType.Identifier, value: 'obj', line: 2, column: 3, position: 15 },
      { type: TokenType.Equals, value: '=', line: 2, column: 7, position: 19 },
      { type: TokenType.Punctuation, value: '(', line: 2, column: 9, position: 21 },
      { type: TokenType.Identifier, value: 'name', line: 2, column: 10, position: 22 },
      { type: TokenType.Colon, value: ':', line: 2, column: 14, position: 26 },
      { type: TokenType.String, value: '"Test"', line: 2, column: 16, position: 28 },
      { type: TokenType.Punctuation, value: ',', line: 2, column: 22, position: 34 },
      { type: TokenType.Identifier, value: 'value', line: 2, column: 24, position: 36 },
      { type: TokenType.Colon, value: ':', line: 2, column: 29, position: 41 },
      { type: TokenType.Number, value: '123', line: 2, column: 31, position: 43 },
      { type: TokenType.Punctuation, value: ')', line: 2, column: 34, position: 46 },
      { type: TokenType.Punctuation, value: ';', line: 2, column: 35, position: 47 },
      { type: TokenType.Assignment, value: '<-', line: 3, column: 1, position: 49 },
      { type: TokenType.Identifier, value: 'b', line: 3, column: 3, position: 51 },
      { type: TokenType.Equals, value: '=', line: 3, column: 5, position: 53 },
      { type: TokenType.Identifier, value: 'a', line: 3, column: 7, position: 55 },
      { type: TokenType.AccessOperator, value: '->', line: 3, column: 9, position: 57 },
      { type: TokenType.Identifier, value: 'value', line: 3, column: 12, position: 60 },
      { type: TokenType.Punctuation, value: ';', line: 3, column: 17, position: 65 },
    ]);
  });

  it('should throw an error for unexpected token', () => {
    const code = `+a~number;\n $$ "Invalid Token"`;
    const tokenizer = new Tokenizer(code);

    expect(() => tokenizer.tokenize()).toThrowError(/Unexpected token/);
  });

});
