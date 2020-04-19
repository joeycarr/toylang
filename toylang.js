
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
        var pointer;
        if(tokenizer.lineCharCount > 0)
            pointer = '-'.repeat(tokenizer.lineCharCount) + '^';
        else
            pointer = '^';
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
        return this.tokengen.next().value;
    }

    expect(token, type) {
        if(token == undefined) {
            throw new ParserError(
                this.tokenizer,
                null,
                `No more tokens in the stream?`
            )
        }
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
        throw new ParserError(
            this.tokenizer,
            null,
            "Missing the balancing right parenthesis."
        )
    }
}


class ParserError extends Error {
    constructor(tokenizer, token, message) {
        var lines = tokenizer.str.split('\n');
        var line = lines[tokenizer.lineCount];
        var rawlength = 0;
        if(token)
            rawlength = token.rawlength;
        var pointer;
        if(tokenizer.lineCharCount > 0)
            pointer = '-'.repeat(tokenizer.lineCharCount-rawlength) + '^';
        else
            pointer = '^';
        super(`${message}
Line ${tokenizer.lineCount} character ${tokenizer.lineCharCount}
${line}
${pointer}
`);
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
    // for now, sexpressions are arrays

    if(sexpression.length == 0) {
        return null; // empty list, "()", is equivalent to null
    }

    var head;
    if(sexpression instanceof Array)
        head = sexpression[0];
    else
        head = sexpression

    switch(typeof(head)) {
        case "symbol":
            switch(head.description) {
                case "let":
                    let subexpr = sexpression[sexpression.length-1];
                    let newenv = new Environment();
                    newenv.parent = environment;
                    let bindings = sexpression.slice(1, -1);
                    for(let binding of bindings) {
                        let value = eval(binding[1], newenv);
                        let symbolname = binding[0].description;
                        newenv.set(symbolname, value);
                    }
                    return eval(subexpr, newenv);
                default:
                    let binding = environment.get(head.description);
                    if(typeof(binding) == "function") {
                        // note that tail may be an empty array
                        let tail = sexpression.slice(1);
                        return apply(binding, tail, environment);
                    } else {
                        return binding;
                    }
            }
            break;
        case "number":
        case "string":
            if(sexpression.length > 1)
                throw new Error("Primitives aren't callable.")
            return head;
        default:
            console.error("Found weird head in sexpression", head)
            // throw new Error("Unexpected type in s-expression.")
    }

}

const apply = (fn, args, environment) => {
    // console.log('applying fn to args', fn, args);

    args = args.map(x => eval(x, environment));
    return fn(...args);
}

const doit = program => {
    const env = new Environment();

    env.set('+', (...args) => args.reduce((a, b) => a + b, 0));
    env.set('-', (head, ...tail) => head - tail.reduce((a, b) => a + b, 0));
    env.set('x', 5);
    // console.log('environment', env);

    var p = new Parser(program);
    var sexp = p.parse();
    // console.log('Evaluating expression', sexp);
    return eval(sexp, env);
}

const justparse = program => {
    var p = new Parser(program);
    return p.parse();
}
