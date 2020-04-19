
class Token {
    constructor(type, value, rawlength) {
        this.type = type;
        this.value = value;
        this.rawlength = rawlength;
    }
}

Token.LPAREN = Symbol('LPAREN');
Token.RPAREN = Symbol('RPAREN');
Token.STRING = Symbol('STRING');
Token.SYMBOL = Symbol('SYMBOL');
Token.NUMBER = Symbol('NUMBER');


const TSTATE_BASE = Symbol('TSTATE_BASE');
const TSTATE_STRING = Symbol('TSTATE_STRING');
const TSTATE_NUMBER = Symbol('TSTATE_NUMBER');
const TSTATE_SYMBOL = Symbol('TSTATE_SYMBOL');
const TSTATE_ESCAPE = Symbol('TSTATE_ESCAPE');

class Tokenizer {
    constructor(str) {
        this.str = str;
    }

    *tokenize() {
        var value = "";

        this.lineCount = 0;
        this.lineCharCount = 0;
        this.charCount = 0;

        var state = TSTATE_BASE;

        while(this.charCount < this.str.length) {
            let char = this.str.charAt(this.charCount);

            switch(state) {
                case TSTATE_BASE:
                    if(char.trim() == '')
                        break;

                    switch(char) {
                        case '(':
                            yield new Token(Token.LPAREN, '(', 1);
                            break;
                        case ')':
                            yield new Token(Token.RPAREN, ')', 1);
                            break;
                        case '"':
                            state = TSTATE_STRING;
                            break;
                        case '-':
                            if(/\d/.test(this.peek())){
                                value += char;
                                state = TSTATE_NUMBER;
                            } else {
                                value += char;
                                state = TSTATE_SYMBOL;
                            }
                            break;
                        default:
                            if(/\d/.test(char))
                                state = TSTATE_NUMBER;
                            else
                                state = TSTATE_SYMBOL;
                            value += char;
                    }
                    break;
                case TSTATE_STRING:
                    switch(char) {
                        case '\\':
                            state = TSTATE_ESCAPE;
                            break;
                        case '"':
                            state = TSTATE_BASE;
                            yield new Token(
                                Token.STRING, value, value.length+2);
                            value = '';
                            break;
                        default:
                            value += char;
                    }
                    break;
                case TSTATE_NUMBER:
                    // numbers are  decimal floats with a possible exponent,
                    // e.g. 6.022e23
                    if(/[\d\.e+-]/.test(char)) {
                        value += char;
                    } else if(char.trim() == '') {
                        state = TSTATE_BASE;
                        yield new Token(
                            Token.NUMBER,
                            Number.parseFloat(value),
                            value.length);
                        value = '';
                    } else if(char == ')') {
                        state = TSTATE_BASE;
                        yield new Token(
                            Token.NUMBER,
                            Number.parseFloat(value),
                            value.length);
                        value = '';
                        yield new Token(Token.RPAREN, ')', 1);
                    } else {
                        throw new TokenizerError(this, "Unexpected character in numeric literal")
                    }

                    break;
                case TSTATE_SYMBOL:
                    if(char.trim() == '') {
                        state = TSTATE_BASE;
                        yield new Token(Token.SYMBOL, Symbol(value), value.length);
                        value = '';
                    } else if (char == ')') {
                        state = TSTATE_BASE;
                        yield new Token(Token.SYMBOL, Symbol(value), value.length);
                        value = '';
                        yield new Token(Token.RPAREN, ')', 1);
                    } else {
                        value += char;
                    }
                    break;
                case TSTATE_ESCAPE:
                    value += char;
                    state = TSTATE_STRING;
                    break;
            }
            this.updateCounts(char);
        } // end while loop
    }

    peek() {
        return this.str.charAt(this.charCount+1);
    }

    updateCounts(char) {
        this.charCount++;
        this.lineCharCount++;
        if(char == '\n') {
            this.lineCount++;
            this.lineCharCount = -1;
        }
    }
}

class TokenizerError extends Error {
    constructor(tokenizer, message) {
        var lines = tokenizer.str.split('\n');
        var line = lines[tokenizer.lineCount];
        var pointer = '-'.repeat(tokenizer.lineCharCount) + '^';
        super(`${message}
Line ${tokenizer.lineCount} character ${tokenizer.lineCharCount}
${line}
${pointer}
`);
    }
}

class Parser {
    constructor(str) {
        this.tokenizer = new Tokenizer(str);
        this.tokengen = this.tokenizer.tokenize();
    }

    next() {
        var result = this.tokengen.next();
        if(!result.done) {
            return result.value;
        }
    }

    expect(token, type) {
        if(token.type == type) {
            // do nothing
        } else {
            throw new ParserError(
                this.tokenizer,
                token,
                `Expected a token of type '${type.description}', found '${token.type.description}'`);
        }
    }

    parse() {
        this.expect(this.next(), Token.LPAREN);
        return this.sexpression();
    }

    sexpression() {
        var result = new Array();
        var token = this.next();
        while(token !== undefined){
            switch(token.type) {
                case Token.RPAREN:
                    return result;
                case Token.LPAREN:
                    result.push(this.sexpression());
                    break;
                default:
                    result.push(token.value);
            }
            token = this.next();
        }
        console.error("How do we get here?");
    }
}


class ParserError extends Error {
    constructor(tokenizer, token, message) {
        var lines = tokenizer.str.split('\n');
        var line = lines[tokenizer.lineCount];
        var pointer = '-'.repeat(tokenizer.lineCharCount - token.rawlength)
            + '^';
        super(`${message}
Line ${tokenizer.lineCount} character ${tokenizer.lineCharCount}
${line}
${pointer}
`);
    }
}

var p = new Parser('(-6.022e23 sym1 "string value" sym2 (sym3))');

console.log(p.parse());


class Environment extends Map {

    constructor(...args) {
        super(...args);
        this._parent = null;
    }

    get(key) {
        if(this.has(key)) {
            return super.get(key);
        } else if(this._parent != null) {
            return this._parent.get(key);
        } else {
            return; // returns undefined
        }
    }

    get parent() {
        return this._parent;
    }

    set parent(parent) {
        this._parent = parent;
    }

}


const eval = (sexpression, environment) => {

}

const apply = (fn, args) => {

}
