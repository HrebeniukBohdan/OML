import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { JSONVisitor, OMLInterpreter, OMLToTypeScriptVisitor } from './visitors';
import { SemanticAnalyzer } from './semantic';

const omlCode = `
  $Pet::{ 
    name: string;
    type: string;
    age: number;
  }
  +arr~array<number> = array<number>(1, 2, 3, 4, 5);
  +pets~array<object<Pet>> = array<object<Pet>>(
    (name: "Rex", type: "Dog", age: 8),
    (name: "Mittens", type: "Cat", age: 2),
    (name: "Buddy", type: "Dog", age: 5)
  );

  ^^ "arr:";
  ^^ "length = " . arr -> length;
  ^^ arr;

  ^^ "pets:";
  ^^ "length = " . pets -> length;
`;

`
  +str~string = string("Hello, World!");

  ^^ str -> (7);
  ^^ str -> length;
`;

`
  $myAddress::{ 
    street: string;
    houseNumber: number;
    apptNumber: number;
  }

  $myObj::{ 
    name: string;
    age: number;
    address: object<myAddress>;
  }

  +obj~object<myObj> = (
    name: "Test User",
    age: 25,
    address: ( street: "New-York Avenue", houseNumber: 29, apptNumber: 89 )
  );

  ^^ obj -> name . " is " . obj -> age . " years old.";
  ^^ obj -> address -> street;
  ^^ obj -> address -> houseNumber;
`;

`
  +a~number;

  @abs::<x~number> -> number |
    ? [x >= 0] | 
      @abs <- x;
    ~
    : |
      @abs <- (-x);
    ~
  ~

  @yo::none -> void |
    ^^ "output";
  ~

  @sqrt::<num~number> -> number |
    +a~number;
    <-a = 11;
    
    ? [a >= 10] |
      ^^ "String";
    ~

    ? [num < 0] | 
        @sqrt <- (-1); // Замість NaN
    ~
    
    +approx~number;
    <-approx = num;
    
    +betterApprox~number;
    <-betterApprox = (approx + (num / approx)) / 2;
    
    %[(<>abs::(approx - betterApprox)) > 0.00000001] | 
        <-approx = betterApprox;
        <-betterApprox = (approx + (num / approx)) / 2;
    ~
    
    @sqrt <- betterApprox;
  ~

  @solveQuadratic::<a~number & b~number & c~number> -> void |
      +discriminant~number;
      +x1~number;
      +x2~number;
      
      <-discriminant = (b * b) - (4 * a * c);

      ?[discriminant < 0] | 
          ^^ "No real solutions";
      ~
      ?[discriminant == 0] | 
          <-x1 = (-b) / (2 * a);
          ^^ "One solution: ";
          ^^ x1;
      ~
      ?[discriminant > 0] | 
          <-x1 = ((-b) + <>sqrt::(discriminant)) / (2 * a);
          <-x2 = ((-b) - <>sqrt::(discriminant)) / (2 * a);
          ^^ "Two solutions: ";
          ^^ x1;
          ^^ x2;
      ~
  ~

  //<>solveQuadratic::(2, -7, 6);
  //<>solveQuadratic::(3, -4, 1);
  //<>solveQuadratic::(1, -2, 1);
  //<>solveQuadratic::(1, 1, 7);
  <>solveQuadratic::(1, 7, -8);
`;

/*
`
  +a~number = -5;
  // <-a = -10 -10;
  ^^ a;
`;

`
@main::none -> void |
  +a~number;
  <-a = 10.5;
  +obj~object;
  <-obj = (
    name: "Test",
    address: ( street: "New-York Avenue", houseNumber: 29, apptNumber: 89 ), 
    value: 123
  );
  +b~number;
  <-b = obj -> value;
  <-obj -> value = 1000 + (20 - 300) + 50 * 2;
  <-obj -> address = 1;
  ^^ "Hello, World!";
~
`;

`
@main::none -> void |
  +a~number;
  <-a = 10.5;
  +b~number;
  <-b = a * 2;
  ^^ b - a;
~
`;
*/

// Tokenization
const tokenizer = new Tokenizer(omlCode);
const tokens = tokenizer.tokenize();

// Parsing & AST
const parser = new Parser(omlCode, tokens);
const ast = parser.parse();

// Semantic analysis
const semanticAnalyzer = new SemanticAnalyzer();
ast.accept(semanticAnalyzer);

// JSON & TypeScript code generation
const jsonVisitor = new JSONVisitor();
const jsonAst = ast.accept(jsonVisitor);
const tsVisitor = new OMLToTypeScriptVisitor();
const tsCode = ast.accept(tsVisitor);

// Interpretation
const interpreter = new OMLInterpreter();
ast.accept(interpreter);

// Console output
console.log(JSON.stringify(jsonAst, null, 2));
console.log();
console.log(tsCode);
console.log();
console.log(interpreter.getOutput());