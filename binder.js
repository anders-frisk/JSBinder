class JSBinder
{
    constructor(options = {})
    {
        if (!JSBinder.#isPlainObject(options))
            return JSBinder.#error(`options must be an object`);

        this.#settings = {...JSBinder.#defaults, ...options};

        this.#highFrequencyController.start(this.#settings.highFrequencyInterval);
        this.#lowFrequencyController.start(this.#settings.lowFrequencyInterval);
    };

    static #defaults = { root: document, prefix: "", highFrequencyInterval: 100, lowFrequencyInterval: 5000 };
    #settings;

    #indexMap = new Map();

    static #error = (msg) => console.error(`JSBinder: ${msg}`);
    static #info = (msg) => console.info(`JSBinder: ${msg}`);

    static #dispatchEvent = (obj, type, detail = {}) => obj.dispatchEvent(new CustomEvent(`jsbinder-${type}`, { 'bubbles': true, 'detail': detail }));

    #state = {};

    // myJSBinder.setState({ list: ["A", "B"], title: "Abcde" });
    // Object must not be fully defined each time. Update is adds/modifies specified members.
    // Setting a member to 'undefined' removes it from state.
    setState = (data) => {
        if (!JSBinder.#isPlainObject(data))
            return JSBinder.#error(`setState requires an object as input`);

        const recurse = (state, updates) => {
            Object.keys(updates).forEach((key) => { if (updates[key] === undefined) { delete state[key]; } else { state[key] = JSBinder.#isPlainObject(updates[key]) ? recurse(state[key] || {}, updates[key]) : updates[key]; } });
            return state;
        };

        this.#state = recurse(this.#state, data);
        this.#updateRequest = true;
    };

    getState = () => this.#state;

    #functions = {};

    // myJSBinder.addFunction("round", (x) => Math.round(x)); >> <span data-bind="#round(5.55)"></span> >> <span>6</span>
    // myJSBinder.addFunction("abs", function (x) { return Math.abs(x) });
    addFunction = (name, method) => {
        const namePattern = "^[a-zA-Z]{1}[0-9a-zA-Z]*$";

        if (!name.match(new RegExp(namePattern)))
            return JSBinder.#error(`addFunction 'name' must match '${namePattern}'`);

        if (typeof method !== "function" || method.length !== 1)
            return JSBinder.#error(`addFunction 'method' must be a function with a single argument`);

        this.#functions = { ...this.#functions, ["#"+name]: method };
    };

    #createPath = (exp) => exp
        .replace(new RegExp("\\{([a-zA-Z0-9\\-_]+)\\}", "g"), (_, key) => this.#indexMap.get(key)) //Replaces "{index_key}" to stored index.
        .replace(new RegExp("\\[(\\d+)\\]", "g"), ".$1.") // array[1] >> array.1.
        .replace(new RegExp("\\.+", "g"), ".") // ".." >> "."
        .replace(new RegExp("^\\.", "g"), "") // ".aa.bb" >> "aa.bb"
        .replace(new RegExp("\\.$", "g"), "") // "aa.bb." >> "aa.bb"
        .split(".");

    #get = (exp) => {
        if (typeof exp !== "string") return exp; // true / false / null / undefined / numeric... etc.

        exp = exp.trim();

        if (exp.match(new RegExp("^-?[0-9]+$"))) return parseInt(exp); //int
        if (exp.match(new RegExp("^-?[0-9]+\\.[0-9]+$"))) return parseFloat(exp); //float
        if (exp.match(new RegExp("^" + "(['\"])" + ".*" + "\\1" + "$"))) return exp.substr(1,exp.length-2); //string ('text' or "text")
        if (exp === "true") return true;
        if (exp === "false") return false;
        if (exp === "null") return null;
        if (exp === "undefined") return undefined;
        if (exp === "Infinity") return Infinity;
        if (exp === "NaN") return NaN;

        return this.#createPath(exp).reduce((x, key) => (x === undefined || x[key] === undefined) ? undefined : x[key], this.#state);
    };

    static #ExpressionTree = class {
        #binder;
        #tree;

        constructor (binder, exp)
        {
            this.#binder = binder;
            this.#tree = JSBinder.#ExpressionTree.#buildTree(exp);
        };

        static #operators = ["?", ":", "(", ")", "!!", "!", "~", "<<", ">>", ">>>", "**", "*", "/", "%", "+", "-", ">=", ">", "<=", "<", "===", "==", "!==", "!=", "&", "^", "|", "&&", "||", "??"];
        static #rgxAnyOperator = new RegExp("(" + this.#operators.sort((a,b) => b.length - a.length).map((x) => x.replace(new RegExp("[.*+?^${}()|\\[\\]\\\\]", "g"), '\\$&')).join("|") + ")", "g");

        static #isFunction = (x) => typeof x === "string" && !!x.match(new RegExp("^#[a-zA-Z]{1}[0-9a-zA-Z]*$"));
        static #isOperator = (x) => typeof x === "string" && this.#operators.includes(x);

        // Recusive parse and build an expression tree / Abstract Syntax Tree (AST) from an string expression in order of operator precedence.
        static #buildTree = (exp) => {
            const stringMap = new Map();

            //"..." & '...' >> "{{index}}" Replaces strings in expression and store temporary.
            [...String(exp).matchAll(new RegExp(["'[^']*'", "\"[^\"]*\""].join("|"), "g"))].forEach(([text], index) => {
                stringMap.set(index, text);
                exp = exp.replace(text, `{{${index}}}`);
            });

            let parts = exp.replace(this.#rgxAnyOperator, " $1 ").trim().split(new RegExp("\\s+"));

            //"{{index}}" >> "..." & '...' Restore strings in expression.
            parts = parts.map((x) => {
                const m = x.match(new RegExp("^" + "\\{\\{([0-9]+)\\}\\}" + "$"));
                if (m) return stringMap.get(parseInt(m[1])); // lägg till " ?? 'undefined_temp_value'" etc..?
                return x;
            });

            let pos = 0;

            const recurse = () => {
                let output = [];

                // ["(", "1", "+", "1", ")", "/", "2"] >> [["1", "+", "1"], "/", "2"]
                while (pos < parts.length) {
                    if (parts[pos] === "(") { pos++; output.push(JSBinder.#listOrSingle(recurse())); }
                    else if (parts[pos] === ")") { pos++; break; }
                    else { output.push(parts[pos]); pos++ }
                }

                // (..., operator) "-", "5", ... >> (..., operator) ["-", "5"], ...
                for (let x = output.length - 2; x >= 0; x--)
                    if (["-", "+"].includes(output[x]) && (x === 0 || JSBinder.#ExpressionTree.#isOperator(output[x-1])))
                        output.splice(x, 2, [output[x], output[x+1]]);

                // ..., unary_operator, operand, ... >> ..., [unary_operator, operand], ...
                // ["false", "===", "!", "true"] >> ["false", "===", ["!", "true"]]
                // ["false", "===", "!", "!", "true"] >> ["false", "===", ["!", ["!", "true"]]]
                for (let x = output.length - 2; x >= 0; x--)
                    if (["!!", "!", "~"].includes(output[x]))
                        output.splice(x, 2, [output[x], output[x+1]]);
        
                // (right to left) ..., operand, binary_operator, operand, ... >> ..., [operand, binary_operator, operand], ...
                for (let x = output.length - 3; x >= 0; x--)
                    if (["**"].includes(output[x+1]))
                        output.splice(x, 3, [output[x], output[x+1], output[x+2]]);

                // (left to right) ..., operand, binary_operator, operand, ... >> ..., [operand, binary_operator, operand], ...
                // ["4", "/", "2", "+", "2", "*", "4", "==", "10"] >> [[["4", "/", "2"], "+", ["2", "*", "4"]], "==", "10"]
                [["*", "/", "%"], ["+", "-"], ["<<", ">>", ">>>"], [">=", ">", "<=", "<"], ["===", "==", "!==", "!="], ["&"], ["^"], ["|"], ["&&"], ["||"], ["??"]].forEach((ops) => {
                    let x = 0;
                    while (output.length > 3 && x <= output.length - 3)
                        if (ops.includes(output[x+1])) { output.splice(x, 3, [output[x], output[x+1], output[x+2]]); } else { x++ };
                });

                // ..., [1, "==", 2], "?", "'Yes'", ":", "'No'", ... >> ..., [[1, "==", 2], "?", "'Yes'", ":", "'No'"], ...
                for (let x = output.length - 5; x >= 0; x--)
                    if (output[x+1] === "?" && output[x+3] === ":")
                        output.splice(x, 5, [output[x], "?", output[x+2], ":", output[x+4]]);

                // Make sure to not return nested lists if not needed.
                // [[...]] >> [...]
                return output.length === 1 && Array.isArray(output[0]) ? output[0] : output;
            };

            return recurse();
        };

        // Evaluates unary expressions. Ex: '!true' (operator operand)
        // map: [['!', (a) => !a], ...] data: ['!', true] >> [false]
        static #evaluateUnaryOperations = (data, map) => {
            map.forEach(([op, func]) => { if (data.length === 2 && data[0] === op) { data = [func(data[1])]; } });
            return data;
        };

        // Evaluates binary expressions. Ex: '1+2' (operand operator operand)
        // map: [['+', (a, b) => a+b], ...] data: [1, '+', 2] >> [3]
        static #evaluateBinaryOperations = (data, map) => {
            map.forEach(([op, func]) => { if (data.length === 3 && data[1] === op) { data = [func(data[0], data[2])]; } });
            return data;
        };

        // Recursive evaluation of expression tree.
        evaluate = () => {
            // [[1, "==", 2], "?", "'yes'", ":", "'no'" ] >> ["'no'"]
            const handleTernary = (data) => {
                const list = (x) => Array.isArray(x) ? x : [x];

                if (data.length === 5 && data[1] === "?" && data[3] === ":") data = evaluateTree(list(data[0])) ? list(data[2]) : list(data[4]);
                return data;
            };

            // [#round, 5.5] >> [6]
            const handleFunctions = (data) =>
                JSBinder.#ExpressionTree.#evaluateUnaryOperations(data, Object.entries(this.#binder.#functions)); //Object.entries(...) >> [["#round", (x) => Math.round(x)], ...]

            // ["!", true] >> [false]
            const handleUnaryOperations = (data) => 
                JSBinder.#ExpressionTree.#evaluateUnaryOperations(data, [
                    ["!!", (x) => !!x],
                    ["!",  (x) =>  !x],
                    ["~",  (x) =>  ~x],
                    ["-",  (x) => 0-x],
                    ["+",  (x) => 0+x],
                ]);

            // [1, "+", 2] >> [3]
            const handleBinaryOperations = (data) =>
                JSBinder.#ExpressionTree.#evaluateBinaryOperations(data, [
                    ["**",  (x, y) => x **  y], 
                    ["*",   (x, y) => x *   y], 
                    ["/",   (x, y) => x /   y], 
                    ["%",   (x, y) => x %   y], 
                    ["+",   (x, y) => x +   y], 
                    ["-",   (x, y) => x -   y], 
                    ["<<",  (x, y) => x <<  y],
                    [">>",  (x, y) => x >>  y],
                    [">>>", (x, y) => x >>> y],
                    ["===", (x, y) => x === y],
                    ["==",  (x, y) => x ==  y],
                    ["!==", (x, y) => x !== y],
                    ["!=",  (x, y) => x !=  y],
                    [">=",  (x, y) => x >=  y],
                    [">",   (x, y) => x >   y],
                    ["<=",  (x, y) => x <=  y],
                    ["<",   (x, y) => x <   y],
                    ["&",   (x, y) => x &   y],
                    ["^",   (x, y) => x ^   y],
                    ["|",   (x, y) => x |   y],
                    ["&&",  (x, y) => x &&  y],
                    ["||",  (x, y) => x ||  y],
                    ["??",  (x, y) => x ??  y],
                ]);

            // Recursive parse tree nodes to values.
            // ["'string'", vaiable_eq_1, "true", ...] >> ["string", 1, true, ...]   
            const resolveLiterals = (input) => input
                .map((x) => Array.isArray(x) ? resolveLiterals(x) : x)
                .map((x) => !Array.isArray(x) && !JSBinder.#ExpressionTree.#isFunction(x) && !JSBinder.#ExpressionTree.#isOperator(x) ? this.#binder.#get(x) : x);

            // Recursive solve tree.
            const evaluateTree = (input) => JSBinder.#listOrSingle(
                [handleTernary, handleFunctions, handleUnaryOperations, handleBinaryOperations]
                    .reduce((acc, fn) => fn(acc), input.map((x) => Array.isArray(x) ? evaluateTree(x) : x)));

            return evaluateTree(resolveLiterals(this.#tree));
        };
    };
 
    static #rgx = {
        var: "[a-zA-Z]{1}[0-9a-zA-Z_]*",
        class: "[a-zA-Z]{1}[0-9a-zA-Z_-]*",
        attr: "[a-zA-Z]{1}[0-9a-zA-Z_-]*",
        exp: ".+",
    };

    static #listOrSingle = (x) => (Array.isArray(x) && x.length === 1) ? x[0] : x;

    static #isPlainObject = (obj) => obj !== null && typeof obj === 'object' && !Array.isArray(obj);

    static #toKebabCase = (text) => text.trim().replace(new RegExp("([a-z])([A-Z])", "g"), (_, a, b) => `${a}-${b.toLowerCase()}`); //"marginTop" >> "margin-top"
    static #toCamelCase = (text) => text.trim().replace(new RegExp("([a-z])-([a-z])", "g"), (_, a, b) => `${a}${b.toUpperCase()}`); //"margin-top" >> "marginTop"

    static #pop = (obj, ...keys) => this.#listOrSingle(keys.map(key => { const data = obj.dataset[this.#toCamelCase(key)]?.trim().replace(new RegExp("\\s\\s+", "g"), " ") ?? null; obj.removeAttribute(`data-${key}`); return data; }));

    static #cleanHTML = (html) => html.trim().replace(new RegExp("\\<!--[\\s\\S]*?--\\>", "g"), "").replace(new RegExp("\\s\\s+", "g"), " ");

    static #replaceObject = (obj, ...objs) => { obj.replaceWith(...objs); return this.#listOrSingle(objs); };

    static #deserializeHTML = (html) => { let t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };

    static #isEmpty = (x) => [undefined, null, ""].includes(x);

    #mapAttributes = (...keys) => JSBinder.#listOrSingle(keys.map(key => (this.#settings.prefix ? `${this.#settings.prefix}-` : "") + key));

    static #bind = (obj, value) => {
        //Important! Remember nullish... value = 0 >> !value == false
        //ToDo: radiobutton

        const isNullOrUndefined = value === null || value === undefined;
        const isTrue = !!value === true;

        if (obj.matches("input[type='checkbox']")) {
            if (isTrue) { obj.setAttribute("checked", "checked"); } else { obj.removeAttribute("checked"); };
            return;
        }

        if (obj.matches("input") || obj.matches("select")) {
            if (isNullOrUndefined) { if (obj.value !== "") obj.value = ""; } else { if (obj.value !== value) obj.value = value };
            return;
        }

        if (obj.matches("img")) {
            if (isNullOrUndefined) { obj.setAttribute("src", null); } else { obj.setAttribute("src", value); };
            return;
        }

        if (obj.matches("iframe")) {
            if (isNullOrUndefined) { obj.contentWindow.location.replace(null); } else { obj.contentWindow.location.replace(value); };
            return;
        }

        if (isNullOrUndefined) { obj.innerHTML = ""; } else { obj.innerHTML = value; };
    };

    #findDirectives = (directive, callback) => {
        const [$if, $each, $for] = this.#mapAttributes("if", "each", "for");

        [...this.#settings.root.querySelectorAll(`[data-${directive}]`)]
            .filter((obj) => document.body.contains(obj))
            .filter((obj) => ![`[data-${$if}]`, `[data-${$each}]`, `[data-${$for}]`, `template`].some(x => !!obj.parentNode.closest(x)))
            .forEach((obj) => callback(obj));
    };

    // let memo = new JSBinder.#ModifiedMemo();
    // memo.check(data) >> boolean (true on first call or if data is different from last check.)
    static #ModifiedMemo = class { #current = null; #first = true; check = (value) => { if (this.#first === true || value !== this.#current) { this.#current = value; this.#first = false; return true; } return false; } };

    // data-if="data.visible == true"
    // data.visible = true  >> <div data-if="data.visible == true">a</div> >> <div>a</div>
    // data.visible = false >> <div data-if="data.visible == true">a</div> >> <!-- if -->
    //
    // event: jsbinder-if with e.detail.action = "add" / "remove".
    #ifDirective = ((binder) => new class {
        #items = [];
        #cleanup = () => { this.#items = this.#items.filter((x) => document.body.contains(x.obj)); };

        scan = () => {
            this.#cleanup();

            const $if = binder.#mapAttributes("if");

            binder.#findDirectives($if, (obj) => {
                const expression = JSBinder.#pop(obj, $if);
                const html = JSBinder.#cleanHTML(obj.outerHTML);
                const placeholder = JSBinder.#replaceObject(obj, document.createComment("if"));

                this.#items.push({
                    obj: placeholder, 
                    html, 
                    expressionTree: new JSBinder.#ExpressionTree(binder, expression), 
                    modified: new JSBinder.#ModifiedMemo(),
                });
            });
        };

        update = () => {
            let counter = 0;

            this.#items.forEach((item) => {
                const result = !!item.expressionTree.evaluate();
                if (item.modified.check(result)) {
                    if (result === true) {
                        item.obj = JSBinder.#replaceObject(item.obj, JSBinder.#deserializeHTML(item.html));
                        JSBinder.#dispatchEvent(item.obj, "if", { action: "add" });
                        counter++;
                    } else {
                        JSBinder.#dispatchEvent(item.obj, "if", { action: "remove" });
                        item.obj = JSBinder.#replaceObject(item.obj, document.createComment("if"));
                    }
                }
            });

            return counter;
        };
    })(this);

    // data-each="row in data"
    // var data = ["a", "b", ...]       >> <div data-each="@item in data" data-key="@item" data-bind="@item" />                                 >> <div>a</div><div>b</div>...
    // var data = [{title: "a"}, ...]   >> <div data-each="@item in data" data-key="@item.title" data-bind="@item.title" />                     >> <div>a</div>...
    // var data = [1,2,3,4,5, ...]      >> <div data-each="@number in data" data-key="@number" data-bind="@number" data-where="@number > 3" />  >> <div>4</div><div>5</div>...
    // var data = [1,2,3,4,5, ...]      >> <div data-each="@number in data" data-key="@number" data-skip="1" data-limit="2" />                  >> <div>2</div><div>3</div>
    //
    // event: jsbinder-each with e.detail.action = "add" / "remove".
    #eachDirective = ((binder) => new class {
        #items = [];
        #cleanup = () => { this.#items = this.#items.filter((x) => document.body.contains(x.start)); };
        #index = 0;

        scan = () => {
            this.#cleanup();

            const [$each, $key, $where, $skip, $limit] = binder.#mapAttributes("each", "key", "where", "skip", "limit");

            binder.#findDirectives($each, (obj) => {
                const [expression, key, where, skip, limit] = JSBinder.#pop(obj, $each, $key, $where, $skip, $limit);
                const html = JSBinder.#cleanHTML(obj.outerHTML);
                const [start, end] = JSBinder.#replaceObject(obj, document.createComment("each"), document.createComment("/each"));

                if (key === null)
                    return JSBinder.#error("'each' must have 'key' expression defined");

                const m = expression.match(new RegExp("^" + `@(${JSBinder.#rgx.var})` + "\\s+" + "in" + "\\s+" + "([\\S]+)" + "$"));

                if (!m)
                    return JSBinder.#error(`incorrect 'each' expression: ${expression}`);

                const { 1: alias, 2: list } = m;
                this.#items.push({
                    itemIndex: this.#index++,
                    html, 
                    key, 
                    keys: [], 
                    objs: [], 
                    start, 
                    end, 
                    alias, 
                    list, 
                    where,
                    limitTree: limit !== null ? new JSBinder.#ExpressionTree(binder, limit) : null,
                    skipTree: skip !== null ? new JSBinder.#ExpressionTree(binder, skip) : null,
                });
            });
        };

        update = () => {
            let counter = 0;

            this.#items.forEach((item) => {
                const whereNotIn = (other) => (x) => !other.includes(x);
                const whereNotNull = (x) => x !== null;

                const skip = item.skipTree !== null ? item.skipTree.evaluate() : null;
                const limit = item.limitTree !== null ? item.limitTree.evaluate() : null;

                //Create list of all idexes to include, filtered by 'where' if defined.
                let indexes = [];

                const source = binder.#get(item.list);
                if (Array.isArray(source)) {
                    source.forEach((x, index) => {
                        const whereExpression = item.where?.replace(new RegExp("@" + item.alias + "\\b", "g"), `${item.list}[${index}]`);
                        const valid = item.where === null || (new JSBinder.#ExpressionTree(binder, whereExpression)).evaluate();
                        if (valid) indexes.push(index);
                    });
                }

                //Reduce list of indexes if 'skip' or 'limit' is defined
                if (skip !== null) indexes = indexes.slice(skip);
                if (limit !== null) indexes = indexes.slice(0, limit);

                //Calculate keys for each index.
                let newKeys = [];
                indexes.forEach((index) => {
                    const keyExpression = item.key.replace(new RegExp("@" + item.alias + "\\b", "g"), `${item.list}[${index}]`);
                    const key = (new JSBinder.#ExpressionTree(binder, keyExpression)).evaluate()
                        .toString()
                        .replace(new RegExp("[^a-zA-Z0-9]", "g"), "_");

                    binder.#indexMap.set(`${item.itemIndex}_${key}`, index);

                    newKeys.push(`${item.itemIndex}_${key}`);
                });

                //Compare keys to know what to add or remove.
                const keysToRemove = item.keys.filter(whereNotIn(newKeys));
                const keysToAdd = newKeys.filter(whereNotIn(item.keys));

                //Remove existing items
                item.keys.forEach((key, i) => {
                    if (keysToRemove.includes(key)) {
                        JSBinder.#dispatchEvent(item.objs[i], "each", { action: "remove" });
                        item.objs[i].remove();
                        item.objs[i] = null;
                        item.keys[i] = null;
                    }
                });

                //Filtered lists to not include removed elements
                let existingKeys = item.keys.filter(whereNotNull);
                let existingObjs = item.objs.filter(whereNotNull);

                let lastObj = item.start; //Store reference to element to add new items after...
                let newObjs = [];

                newKeys.forEach((key, i) => {
                    let obj = null;

                    if (keysToAdd.includes(key)) {
                        //Add new item
                        obj = JSBinder.#deserializeHTML(item.html.replace(new RegExp("@" + item.alias + "\\b", "g"), `${item.list}[{${key}}]`));
                        lastObj.after(obj);
                        JSBinder.#dispatchEvent(obj, "each", { action: "add" });
                        counter++;
                    } else {
                        //Reorder existing items if needed
                        const index = existingKeys.indexOf(key);
                        obj = existingObjs[index];

                        if (index > 0) lastObj.after(obj); //if object is not next of existing it needs to be moved to after "lastObj".

                        existingObjs.splice(index, 1); //removes object from list of old objects (unhandled objects).
                        existingKeys.splice(index, 1);
                    }

                    lastObj = obj;
                    newObjs.push(obj);
                });

                item.objs = newObjs;
                item.keys = newKeys;
            });

            return counter;
        };
    })(this);

    // <p data-for="@index" data-from="0" data-to="myArray.length" data-bind="myArray[@index]" /> >> ...
    // <p data-for="@number" data-from="3" data-to="7" data-bind="@number" /> >> <p>3</p><p>4</p>...<p>7</p>
    // <p data-for="@number" data-from="1" data-to="7" data-where="@number % 2 == 0" data-bind="@number" /> >> <p>2</p><p>4</p><p>6</p>
    //
    // event: jsbinder-for with e.detail.action = "add" / "remove".
    #forDirective = ((binder) => new class {
        #items = [];
        #cleanup = () => { this.#items = this.#items.filter((x) => document.body.contains(x.start)); };

        scan = () => {
            this.#cleanup();

            const [$for, $from, $to, $where] = binder.#mapAttributes("for", "from", "to", "where");

            binder.#findDirectives($for, (obj) => {
                const [expression, from, to, where] = JSBinder.#pop(obj, $for, $from, $to, $where);
                const html = JSBinder.#cleanHTML(obj.outerHTML);
                const [start, end] = JSBinder.#replaceObject(obj, document.createComment("for"), document.createComment("/for"));

                if (from === null || to === null)
                    return JSBinder.#error("'for' must have 'from' and 'to' expressions defined");

                const m = expression.match(new RegExp("^" + `@(${JSBinder.#rgx.var})` + "$"));

                if (!m)
                    return JSBinder.#error(`incorrect 'for' expression: ${expression}`);

                const { 1: alias } = m;
                this.#items.push({
                    html, 
                    keys: [], 
                    objs: [], 
                    start, 
                    end, 
                    alias, 
                    where,
                    fromTree: new JSBinder.#ExpressionTree(binder, from), 
                    toTree: new JSBinder.#ExpressionTree(binder, to),
                });
            });
        };

        update = () => {
            let counter = 0;

            this.#items.forEach((item) => {
                const whereNotIn = (other) => (x) => !other.includes(x);
                const whereNotNull = (x) => x !== null;

                const from = item.fromTree.evaluate();
                const to = item.toTree.evaluate();

                //Create list of all keys/numbers to include, filtered by 'where' if defined.
                let newKeys = [];
                for (let key = from; key <= to; key++) {
                    const whereExpression = item.where?.replace(new RegExp("@" + item.alias + "\\b", "g"), key);
                    const valid = item.where === null || (new JSBinder.#ExpressionTree(binder, whereExpression)).evaluate();
                    if (valid) newKeys.push(key);
                }

                //Compare keys to know what to add or remove.
                const keysToRemove = item.keys.filter(whereNotIn(newKeys));
                const keysToAdd = newKeys.filter(whereNotIn(item.keys));

                //Remove existing items
                item.keys.forEach((key, i) => {
                    if (keysToRemove.includes(key)) {
                        JSBinder.#dispatchEvent(item.objs[i], "for", { action: "remove" });
                        item.objs[i].remove();
                        item.objs[i] = null;
                        item.keys[i] = null;
                    }
                });

                //Filtered lists to not include removed elements
                let existingKeys = item.keys.filter(whereNotNull);
                let existingObjs = item.objs.filter(whereNotNull);

                let lastObj = item.start; //Store reference to element to add new items after...
                let newObjs = [];

                newKeys.forEach((key) => {
                    let obj = null;

                    if (keysToAdd.includes(key)) {
                        //Add new item
                        obj = JSBinder.#deserializeHTML(item.html.replace(new RegExp("@" + item.alias + "\\b", "g"), key));
                        lastObj.after(obj);
                        JSBinder.#dispatchEvent(obj, "for", { action: "add" });
                        counter++;
                    } else {
                        //Existing items...
                        const index = existingKeys.indexOf(key);
                        obj = existingObjs[index];
                    }
                    
                    lastObj = obj;
                    newObjs.push(obj);
                });

                item.objs = newObjs;
                item.keys = newKeys;
            });

            return counter;
        };
    })(this);

    // data-bind='data.title'
    // <div data-bind="..." /> >> <div>...</div>
    // <img data-bind="..." /> >> <img src="..." />
    // <input/select data-bind="..." /> >> <input/select value="..." />
    //
    // event: jsbinder-bind with e.detail.value = value.
    #bindDirective = ((binder) => new class {
        #items = [];
        #cleanup = () => { this.#items = this.#items.filter((x) => document.body.contains(x.obj)); };

        scan = () => {
            this.#cleanup();

            const $bind = binder.#mapAttributes("bind");

            binder.#findDirectives($bind, (obj) => {
                const expression = JSBinder.#pop(obj, $bind);

                this.#items.push({
                    obj, 
                    expressionTree: new JSBinder.#ExpressionTree(binder, expression),
                    modified: new JSBinder.#ModifiedMemo(), 
                    type: obj.matches("select") ? "select" : null,
                });
            });
        };

        update = () => {
            const updateItem = (item) => {
                const result = item.expressionTree.evaluate();
                if (item.modified.check(result) || item.type === "select" && item.obj.value !== result) {
                    JSBinder.#bind(item.obj, JSBinder.#isEmpty(result) ? "" : result);
                    JSBinder.#dispatchEvent(item.obj, "bind", { value: result });
                }
            };

            // <select> must be binded after any other binds if <option> depends on 'data-each' or 'data-for' etc.
            this.#items.filter(x => x.type === null).forEach((item) => updateItem(item));
            this.#items.filter(x => x.type === "select").forEach((item) => updateItem(item));
        };
    })(this);

    // data-attr="'title' : data.title"
    // data-attr="'title' : data.title; 'src' : data.url"
    // data-disabled="valid !== true"
    //
    // event: jsbinder-attr with e.detail.key = attribute key.
    #attributeDirective = ((binder) => new class {
        #items = [];
        #cleanup = () => { this.#items = this.#items.filter((x) => document.body.contains(x.obj)); };

        scan = () => {
            this.#cleanup();

            const [$attr, $disabled] = binder.#mapAttributes("attr", "disabled");

            binder.#findDirectives($attr, (obj) => {
                JSBinder.#pop(obj, $attr).split(";").map(x => x.trim()).filter(x => x !== "").forEach((mapping) => {
                    const m = mapping.match(new RegExp("^" + "(['\"])" + `(${JSBinder.#rgx.attr})` + "\\1" + "\\s+" + ":" + "\\s+" + `(${JSBinder.#rgx.exp})` + "$"));

                    if (!m)
                        return JSBinder.#error(`incorrect 'attribute' syntax: ${mapping}`);

                    const { 2: key, 3: expression } = m;
                    this.#items.push({
                        obj, 
                        key, 
                        expressionTree: new JSBinder.#ExpressionTree(binder, expression),
                        modified: new JSBinder.#ModifiedMemo(),
                    });
                });
            });

            binder.#findDirectives($disabled, (obj) => {
                const expression = JSBinder.#pop(obj, $disabled);

                this.#items.push({
                    obj,
                    key: "disabled",
                    expressionTree: new JSBinder.#ExpressionTree(binder, "(" + expression + ") ? 'disabled' : null"),
                    modified: new JSBinder.#ModifiedMemo(),
                });
            });
        };

        update = () => {
            this.#items.forEach((item) => {
                const result = item.expressionTree.evaluate();
                if (item.modified.check(result)) {
                    if (JSBinder.#isEmpty(result)) { item.obj.removeAttribute(item.key); } else { item.obj.setAttribute(item.key, result); };
                    JSBinder.#dispatchEvent(item.obj, "attr", { key: item.key, value: result });
                }
            });
        };
    })(this);

    // data-class="'hidden' : data.visible == false"
    // data-class="'hidden' : data.visible == false; 'highlight" : data.important == true"
    // data-class="'disabled" : data.enabled !== true || data.expired === true"
    //
    // event: jsbinder-class with e.detail.key = class name.
    #classDirective = ((binder) => new class {
        #items = [];
        #cleanup = () => { this.#items = this.#items.filter((x) => document.body.contains(x.obj)); };

        scan = () => {
            this.#cleanup();

            const $class = binder.#mapAttributes("class");

            binder.#findDirectives($class, (obj) => {
                JSBinder.#pop(obj, $class).split(";").map(x => x.trim()).filter(x => x !== "").forEach((mapping) => {
                    const m = mapping.match(new RegExp("^" + "(['\"])" + `(${JSBinder.#rgx.class})` + "\\1" + "\\s+" + ":" + "\\s+" + `(${JSBinder.#rgx.exp})` + "$"));

                    if (!m)
                        return JSBinder.#error(`incorrect 'class' syntax: ${mapping}`);

                    const { 2: key, 3: expression } = m;
                    this.#items.push({
                        obj, 
                        key, 
                        expressionTree: new JSBinder.#ExpressionTree(binder, expression), 
                        modified: new JSBinder.#ModifiedMemo(),
                    });
                });
            });
        };

        update = () => {
            this.#items.forEach((item) => {
                const result = item.expressionTree.evaluate();
                if (item.modified.check(result)) {
                    item.obj.classList.toggle(item.key, result);
                    JSBinder.#dispatchEvent(item.obj, "class", { key: item.key, action: result ? "add" : "remove" });
                }
            });
        };
    })(this);

    // data-style="'backgroundColor' : data.background"
    // data-style="'left' : data.x; 'top" : data.y"
    //
    // event: jsbinder-style with e.detail.key = css property.
    #styleDirective = ((binder) => new class {
        #items = [];
        #cleanup = () => { this.#items = this.#items.filter((x) => document.body.contains(x.obj)); };

        scan = () => {
            this.#cleanup();

            const $style = binder.#mapAttributes("style");

            binder.#findDirectives($style, (obj) => {
                JSBinder.#pop(obj, $style).split(";").map(x => x.trim()).filter(x => x !== "").forEach((mapping) => {
                    const m = mapping.match(new RegExp("^" + "(['\"])" + `(${JSBinder.#rgx.attr})` + "\\1" + "\\s+" + ":" + "\\s+" + `(${JSBinder.#rgx.exp})` + "$"));

                    if (!m)
                        return JSBinder.#error(`incorrect 'style' syntax: ${mapping}`);

                    const { 2: key, 3: expression } = m;
                    this.#items.push({
                        obj, 
                        key: JSBinder.#toKebabCase(key),
                        expressionTree: new JSBinder.#ExpressionTree(binder, expression), 
                        modified: new JSBinder.#ModifiedMemo(),
                    });
                });
            });
        };

        update = () => {
            this.#items.forEach((item) => {
                const result = item.expressionTree.evaluate();
                if (item.modified.check(result)) {
                    if (JSBinder.#isEmpty(result)) { item.obj.style.removeProperty(item.key); } else { item.obj.style.setProperty(item.key, result); };
                    JSBinder.#dispatchEvent(item.obj, "style", { key: item.key, value: result });
                }
            });
        };
    })(this);

    // var tree =  [{ title: "Aaaa", items: [{ title: "Bbbb", items: [...] }, { title: "Cccc", items: [...] }] }];
    // <template data-template="tree">
    //   <li data-each="@item in @data">
    //     <span data-bind="@item.title"></span>
    //     <ul data-render="tree" data-source="@item.items"></ul>
    //   </li>
    // </template>
    // <ul data-render="tree" data-source="tree"></ul>
    //
    // event: jsbinder-render.
    #templates = ((binder) => new class {
        #items = {};
        
        // Find <template /> elements with data-template='templatekey' and stores to be used from elements with data-render='templatekey'.
        scan = () => {
            const $template = binder.#mapAttributes("template");

            [...binder.#settings.root.querySelectorAll(`template[data-${$template}]`)].forEach((obj) => {
                const key = JSBinder.#pop(obj, $template);
                const html = JSBinder.#cleanHTML(obj.innerHTML);
                
                obj.remove();
                
                this.#items = { ...this.#items, [key]: html };
            });
        };
        
        // Find elements with data-render='templatekey' and data-source='...' and replaces with html from <template data-template='templatekey'>...</template>
        // Template html variable '@data' will be replaced with source from 'data-source'.
        render = () => {
            let counter = 0;
            
            const [$render, $source] = binder.#mapAttributes("render", "source");
            
            binder.#findDirectives($render, (obj) => {
                const [key, source] = JSBinder.#pop(obj, $render, $source);
                const template = this.#items[key];

                if (!template)
                    return JSBinder.#error(`no template with key '${key}' found`);

                if (!source)
                    return JSBinder.#error(`'render' must have 'source' defined`);

                obj.innerHTML = template.replace(new RegExp("@" + "data" + "\\b", "g"), source);
                JSBinder.#dispatchEvent(obj, "render");
                counter++;
            });
            
            return counter;
        };
    })(this);

    #scanRequest = false;
    #updateRequest = false;

    #lock = false;

    // let timed = new JSBinder.#Interval(() => { ... });
    // timed.start(1000); / timed.stop();
    static #Interval = class { #timer = null; #handler = () => {}; constructor (handler) { this.#handler = handler; }; start = (interval) => { this.#timer = window.setInterval(this.#handler, interval); }; stop = () => { window.clearInterval(this.#timer); }; };

    #highFrequencyController = new JSBinder.#Interval(() => {
        if (!this.#lock && this.#scanRequest)    { this.#scanRequest = false; this.#lock = true; this.#scan(); this.#lock = false; }
        if (!this.#lock && this.#updateRequest)  { this.#updateRequest = false; this.#lock = true; this.#update(); this.#lock = false; }
    });

    #lowFrequencyController = new JSBinder.#Interval(() => {
        if (this.#settings.root !== document && document.contains(this.#settings.root) === false) {
            this.#highFrequencyController.stop();
            this.#lowFrequencyController.stop();
            JSBinder.#info("Instance stopped!");
        } 
    });

    #scan = () => {
        [this.#templates, this.#ifDirective, this.#eachDirective, this.#forDirective, this.#bindDirective, this.#attributeDirective, this.#classDirective, this.#styleDirective].forEach(x => x.scan());
        this.#update();
    };

    #update = () => {
        let count = 0;
        [this.#ifDirective, this.#eachDirective, this.#forDirective, this.#bindDirective, this.#attributeDirective, this.#classDirective, this.#styleDirective].forEach(x => count += x.update() ?? 0);
        if (count === 0) count += this.#templates.render();
        if (count > 0) this.#scan();
    };

    scan = () => { this.#scanRequest = true; };
};