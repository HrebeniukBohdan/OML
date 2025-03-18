import { ASTNode, ProgramNode } from "./ast";
import { Parser } from "./parser";
import { SemanticAnalyzer } from "./semantic";
import { Token, Tokenizer } from "./tokenizer";
import { OMLInterpreter } from "./visitors";

describe("OML Interpreter Functional Tests", () => {

  function createInterpreter(code: string): OMLInterpreter {
    // Tokenization
    const tokenizer = new Tokenizer(code);
    const tokens: Token[] = tokenizer.tokenize();
    // Parsing
    const parser = new Parser(code, tokens);
    const ast: ASTNode = parser.parse();
    // Semantic analysis
    const semanticAnalyzer = new SemanticAnalyzer();
    semanticAnalyzer.visitProgramNode(ast as ProgramNode);
    const interpreter = new OMLInterpreter();
    interpreter.visitProgramNode(ast as ProgramNode);

    return interpreter;
  }

  describe("Tokenization tests", () => {
    it("should catch unexpected token error", () => {
      const code = `
        +a~number;
        $ // $ is unknown token
      `;

      expect(() => createInterpreter(code)).toThrow(/Unexpected token/);
    });
  });

  describe("Semantic Analyzer tests", () => {
    it("should catch undeclared variable error", () => {
      const code = `
        +a~number;
        <-b = a + 1; // b is undeclared
      `;

      expect(() => createInterpreter(code)).toThrow("Undeclared variable 'b'");
    });

    it("should catch duplicate variable declaration error", () => {
      const code = `
        +a~number;
        +a~number; // a is already declared
      `;

      expect(() => createInterpreter(code)).toThrow("Variable 'a' is already declared.");
    });

    it("should catch type mismatch in variable assignment", () => {
      const code = `
        +a~number;
        <-a = "hello"; // a is a number, assigning string
      `;

      expect(() => createInterpreter(code)).toThrow("Type mismatch: expected 'number', got 'string' in assignment to 'a'.");
    });

    it("should catch type mismatch in binary expression", () => {
      const code = `
        +a~number;
        +b~string;
        <-a = a + b; // a is number, b is string
      `;

      expect(() => createInterpreter(code)).toThrow("Type mismatch in binary expression: left is 'number', right is 'string'.");
    });

    it("should catch invalid return type in function", () => {
      const code = `
        @myFunc::none -> number |
          @myFunc <- "invalid return"; // Return type should be number
        ~
      `;

      expect(() => createInterpreter(code)).toThrow("Return type mismatch: expected 'number', got 'string'.");
    });

    it("should catch parameter type mismatch in function call", () => {
      const code = `
        @myFunc::<a~number> -> number |
          @myFunc <- a;
        ~
        +b~string;
        <>myFunc::(b); // b is string, should be number
      `;

      expect(() => createInterpreter(code)).toThrow("Type mismatch in function call to 'myFunc': expected 'number', got 'string'.");
    });

    it("should catch redeclaration of parameter within function scope", () => {
      const code = `
        @myFunc::<a~number> -> void |
          +a~string; // Redeclaring parameter a
        ~
      `;

      expect(() => createInterpreter(code)).toThrow("Variable 'a' is already declared.");
    });

    it("should catch invalid operator usage in binary expression", () => {
      const code = `
        +a~bool;
        +b~bool;
        <-a = a + b; // + operator is invalid for booleans
      `;

      expect(() => createInterpreter(code)).toThrow("Operator '+' requires numeric operands.");
    });

    it("should catch missing return in function with non-void return type", () => {
      const code = `
        @myFunc::none -> number |
          // Missing return statement
        ~
      `;

      expect(() => createInterpreter(code)).toThrow("Missing return statement in function 'myFunc'.");
    });
  });

  describe("OML Interpreter Constructions tests", () => {

    describe("Variable definition", () => {

      it("should be defined and equal 5", () => {
        const code = `
          +a~number;
          <-a = 5;
          ^^a;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('5');
      });

      it("should be defined with default assignment and equal 10", () => {
        const code = `
          +a~number = 3 * 2 + 4;
          ^^a;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('10');
      });
  
      it("should be defined and equal yes", () => {
        const code = `
          +a~bool;
          <-a = yes;
          ^^a;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('true');
      });
  
      it("should be defined and equal 'text'", () => {
        const code = `
          +a~string;
          <-a = "text";
          ^^a;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('text');
      });

    });

    describe("Boolean literals", () => {
      it("should recognize 'yes' as true", () => {
          const code = `
              +a~bool;
              <-a = yes;
              ^^a;
          `;
          const output = createInterpreter(code).getOutput();
          expect(output).toBe('true');
      });
  
      it("should recognize 'no' as false", () => {
          const code = `
              +a~bool;
              <-a = no;
              ^^a;
          `;
          const output = createInterpreter(code).getOutput();
          expect(output).toBe('false');
      });

      it("should calculate, recognize 'no' as false and be equal true", () => {
        const code = `
            +a~bool;
            +b~number;
            <-b = 100;
            <-a = b < 10;
            ^^ a == no;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('true');
      });
    });

    describe("String construction tests", () => {
      it("should create empty string witn length equal 5", () => {
          const code = `
              +result~string;
              <-result = string(5);
              ^^result;
          `;
          const output = createInterpreter(code).getOutput();
          expect(output.length).toBe(5);
          expect(output).toBe('     ');
      });

      it("should create empty string witn length equal 1", () => {
        const code = `
            +result~string;
            <-result = string(3 * 2 - 5);
            ^^result;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output.length).toBe(1);
        expect(output).toBe(' ');
      });

      it("should create string witn text 'Hello, world'", () => {
        const code = `
            +result~string;
            <-result = string("Hello, world");
            ^^result;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output.length).toBe(12);
        expect(output).toBe('Hello, world');
      });

      it("should catch invalid string length parameter", () => {
        const code = `
            +result~string;
            <-result = string(-5);
            ^^result;
        `;
         
        expect(() => createInterpreter(code)).toThrow("String length must be greater than 0");
      });

      it("should catch invalid parameter type", () => {
        const code = `
            +result~string;
            <-result = string(yes);
            ^^result;
        `;
         
        expect(() => createInterpreter(code)).toThrow("String constructor expects a number or string argument, but got bool.");
      });
    });

    describe("String concatenation tests", () => {
      it("should concatenate two strings", () => {
          const code = `
              +result~string;
              <-result = "Hello, " . "world!";
              ^^result;
          `;
          const output = createInterpreter(code).getOutput();
          expect(output).toBe('Hello, world!');
      });
  
      it("should concatenate string with number", () => {
          const code = `
              +result~string;
              <-result = "The answer is " . 42;
              ^^result;
          `;
          const output = createInterpreter(code).getOutput();
          expect(output).toBe('The answer is 42');
      });
  
      it("should concatenate string with boolean", () => {
          const code = `
              +result~string;
              <-result = "This is " . yes;
              ^^result;
          `;
          const output = createInterpreter(code).getOutput();
          expect(output).toBe('This is true');
      });

      it("should concatenate string with 3 vars of different type", () => {
        const code = `
            +result~string;
            <-result = "This is " . yes . " and " . 10;
            ^^result;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('This is true and 10');
      });
    });

    describe("String manipulation tests", () => {
      it("should access and modify a character in a string", () => {
        const code = `
          +str~string;
          <-str = "Hello";
          str->(1) = "a";
          ^^str;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('Hallo');
      });
    
      it("should throw an error for out of bounds index access", () => {
        const code = `
          +str~string;
          <-str = "Hello";
          str->(10) = "a";
          ^^str;
        `;
        expect(() => createInterpreter(code)).toThrow("Index out of bounds");
      });
    
      it("should throw an error for invalid character assignment", () => {
        const code = `
          +str~string;
          <-str = "Hello";
          str->(1) = "abc";
          ^^str;
        `;
        expect(() => createInterpreter(code)).toThrow("Value for string assignment must be a single character, but got 'abc'.");
      });

      it("should access a character in a string", () => {
        const code = `
          +str~string = "Hello";
          ^^str->(4);
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('o');
      });
    
      /*
      it("should access the length of a string", () => {
        const code = `
          +str~string;
          <-str = "Hello";
          +len~number;
          <-len = str->length;
          ^^len;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('5');
      });
    
      it("should call substring method on a string", () => {
        const code = `
          +str~string;
          <-str = "Hello, world";
          +sub~string;
          <-sub = str->substring(7, 12);
          ^^sub;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('world');
      });
    
      it("should call replace method on a string", () => {
        const code = `
          +str~string;
          <-str = "Hello, world";
          +replaced~string;
          <-replaced = str->replace("world", "OML");
          ^^replaced;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('Hello, OML');
      });
    
      it("should call toUpper method on a string", () => {
        const code = `
          +str~string;
          <-str = "Hello, world";
          +upper~string;
          <-upper = str->toUpper();
          ^^upper;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('HELLO, WORLD');
      });
    
      it("should call toLower method on a string", () => {
        const code = `
          +str~string;
          <-str = "HELLO, WORLD";
          +lower~string;
          <-lower = str->toLower();
          ^^lower;
        `;
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('hello, world');
      });
      */
    });
  
    describe("Math expressions", () => {

      it("should calculate addition of two numbers", () => {
        const code = `
          +a~number;
          +b~number;
          <-a = 8;
          <-b = 12;
          +result~number;
          <-result = a + b;
          ^^result;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('20');
      });
  
      it("should calculate subtraction of two numbers", () => {
        const code = `
          +a~number;
          +b~number;
          <-a = 15;
          <-b = 5;
          +result~number;
          <-result = a - b;
          ^^result;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('10');
      });
  
      it("should calculate multiplication of two numbers", () => {
        const code = `
          +a~number;
          +b~number;
          <-a = 6;
          <-b = 7;
          +result~number;
          <-result = a * b;
          ^^result;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('42');
      });
  
      it("should calculate division of two numbers", () => {
        const code = `
          +a~number;
          +b~number;
          <-a = 20;
          <-b = 4;
          +result~number;
          <-result = a / b;
          ^^result;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('5');
      });
  
      it("should calculate expression with parentheses for correct order", () => {
        const code = `
          +result~number;
          <-result = (3 + 5) * 2;
          ^^result;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('16');
      });
  
      it("should correctly apply operator precedence without parentheses", () => {
        const code = `
          +result~number;
          <-result = 3 + 5 * 2;
          ^^result;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('13');
      });
  
      it("should calculate a complex nested expression", () => {
        const code = `
          +result~number;
          <-result = (8 / 4) + (3 * (2 + 1));
          ^^result;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('11');
      });
  
      it("should handle negative numbers in expressions", () => {
        const code = `
          +a~number;
          +result~number;
          <-a = -5;
          <-result = a * 3;
          ^^result;
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('-15');
      });
      
    });
  
    describe("Conditions", () => {

      it("should execute true branch when condition is true", () => {
        const code = `
          +a~number;
          <-a = 10;
          ?[a > 5] | 
            +result~string;
            <-result = "Condition is true";
            ^^result;
          ~
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('Condition is true');
      });
  
      it("should execute false branch when condition is false", () => {
        const code = `
          +a~number;
          <-a = 3;
          ?[a > 5] | 
            +result~string;
            <-result = "Condition is true";
          ~ : |
            +result~string;
            <-result = "Condition is false";
            ^^result;
          ~
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('Condition is false');
      });
  
      it("should handle nested conditions correctly", () => {
        const code = `
          +a~number;
          +b~number;
          <-a = 10;
          <-b = 20;
          ?[a > 5] | 
            ?[b < 15] |
              +result~string;
              <-result = "Both conditions true";
              ^^result;
            ~ : |
              +result~string;
              <-result = "Only first condition true";
              ^^result;
            ~
          ~
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('Only first condition true');
      });
  
      it("should evaluate logical OR condition correctly", () => {
        const code = `
          +a~number;
          <-a = 3;
          +b~number;
          <-b = 10;
          ?[a > 5 || b > 5] | 
            +result~string;
            <-result = "One condition is true";
            ^^result;
          ~
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('One condition is true');
      });
  
      it("should evaluate logical AND condition correctly", () => {
        const code = `
          +a~number;
          <-a = 10;
          +b~number;
          <-b = 15;
          ?[a > 5 && b > 5] | 
            +result~string;
            <-result = "Both conditions are true";
            ^^result;
          ~
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('Both conditions are true');
      });
  
      it("should skip false branch entirely when no false condition", () => {
        const code = `
          +a~number;
          <-a = 8;
          ?[a > 10] | 
            +result~string;
            <-result = "True branch";
            ^^result;
          ~
          ^^ "End of test";
        `;
  
        const output = createInterpreter(code).getOutput();
        expect(output).toBe('End of test');
      });
  
    });

    it("should be defined and equal 5", () => {
      const code = `
        +a~number;
        <-a = 5;
        ^^a;
      `;

      const output = createInterpreter(code).getOutput();
      expect(output).toBe('5');
    });

    /*it("should be defined and equal true", () => {
      const code = `
        +a~bool;
        <-a = true;
        ^^a;
      `;

      const output = createInterpreter(code).getOutput();
      expect(output).toBe('true');
    });*/

    it("should be defined and equal 'text'", () => {
      const code = `
        +a~string;
        <-a = "text";
        ^^a;
      `;

      const output = createInterpreter(code).getOutput();
      expect(output).toBe('text');
    });
  });

  it("should calculate and output sum of two numbers", () => {
    const code = `
      +a~number;
      +b~number;
      <-a = 3;
      <-b = 7;
      +result~number;
      <-result = a + b;
      ^^result;
    `;

    const output = createInterpreter(code).getOutput();
    expect(output).toBe('10');
  });

  it("should calculate and output multiplication result", () => {
    const code = `
      +a~number;
      +b~number;
      <-a = 4;
      <-b = 5;
      +product~number;
      <-product = a * b;
      ^^product;
    `;

    const output = createInterpreter(code).getOutput();
    expect(output).toBe('20');
  });

  it("should correctly handle if-else branching and output 'Greater'", () => {
    const code = `
      +a~number;
      +b~number;
      <-a = 10;
      <-b = 5;
      ?[a > b] |
        ^^ "Greater";
      ~ : | 
        ^^ "Lesser";
      ~
    `;

    const output = createInterpreter(code).getOutput();
    expect(output).toBe('Greater');
  });

  it("should correctly output in a loop", () => {
    const code = `
      +counter~number;
      <-counter = 0;
      +result~string;
      <-result = "Loop";
      %[counter < 3] |
        <-counter = counter + 1;
        ^^counter;
      ~
      ^^result;
    `;

    const output = createInterpreter(code).getOutput();
    expect(output).toBe('1\n2\n3\nLoop');
  });

  it("should return value from function and output result", () => {
    const code = `
      @calculateSum::<a~number & b~number> -> number |
        @calculateSum <- a + b;
      ~
      +result~number;
      <-result = <>calculateSum::(3, 4);
      ^^result;
    `;

    const output = createInterpreter(code).getOutput();
    expect(output).toBe('7');
  });

});