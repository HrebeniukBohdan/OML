export class TokenizationError extends Error {
  public line: number;
  public column: number;
  public unknownToken: string;

  constructor(message: string, snippet: string, line: number, column: number, unknownToken: string) {
    super(`${message}\nContext:\n${snippet}\nAt line ${line}, column ${column}`);
    this.name = 'TokenizationError';
    this.line = line;
    this.column = column;
    this.unknownToken = unknownToken;
  }
}

/**
 * Represents a syntax error encountered during interpretation.
 * Extends the built-in `Error` class to include additional context
 * such as the line and column number, and the unexpected token.
 */
export class SyntaxError extends Error {
  /**
   * The line number where the error occurred.
   */
  public line: number;

  /**
   * The column number where the error occurred.
   */
  public column: number;

  /**
   * The unexpected token that caused the error.
   */
  public unexpectedToken: string;

  /**
   * Creates an instance of `SyntaxError`.
   * 
   * @param message - A description of the error.
   * @param line - The line number where the error occurred.
   * @param column - The column number where the error occurred.
   * @param snippet - A snippet of the code where the error occurred.
   * @param unexpectedToken - The unexpected token that caused the error.
   */
  constructor(message: string, line: number, column: number, snippet: string, unexpectedToken: string) {
    super(`${message}\nAt line ${line}, column ${column}\nContext:\n ${snippet}\n`);
    this.name = 'SyntaxError';
    this.line = line;
    this.column = column;
    this.unexpectedToken = unexpectedToken;
  }
}