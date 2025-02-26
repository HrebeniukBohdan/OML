/*
*
*	<program> ::= <function_block> | <function_block> <program>
*
*	<function_block> ::= "@" <identifier> "::" <parameter_block> "->" <type> "|" <instruction_block> "~"
*
*	<parameter_block> ::= "<" <parameter_list> ">" | "none"
*
*	<parameter_list> ::= <parameter> | <parameter> "&" <parameter_list>
*
*	<parameter> ::= <identifier> "~" <type>
*
*	<instruction_block> ::= <instruction> | <instruction> ";" <instruction_block>
*
*	<instruction> ::= <declaration> | <assignment> | <output> | <branching> | <loop> | <function_invoke>
*
*	<declaration> ::= "+" <identifier> "~" <type>
*
*	<assignment> ::= "<-" <identifier> "=" <expression>
*
*	<output> ::= "^^" <expression>
*
*	<branching> ::= "?" "[" <expression> "]" "|" <instruction_block> "~" ":" "|" <instruction_block> "~"
*
*	<loop> ::= "%" "[" <expression> "]" "|" <instruction_block> "~"
*
*	<function_invoke> ::= "<>" <identifier> "::" "(" <argument_block> ")"
*
*	<argument_block> ::= <argument_list> | "none"
*
*	<argument_list> ::= <expression> | <expression> "&" <argument_list>
*
*	<expression> ::= <term> | <term> "<>" <expression>
*
*	<term> ::= <identifier> | <number> | "[" <expression> "]"
*
*	<type> ::= "int" | "dec" | "void"
*
*	<identifier> ::= [a-zA-Z_][a-zA-Z0-9_]*
*
*	<number> ::= [0-9]+
*/

type WasmModule = {
    functions: WasmFunction[]
};

type WasmFunction = {
    name: string,
    params: WasmParam[],
    returnType: string,
    locals: string[],
    body: string[]
};

type WasmParam = {
    name: string,
    type: string
};

// Мапа для перетворення типів на WASM-типи
const wasmTypes: { [key: string]: string } = {
    'int': 'i32',
    'dec': 'f32',
    'void': 'void'
};

// Лексер: розбиття коду на токени
const tokenize = (code: string) => {
    const tokens: string[] = [];
    const tokenRegex = /\s*(=>|\||->|<-|\^\^|::|<>|<|>|~|\(|\)|\{|}|&|,|;|=|\[\]|\[|\]|%|\?|:|\.|\+|\-|\*|\/|\|\||@|\w+|\d+)\s*/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(code)) !== null) {
        if (match[0].trim()) tokens.push(match[0].trim());
    }
    return tokens;
};

// Парсер для генерації WASM
export class WasmParser {
    tokens: string[];
    current: number = 0;
    module: WasmModule = { functions: [] };

    constructor(tokens: string[]) {
        this.tokens = tokens;
    }

    parseProgram(): WasmModule {
        while (this.current < this.tokens.length) {
            this.parseFunction();
        }
        return this.module;
    }

    parseFunction(): void {
        this.consume("@");
        const name = this.consume(); // function name
        this.consume("::");
        const params = this.parseParameterList();
        this.consume("->");
        const returnType = wasmTypes[this.consume()];
        this.consume("|");
        const locals: string[] = [];
        const body = this.parseStatementBlock(locals);
        this.consume("~");

        const wasmFunction: WasmFunction = { name, params, returnType, locals, body };
        this.module.functions.push(wasmFunction);
    }

    parseParameterList(): WasmParam[] {
		if (this.tokens[this.current] === 'none') {
			this.consume('none');
			return [] as WasmParam[];
		}
		
        this.consume("<");
        const parameters: WasmParam[] = [];
        while (this.peek() !== ">") {
            const name = this.consume();
            this.consume("~");
            const type = wasmTypes[this.consume()];
            parameters.push({ name, type });
            if (this.peek() === "&") this.consume("&");
        }
        this.consume(">");
        return parameters;
    }

    parseStatementBlock(locals: string[]): string[] {
        const statements: string[] = [];
        while (this.peek() !== "~" && this.peek() !== ":") {
            statements.push(...this.parseStatement(locals));
        }
        return statements;
    }

    parseStatement(locals: string[]): string[] {
      let statement: string[]; 
          if (this.peek() === "+") statement = this.parseDeclaration(locals); else
          if (this.peek() === "<-") statement = this.parseAssignment(); else
          if (this.peek() === "^^") statement = this.parseOutput(); else
          if (this.peek() === "?") statement = this.parseIf(locals); else
          if (this.peek() === "%") statement = this.parseWhile(locals); else
          if (this.peek() === "<>") statement = this.parseFunctionCall(); else
          this.throwUnexpectedTokenError();

      if (this.currentToken() !== '~') this.consume(";");

      return statement;
    }
	
