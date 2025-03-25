import { TokenizationError } from "./errors";

// Enum for token types
export enum TokenType {
  SingleLineComment = "single_line_comment",
  MultiLineComment = "multi_line_comment",
  Whitespace = "whitespace",
  Return = "return",
  AccessOperator = "access_operator",  // Moved up
  Assignment = "assignment",
  Addition = "addition",
  FunctionDeclaration = "function_declaration",
  Identifier = "identifier",
  Number = "number", // Numbers
  String = "string", // String literals
  Operator = "operator",
  Punctuation = "punctuation",
  Equals = "equals",  // Token for "="
  Branching = "branching",
  Loop = "loop",
  Output = "output",
  Colon = "colon",
  Type = "type",  // Types (number, string, bool, etc.)
  LogicOperator = "logic_operator",  // Logical operators
  AtSymbol = "at_symbol", // Symbol @
  None = "none",  // Token for "none" value
  Bool = "bool",  // Boolean values
  Dot = "dot",
  StructType = "struct_type",
}

// Type for regex object and token type
export type TokenPattern = {
  type: TokenType;
  regex: RegExp;
};

export type Token = {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  position: number;  // Add field for position
};

export class Tokenizer {
  private code: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  private tokenPatterns: TokenPattern[] = [
      { type: TokenType.SingleLineComment, regex: /^\/\/[^\n]*/ },
      { type: TokenType.MultiLineComment, regex: /^\/\*[\s\S]*?\*\// },
      { type: TokenType.Whitespace, regex: /^\s+/ },
      { type: TokenType.AtSymbol, regex: /^@/ }, // Symbol @ for functions and return
      { type: TokenType.AccessOperator, regex: /^->/ },  // Access operator -> (moved up)
      { type: TokenType.Assignment, regex: /^<-/ }, // Assignment operator
      { type: TokenType.Addition, regex: /^<>/ }, // Addition or concatenation operator
      { type: TokenType.FunctionDeclaration, regex: /^::/ },
      { type: TokenType.LogicOperator, regex: /^(==|!=|&&|\|\||<=|>=|<|>)/ },  // Logical operators
      { type: TokenType.Operator, regex: /^[+\-*/]/ },
      { type: TokenType.Output, regex: /^\^\^/ },
      { type: TokenType.Branching, regex: /^\?/ },
      { type: TokenType.Equals, regex: /^=/ }, // Token for "="
      { type: TokenType.Loop, regex: /^%/ },
      { type: TokenType.Type, regex: /^(array|void|number|bool|string|object)/ },  // Variable types
      { type: TokenType.None, regex: /^none/ },  // Token for "none" value
      { type: TokenType.Bool, regex: /^(yes|no)/ },  // Boolean variable values
      { type: TokenType.StructType, regex: /^\$[a-zA-Z_][a-zA-Z0-9_]*/ }, // Struct type identifier
      { type: TokenType.Identifier, regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ }, // For identifiers
      { type: TokenType.Number, regex: /^[0-9]+(\.[0-9]+)?/ }, // Support for integers and floating-point numbers
      { type: TokenType.String, regex: /^"[^"]*"/ }, // String literals
      { type: TokenType.Punctuation, regex: /^[\(\)\{\}\[\],;|~&]/ },
      { type: TokenType.Colon, regex: /^:/ },
      { type: TokenType.Dot, regex: /^\./ },
  ];

  constructor(code: string) {
      this.code = code;
  }

  // Main function to get tokens
  public tokenize(): Token[] {
      while (this.position < this.code.length) {
          const token = this.getNextToken();
          if (token) {
              if (token.type !== TokenType.Whitespace && token.type !== TokenType.SingleLineComment && token.type !== TokenType.MultiLineComment) {
                  this.tokens.push(token);
              }
          } else {
              this.throwErrorWithContext(`Unexpected token at line ${this.line}, column ${this.column}`);
          }
      }
      return this.tokens;
  }

  // Returns the next token based on regex patterns
  private getNextToken(): Token | null {
      const remainingCode = this.code.slice(this.position);

      for (const pattern of this.tokenPatterns) {
          const match = remainingCode.match(pattern.regex);
          if (match) {
              const tokenValue = match[0];
              const token: Token = {
                  type: pattern.type,
                  value: tokenValue,
                  line: this.line,
                  column: this.column,
                  position: this.position  // Save current position
              };

              this.updatePosition(tokenValue);
              return token;
          }
      }

      return null;
  }

  // Updates cursor position after processing a token
  private updatePosition(tokenValue: string): void {
      for (const char of tokenValue) {
          if (char === "\n") {
              this.line++;
              this.column = 1;  // Return to the beginning of the new line
          } else {
              this.column++;
          }
      }
      this.position += tokenValue.length;
  }

  // Throws an error with context (snippet of code before and after the token)
  private throwErrorWithContext(message: string): void {
    const snippetStart = Math.max(0, this.position - 40); 
    const snippetEnd = Math.min(this.code.length, this.position + 40); 

    const snippetBefore = this.code.slice(snippetStart, this.position);
    const unknownChar = this.code[this.position];
    const snippetAfter = this.code.slice(this.position + 1, snippetEnd);

    const leadingEllipsis = snippetStart > 0 ? '...' : ''; 
    const trailingEllipsis = snippetEnd < this.code.length ? '...' : ''; 

    const errorSnippet = `${leadingEllipsis}${snippetBefore}[${unknownChar}]${snippetAfter}${trailingEllipsis}`; 

    throw new TokenizationError(message, errorSnippet, this.line, this.column, unknownChar);
  }
}

// Usage of Tokenizer
/*
const code = `
@main::none -> void |
  +a~number;
  <-a = 10.5;
  +obj~object;
  <-obj = (name: "Test", value: 123);
  +b~number;
  <-b = a -> value;
  ^^ "Hello, World!";
~
`;

function logTokens(tokens: Token[]): void {
  console.log('[');
  tokens.forEach(token => console.log(token.value));
  console.log(']');
}

const tokenizer = new Tokenizer(code);
try {
  const tokens = tokenizer.tokenize();
  logTokens(tokens)
  console.log(tokens);
} catch (e) {
  console.error(e.message);
}
*/