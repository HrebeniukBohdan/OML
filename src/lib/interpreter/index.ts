import { Parser } from "./parser";
import { SemanticAnalyzer } from "./semantic";
import { Tokenizer } from "./tokenizer";
import { OMLInterpreter } from "./visitors";

export class OML {
    private output: string;

    constructor(private code: string) {}
    
    public exec() {
        // Tokenization
        const tokenizer = new Tokenizer(this.code);
        const tokens = tokenizer.tokenize();
    
        // Parsing & AST
        const parser = new Parser(this.code, tokens);
        const ast = parser.parse();
    
        // Semantic analysis
        const semanticAnalyzer = new SemanticAnalyzer();
        ast.accept(semanticAnalyzer);

        // Interpretation
        const interpreter = new OMLInterpreter();
        ast.accept(interpreter);
        
        this.output = interpreter.getOutput();
    }

    public getOutput() {
        return this.output;
    }
}