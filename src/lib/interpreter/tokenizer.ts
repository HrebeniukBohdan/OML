import { TokenizationError } from "./errors";

// Enum для типів токенів
export enum TokenType {
  SingleLineComment = "single_line_comment",
  MultiLineComment = "multi_line_comment",
  Whitespace = "whitespace",
  Return = "return",
  AccessOperator = "access_operator",  // Переміщено вгору
  Assignment = "assignment",
  Addition = "addition",
  FunctionDeclaration = "function_declaration",
  Identifier = "identifier",
  Number = "number", // Числа
  String = "string", // Літерали для рядків
  Operator = "operator",
  Punctuation = "punctuation",
  Equals = "equals",  // Токен для "="
  Branching = "branching",
  Loop = "loop",
  Output = "output",
  Colon = "colon",
  Type = "type",  // Типи (number, string, bool і т.д.)
  LogicOperator = "logic_operator",  // Логічні оператори
  AtSymbol = "at_symbol", // Символ @
  None = "none",  // Токен для значення "none"
  Bool = "bool",  // Логічні значення
  Dot = "dot"
}

// Тип для об'єкта регулярного виразу і типу токена
export type TokenPattern = {
  type: TokenType;
  regex: RegExp;
};

export type Token = {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  position: number;  // Додаємо поле для позиції
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
      { type: TokenType.AtSymbol, regex: /^@/ }, // Символ @ для функцій і повернення
      { type: TokenType.AccessOperator, regex: /^->/ },  // Оператор доступу -> (переміщено вгору)
      { type: TokenType.Assignment, regex: /^<-/ }, // Оператор присвоєння
      { type: TokenType.Addition, regex: /^<>/ }, // Оператор додавання або конкатенації
      { type: TokenType.FunctionDeclaration, regex: /^::/ },
      { type: TokenType.LogicOperator, regex: /^(==|!=|&&|\|\||<=|>=|<|>)/ },  // Логічні оператори
      { type: TokenType.Operator, regex: /^[+\-*/]/ },
      { type: TokenType.Output, regex: /^\^\^/ },
      { type: TokenType.Branching, regex: /^\?/ },
      { type: TokenType.Equals, regex: /^=/ }, // Токен для "="
      { type: TokenType.Loop, regex: /^%/ },
      { type: TokenType.Type, regex: /^(void|number|bool|string|object)/ },  // Типи змінних
      { type: TokenType.None, regex: /^none/ },  // Токен для значення "none"
      { type: TokenType.Bool, regex: /^(yes|no)/ },  // Значення логічних змінних
      { type: TokenType.Identifier, regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ }, // Для ідентифікаторів
      { type: TokenType.Number, regex: /^[0-9]+(\.[0-9]+)?/ }, // Підтримка цілих і чисел з плаваючою комою
      { type: TokenType.String, regex: /^"[^"]*"/ }, // Літерали для рядків
      { type: TokenType.Punctuation, regex: /^[\(\)\{\}\[\],;|~&]/ },
      { type: TokenType.Colon, regex: /^:/ },
      { type: TokenType.Dot, regex: /^\./ },
  ];

  constructor(code: string) {
      this.code = code;
  }

  // Основна функція для отримання токенів
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

  // Повертає наступний токен на основі регулярних виразів
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
                  position: this.position  // Зберігаємо поточну позицію
              };

              this.updatePosition(tokenValue);
              return token;
          }
      }

      return null;
  }

  // Оновлює позицію курсору після обробки токена
  private updatePosition(tokenValue: string): void {
      for (const char of tokenValue) {
          if (char === "\n") {
              this.line++;
              this.column = 1;  // Повертаємось на початок нового рядка
          } else {
              this.column++;
          }
      }
      this.position += tokenValue.length;
  }

  // Викидає помилку з контекстом (шматком коду до і після токена)
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

// Використання Tokenizer
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