    throwUnexpectedTokenError(): never {
      const unexpectedToken = this.peek();
      const prevToken = this.tokens[this.current - 1];
      const nextToken = this.tokens[this.current + 1];
      console.log(unexpectedToken);
      throw new Error(`Unknown statement: ${prevToken} ${unexpectedToken} ${nextToken}`);
    }

    parseDeclaration(locals: string[]): string[] {
        this.consume("+");
        const name = this.consume();
        this.consume("~");
        const varType = wasmTypes[this.consume()];
        locals.push(name);
        return [];  // декларації не генерують код, але змінні зберігаються в locals
    }

    parseAssignment(): string[] {
        this.consume("<-");
        const name = this.consume();
        this.consume("=");
        const value = this.parseExpression();
        return [
            ...value,
            `local.set $${name}`
        ];
    }

    parseOutput(): string[] {
        this.consume("^^");
        const value = this.parseExpression();
        return [
            ...value,
            'call $print'  // припустимо, є вбудована функція `print`
        ];
    }

    parseIf(locals: string[]): string[] {
        this.consume("?");
        this.consume("[");
        const condition = this.parseExpression();
        this.consume("]");
        this.consume("|");
        const thenBranch = this.parseStatementBlock(locals);
        this.consume("~");
        this.consume(":");
        this.consume("|");
        const elseBranch = this.parseStatementBlock(locals);
        this.consume("~");
        return [
            ...condition,
            'if',
            ...thenBranch,
            'else',
            ...elseBranch,
            'end'
        ];
    }

    parseWhile(locals: string[]): string[] {
        this.consume("%");
        this.consume("[");
        const condition = this.parseExpression();
        this.consume("]");
        this.consume("|");
        const body = this.parseStatementBlock(locals);
        this.consume("~");
        return [
            'block',  // початок блоку
            'loop',   // початок циклу
            ...condition,
            'br_if 1',  // вихід з блоку, якщо умова хибна
            ...body,
            'br 0',  // повторення циклу
            'end',   // кінець циклу
            'end'    // кінець блоку
        ];
    }

    parseFunctionCall(): string[] {
        this.consume("<>");
        const name = this.consume();
        this.consume("::");
        this.consume("(");
        const args = this.parseArgumentList();
        this.consume(")");
        return [
            ...args,
            `call $${name}`
        ];
    }

    parseArgumentList(): string[] {
        const args: string[] = [];
        while (this.peek() !== ")") {
            args.push(...this.parseExpression());
            if (this.peek() === "&") this.consume("&");
        }
        return args;
    }

    parseExpression(): string[] {
        let left = this.parseTerm();
        while (["<>", "+", "-", "*", "/"].includes(this.peek())) {
            const operator = this.consume();
            const right = this.parseTerm();
            left = [
                ...left,
                ...right,
                this.translateOperator(operator)
            ];
        }
        return left;
    }

    parseTerm(): string[] {
        if (this.isNumber(this.peek())) {
            return [`i32.const ${this.consume()}`];
        } else {
            return [`local.get $${this.consume()}`];
        }
    }

    translateOperator(operator: string): string {
        switch (operator) {
            case "+": return "i32.add";
            case "-": return "i32.sub";
            case "*": return "i32.mul";
            case "/": return "i32.div_s";
			case "<>": return "i32.add";
            default: throw new Error(`Unknown operator: ${operator}`);
        }
    }

    consume(expected?: string): string {
        const token = this.tokens[this.current];
        if (expected && token !== expected) {
            throw new Error(`Expected '${expected}', but got '${token}'; Token index: ${this.current}`);
        }
        this.current++;
        return token;
    }

    peek(): string {
        return this.tokens[this.current];
    }

    currentToken(): string {
      return this.tokens[this.current];
    }

    isNumber(token: string): boolean {
        return !isNaN(parseInt(token, 10));
    }
}

// Використання парсера для генерації WASM
const code = `
@add_numbers::<a~int & b~int> -> int |
    +result~int;
    <-result = a <> b;
    ^^result;
~

@main::none -> void |
    <>add_numbers::(5 & 10);
    % [5] |
        ? [a <> 10] |
            +flag~int;
            <-flag = 1;
        ~ : |
            +flag~int;
            <-flag = 0;
        ~
    ~
~
`;

function printTokens(tokens: string[]): void {
  console.log("Tokens: [");
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    console.log(` ${index} - '${token}'`);
  }
  console.log("]");
}

const tokens = tokenize(code);
printTokens(tokens);  // Доданий вивід для перевірки токенів
const parser = new WasmParser(tokens);
const wasmModule = parser.parseProgram();
console.log(JSON.stringify(wasmModule, null, 2));
