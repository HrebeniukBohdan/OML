import { describe, it, expect } from 'vitest';
import { TokenizationError, SyntaxError } from './errors';

describe('Errors', () => {
    describe('TokenizationError', () => {
        it('should create an instance of TokenizationError with correct properties', () => {
            const message = 'Unexpected token';
            const snippet = 'const x = 10;';
            const line = 1;
            const column = 6;
            const unknownToken = '10';

            const error = new TokenizationError(message, snippet, line, column, unknownToken);

            expect(error).toBeInstanceOf(TokenizationError);
            expect(error.message).toBe(`${message}\nContext:\n${snippet}\nAt line ${line}, column ${column}`);
            expect(error.name).toBe('TokenizationError');
            expect(error.line).toBe(line);
            expect(error.column).toBe(column);
            expect(error.unknownToken).toBe(unknownToken);
        });

        it('should have the correct name property', () => {
            const error = new TokenizationError('', '', 0, 0, '');
            expect(error.name).toBe('TokenizationError');
        });
    });

    describe('SyntaxError', () => {
        it('should create an instance of SyntaxError with correct properties', () => {
            const message = 'Unexpected token';
            const line = 2;
            const column = 4;
            const snippet = 'if (x === 10) {';
            const unexpectedToken = '10';

            const error = new SyntaxError(message, line, column, snippet, unexpectedToken);

            expect(error).toBeInstanceOf(SyntaxError);
            expect(error.message).toBe(`${message}\nAt line ${line}, column ${column}\nContext:\n ${snippet}\n`);
            expect(error.name).toBe('SyntaxError');
            expect(error.line).toBe(line);
            expect(error.column).toBe(column);
            expect(error.unexpectedToken).toBe(unexpectedToken);
        });

        it('should have the correct name property', () => {
            const error = new SyntaxError('', 0, 0, '', '');
            expect(error.name).toBe('SyntaxError');
        });
    });
});