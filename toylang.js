
class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
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

            //console.log('tokenizing...', state);

            switch(state) {
                case TSTATE_BASE:
                    if(char.trim() == '')
                        break;

                    switch(char) {
                        case '(':
                            yield new Token(Token.LPAREN, '(');
                            break;
                        case ')':
                            yield new Token(Token.RPAREN, ')');
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
                            yield new Token(Token.STRING, value);
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
                        yield new Token(Token.NUMBER, Number.parseFloat(value));
                        value = ""
                    } else if(char == ')') {
                        state = TSTATE_BASE;
                        yield new Token(Token.NUMBER, Number.parseFloat(value));
                        value = '';
                        yield new Token(Token.RPAREN, ')');
                    } else {
                        throw new TokenizerError(this, "Unexpected character in numeric literal")
                    }

                    break;
                case TSTATE_SYMBOL:
                    if(char.trim() == '') {
                        state = TSTATE_BASE;
                        yield new Token(Token.SYMBOL, value);
                        value = '';
                    } else if (char == ')') {
                        state = TSTATE_BASE;
                        yield new Token(Token.SYMBOL, value);
                        value = '';
                        yield new Token(Token.RPAREN, ')');
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


var t = new Tokenizer('(-6.022e23 bang "wang" bang (fwing))');

for(let token of t.tokenize()) {
    console.log(token);
}

class Parser {
    constructor(str) {
    }

    next() {
    }

    expect(token) {
        if(this.next() == token) {
            // do nothing
        } else {
            // ...
        }
    }

    parse() {
        expect("(");
        expect(")");
    }
}


class SExpression {
    constructor(head, tail) {
        this._head = head;
        this._tail = tail;
    }

    get head() {
        return this._head;
    }

    get tail() {
        return this._tail;
    }

    /**
     * Parses a simplified s-expression syntax that ignores pairs and just
     * focuses on lists.
     */
    static read(str) {

    }
}

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
