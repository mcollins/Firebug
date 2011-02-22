if (typeof JSDOC == "undefined") JSDOC = {};

/** @constructor */
JSDOC.Walker = function(/**JSDOC.TokenStream*/ts) {
	this.init();
	if (typeof ts != "undefined") {
		this.walk(ts);
	}
};

JSDOC.Walker.prototype.init = function() {
	this.ts = null;

	var globalSymbol = new JSDOC.Symbol("_global_", [], "GLOBAL", new JSDOC.DocComment(""));
	globalSymbol.isNamespace = true;
	globalSymbol.srcFile = "";
	globalSymbol.isPrivate = false;
	JSDOC.Parser.addSymbol(globalSymbol);
	this.lastDoc = null;
	this.token = null;
	
	/**
		The chain of symbols under which we are currently nested.
		@type Array
	*/
	this.namescope = [globalSymbol];
	//this.namescope.last = function(n){ if (!n) n = 0; return this[this.length-(1+n)] || ""; };

	// xxxpedro with
	this.namescope.last = function(n){
		if (!n) n = 0;
		var count = 0;
		var index = this.length;
		while (count <= n)
		{
			index--;

			// ignoring with() namescopes
			if (!this[index].isWith)
				count++;
		};

		return this[index] || "";
	};


	// TODO: xxxpedro test namespace
	/*
	var ns = this.namescope;
	ns._push = ns.push;
	ns.push = function(){
		ns._push.apply(ns, arguments);
		for (var i=0, l=ns.length, s="ns=["; i<l; i++)
		{
			s+=ns[i].name+", ";
		}
		
		//LOG.warn(s+"]");
	};/**/
	
};

JSDOC.Walker.prototype.walk = function(/**JSDOC.TokenStream*/ts) {
	// TODO: xxxpedro performance instrumentation
	if (LOG.profile) LOG.time("JSDOC.Walker.prototype.walk()");
	this.ts = ts;
	while (this.token = this.ts.look()) {
		if (this.token.popNamescope) {
			
			var symbol = this.namescope.pop();
			if (symbol.is("FUNCTION")) {
				if (this.ts.look(1).is("LEFT_PAREN") && symbol.comment.getTag("function").length == 0) {
					symbol.isa = "OBJECT";
				}
			}
		}
		this.step();
		if (!this.ts.next()) break;
	}
	// TODO: xxxpedro performance instrumentation
	if (LOG.profile) LOG.timeEnd("JSDOC.Walker.prototype.walk()");
};

JSDOC.Walker.prototype.step = function() {
	if (this.token.is("JSDOC")) { // it's a doc comment
	
		var doc = new JSDOC.DocComment(this.token.data);
		
				
		if (doc.getTag("exports").length > 0) {
			var exports = doc.getTag("exports")[0];

			exports.desc.match(/(\S+) as (\S+)/i);
			var n1 = RegExp.$1;
			var n2 = RegExp.$2;
			
			if (!n1 && n2) throw "@exports tag requires a value like: 'name as ns.name'";
			
			JSDOC.Parser.rename = (JSDOC.Parser.rename || {});	
			JSDOC.Parser.rename[n1] = n2;
		}
		
		// TODO: xxxpedro
		/*
		if (doc.getTag("this").length > 0) {
			var scope = this.namescope.last();
			LOG.warn("......... "+scope.name+", " + scope.alias);
		}/**/
		
/*
		if (doc.getTag("closure").length > 0) {
			var scope = doc.getTag("closure")[0];

			var name = scope.desc
			if (!name) throw "@closure tag requires a value.";
			
			var symbol = new JSDOC.Symbol(name, [], "OBJECT", doc, this.token);
			
			symbol.isa = "CONSTRUCTOR";
			symbol.isNamespace = true;
			symbol.isScope = true;

			if (!JSDOC.Parser.symbols.getSymbolByName(symbol.name))
				JSDOC.Parser.addSymbol(symbol);

			this.namescope.push(symbol);
			
			var matching = this.ts.getMatchingToken("LEFT_CURLY");
			if (matching) matching.popNamescope = name;
			else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
			
			this.lastDoc = null;
			return true;
		}
		else /**/ if (doc.getTag("lends").length > 0) {
			var lends = doc.getTag("lends")[0];

			var name = lends.desc;
			if (!name) throw "@lends tag requires a value.";
			
//print("BEFORE " + name);
			name = this.resolveName(name);
//print("AFTER " + name);

			var symbol = new JSDOC.Symbol(name, [], "OBJECT", doc, this.token, this.namescope);
			
			this.handleScope(name, symbol);
			/*
			this.namescope.push(symbol);
			
			var matching = this.ts.getMatchingToken("LEFT_CURLY");
			if (matching) matching.popNamescope = name;
			else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
			*/

			this.lastDoc = null;
			return true;
		}
		else if (doc.getTag("name").length > 0 && doc.getTag("overview").length == 0) { // it's a virtual symbol
			var virtualName = doc.getTag("name")[0].desc;
			if (!virtualName) throw "@name tag requires a value.";
			
			if (doc.getTag("memberOf").length > 0) {
				virtualName = (doc.getTag("memberOf")[0] + "." + virtualName)
					.replace(/([#.])\./, "$1");
				doc.deleteTag("memberOf");
			}

			var symbol = new JSDOC.Symbol(virtualName, [], "VIRTUAL", doc, this.token, this.namescope);
			
			JSDOC.Parser.addSymbol(symbol);
			
			this.lastDoc = null;
			return true;
		}
		else if (doc.meta) { // it's a meta doclet
			if (doc.meta == "@+") JSDOC.DocComment.shared = doc.src;
			else if (doc.meta == "@-") JSDOC.DocComment.shared = "";
			else if (doc.meta == "nocode+") JSDOC.Parser.conf.ignoreCode = true;
			else if (doc.meta == "nocode-") JSDOC.Parser.conf.ignoreCode = JSDOC.opt.n;
			else throw "Unrecognized meta comment: "+doc.meta;
			
			this.lastDoc = null;
			return true;
		}
		else if (doc.getTag("overview").length > 0) { // it's a file overview
			symbol = new JSDOC.Symbol("", [], "FILE", doc, this.token);
			
			JSDOC.Parser.addSymbol(symbol);
			
			this.lastDoc = null;
			return true;
		}
		else {
			this.lastDoc = doc;
			return false;
		}
	}
	else if (!JSDOC.Parser.conf.ignoreCode) { // it's code
		if (this.token.is("NAME")) { // it's the name of something

			var symbol;
			var name = this.token.data;
			var doc = null; if (this.lastDoc) doc = this.lastDoc;
			var params = [];
			
			// it's subscripted like foo[1]
			if (this.ts.look(1).is("LEFT_BRACKET") && this.namescope.last().is("SCOPE")) {
				name += JSDOC.TokenStream.tokensToString(this.ts.balance("LEFT_BRACKET"));
			}
			
			if (this.ts.look(1).is("COLON") && this.ts.look(-1).is("LEFT_CURLY") && !(this.ts.look(-2).is("JSDOC") || this.namescope.last().comment.getTag("lends").length || this.ts.look(-2).is("ASSIGN") || this.ts.look(-2).is("COLON"))) {
			
				name = "$anonymous";
				name = this.namescope.last().alias+"-"+name;
					
				params = [];
				
				symbol = new JSDOC.Symbol(name, params, "OBJECT", doc, this.token, this.namescope);

				JSDOC.Parser.addSymbol(symbol);
				
				//this.handleScope(name, symbol);
				this.namescope.push(symbol);
				
				var matching = this.ts.getMatchingToken(null, "RIGHT_CURLY");
				if (matching) matching.popNamescope = name;
				else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
			}
			// TODO: xxxpedro with scope
			// with(foo) {}

			else if (this.ts.look(-1).is("LEFT_PAREN") && this.ts.look(-2).is("WITH") && (symbol = JSDOC.Parser.symbols.getSymbol(name))) {
			
				symbol = JSDOC.Parser.symbols.getSymbol(name);
				
				var clone = symbol.clone();
				clone.isWith = true;
				clone.isScope = true;
				clone.thisObj = this.namescope.last().thisObj || "_global_";
				clone.originalSymbol = symbol;

				this.handleScope(name, clone, "(with)");
				//this.namescope.push(clone);

				//var matching = this.ts.getMatchingToken("LEFT_CURLY");
				//if (matching) matching.popNamescope = name;
				//else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
			}
			/**/
			// function foo() {}
			else if (this.ts.look(-1).is("FUNCTION") && this.ts.look(1).is("LEFT_PAREN")) {
				var isInner;
				
				if (this.lastDoc) doc = this.lastDoc;
				
				if (doc && doc.getTag("memberOf").length > 0) {
					name = (doc.getTag("memberOf")[0]+"."+name).replace("#.", "#");
					doc.deleteTag("memberOf");
				}
				else {
					name = this.namescope.last().alias+"-"+name;
					if (!this.namescope.last().is("GLOBAL")) isInner = true;
				}
				
				if (!this.namescope.last().is("GLOBAL")) isInner = true;
				
				params = JSDOC.Walker.onParamList(this.ts.balance("LEFT_PAREN"));

				symbol = new JSDOC.Symbol(name, params, "FUNCTION", doc, this.token, this.namescope);
				if (isInner) symbol.isInner = true;

				if (this.ts.look(1).is("JSDOC")) {
					var inlineReturn = ""+this.ts.look(1).data;
					inlineReturn = inlineReturn.replace(/(^\/\*\* *| *\*\/$)/g, "");
					symbol.type = inlineReturn;
				}
				
				JSDOC.Parser.addSymbol(symbol);
				
				this.handleScope(name, symbol);
				/*
				this.namescope.push(symbol);
				
				var matching = this.ts.getMatchingToken("LEFT_CURLY");
				if (matching) matching.popNamescope = name;
				else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
				*/
			}
			// foo = function() {}
			else if (this.ts.look(1).is("ASSIGN") && this.ts.look(2).is("FUNCTION")) {
				var constructs;
				var isConstructor = false;
				if (doc && (constructs = doc.getTag("constructs")) && constructs.length) {
					if (constructs[0].desc) {
						name = constructs[0].desc;
						isConstructor = true;
					}
				}
					
				var isInner;
				if (this.ts.look(-1).is("VAR") || this.isInner) {
					if (doc && doc.getTag("memberOf").length > 0) {
						name = (doc.getTag("memberOf")[0]+"."+name).replace("#.", "#");
						doc.deleteTag("memberOf");
					}
					else {
						name = this.namescope.last().alias+"-"+name;
						if (!this.namescope.last().is("GLOBAL")) isInner = true;
					}
					if (!this.namescope.last().is("GLOBAL")) isInner = true;
				}
				else if (name.indexOf("this.") == 0) {
					name = this.resolveThis(name);
				}

				if (this.lastDoc) doc = this.lastDoc;
				params = JSDOC.Walker.onParamList(this.ts.balance("LEFT_PAREN"));
				
				symbol = new JSDOC.Symbol(name, params, "FUNCTION", doc, this.token, this.namescope);

				if (isInner) symbol.isInner = true;
				if (isConstructor) symbol.isa = "CONSTRUCTOR";
				
				if (this.ts.look(1).is("JSDOC")) {
					var inlineReturn = ""+this.ts.look(1).data;
					inlineReturn = inlineReturn.replace(/(^\/\*\* *| *\*\/$)/g, "");
					symbol.type = inlineReturn;
				}

				JSDOC.Parser.addSymbol(symbol);
				
				this.handleScope(name, symbol);
				/*
				this.namescope.push(symbol);
				
				var matching = this.ts.getMatchingToken("LEFT_CURLY");
				if (matching) matching.popNamescope = name;
				else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
				*/
			}
			// foo = new function() {} or foo = (function() {}
			else if (this.ts.look(1).is("ASSIGN") && (this.ts.look(2).is("NEW") || this.ts.look(2).is("LEFT_PAREN")) && this.ts.look(3).is("FUNCTION")) {
				var isInner;
				if (this.ts.look(-1).is("VAR") || this.isInner) {
					name = this.namescope.last().alias+"-"+name;
					if (!this.namescope.last().is("GLOBAL")) isInner = true;
				}
				else if (name.indexOf("this.") == 0) {
					name = this.resolveThis(name);
				}

				this.ts.next(3); // advance past the "new" or "("
				
				if (this.lastDoc) doc = this.lastDoc;
				params = JSDOC.Walker.onParamList(this.ts.balance("LEFT_PAREN"));
				
				symbol = new JSDOC.Symbol(name, params, "OBJECT", doc, this.token, this.namescope);
				if (isInner) symbol.isInner = true;
				
				if (this.ts.look(1).is("JSDOC")) {
					var inlineReturn = ""+this.ts.look(1).data;
					inlineReturn = inlineReturn.replace(/(^\/\*\* *| *\*\/$)/g, "");
					symbol.type = inlineReturn;
				}
				
				JSDOC.Parser.addSymbol(symbol);
				
				symbol.scopeType = "INSTANCE";
				
				this.handleScope(name, symbol);
				/*
				this.namescope.push(symbol);
				
				var matching = this.ts.getMatchingToken("LEFT_CURLY");
				if (matching) matching.popNamescope = name;
				else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
				*/
			}
			// foo: function() {}
			else if (this.ts.look(1).is("COLON") && this.ts.look(2).is("FUNCTION")) {
				name = (this.namescope.last().alias+"."+name).replace("#.", "#");
				
				if (this.lastDoc) doc = this.lastDoc;
				params = JSDOC.Walker.onParamList(this.ts.balance("LEFT_PAREN"));
				
				if (doc && doc.getTag("constructs").length) {
					name = name.replace(/\.prototype(\.|$)/, "#");
					
					if (name.indexOf("#") > -1) name = name.match(/(^[^#]+)/)[0];
					else name = this.namescope.last().alias;

					symbol = new JSDOC.Symbol(name, params, "CONSTRUCTOR", doc, this.token, this.namescope);
				}
				else {
					symbol = new JSDOC.Symbol(name, params, "FUNCTION", doc, this.token, this.namescope);
				}
				
				if (this.ts.look(1).is("JSDOC")) {
					var inlineReturn = ""+this.ts.look(1).data;
					inlineReturn = inlineReturn.replace(/(^\/\*\* *| *\*\/$)/g, "");
					symbol.type = inlineReturn;
				}
				
				JSDOC.Parser.addSymbol(symbol);
				
				this.handleScope(name, symbol);
				/*
				this.namescope.push(symbol);
				
				var matching = this.ts.getMatchingToken("LEFT_CURLY");
				if (matching) matching.popNamescope = name;
				else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
				*/
			}
			// foo = {}
			else if (this.ts.look(1).is("ASSIGN") && this.ts.look(2).is("LEFT_CURLY")) {
				var isInner;
				var lastScope = this.namescope.last();
				
				if (this.ts.look(-1).is("VAR") || this.isInner) {
					name = lastScope.alias+"-"+name;
					if (!lastScope.is("GLOBAL")) isInner = true;
				}
				else if (name.indexOf("this.") == 0) {
					name = this.resolveThis(name);
				}
				
				if (this.lastDoc) doc = this.lastDoc;
				
				symbol = new JSDOC.Symbol(name, params, "OBJECT", doc, this.token, this.namescope);
				//symbol.isNamespace = true;
				symbol.isIgnored = false;
				symbol.isPrivate = false;
				if (isInner) symbol.isInner = true;
				
				// TODO: xxxpedro
				if (doc || lastScope.is("SCOPE")) JSDOC.Parser.addSymbol(symbol);
				///if (doc) JSDOC.Parser.addSymbol(symbol);

				this.handleScope(name, symbol);
				/*
				this.namescope.push(symbol);
				
				var matching = this.ts.getMatchingToken("LEFT_CURLY");
				if (matching) matching.popNamescope = name;
				else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
				*/
			}
			// var foo;
			else if (this.ts.look(1).is("SEMICOLON")) {
				var isInner;

				if (this.ts.look(-1).is("VAR") || this.isInner) {
					name = this.namescope.last().alias+"-"+name;
					if (!this.namescope.last().is("GLOBAL")) isInner = true;
					
					if (this.lastDoc) doc = this.lastDoc;
				
					symbol = new JSDOC.Symbol(name, params, "OBJECT", doc, this.token, this.namescope);
					if (isInner) symbol.isInner = true;
					
				
					if (doc) JSDOC.Parser.addSymbol(symbol);
				}
			}
			// foo = x
			else if (this.ts.look(1).is("ASSIGN")) {				
				var isInner;
				if (this.ts.look(-1).is("VAR") || this.isInner) {
					name = this.namescope.last().alias+"-"+name;
					if (!this.namescope.last().is("GLOBAL")) isInner = true;
				}
				else if (name.indexOf("this.") == 0) {
					name = this.resolveThis(name);
				}
				
				if (this.lastDoc) doc = this.lastDoc;
				
				symbol = new JSDOC.Symbol(name, params, "OBJECT", doc, this.token, this.namescope);
				if (isInner) symbol.isInner = true;
				
			
				if (doc) JSDOC.Parser.addSymbol(symbol);
			}
			// foo: {}
			else if (this.ts.look(1).is("COLON") && this.ts.look(2).is("LEFT_CURLY")) {
				name = (this.namescope.last().alias+"."+name).replace("#.", "#");
				
				if (this.lastDoc) doc = this.lastDoc;
				
				symbol = new JSDOC.Symbol(name, params, "OBJECT", doc, this.token, this.namescope);
				
			
				if (doc) JSDOC.Parser.addSymbol(symbol);
				
				this.handleScope(name, symbol);
				/*
				this.namescope.push(symbol);
				
				var matching = this.ts.getMatchingToken("LEFT_CURLY");
				if (matching) matching.popNamescope = name;
				else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
				*/
			}
			// foo: x
			else if (this.ts.look(1).is("COLON")) {
				name = (this.namescope.last().alias+"."+name).replace("#.", "#");;
				
				if (this.lastDoc) doc = this.lastDoc;
				
				symbol = new JSDOC.Symbol(name, params, "OBJECT", doc, this.token, this.namescope);
				
			
				if (doc) JSDOC.Parser.addSymbol(symbol);
			}
			// foo(...)
			// xxxpedro this will only work if the parameters are all names. It won't
			// work on cases such as foo(3, bar(9), function callback(){})
			/*
			else if (this.ts.look(1).is("LEFT_PAREN")) {
				if (typeof JSDOC.PluginManager != "undefined") {
					var functionCall = {name: name};
				
					var cursor = this.ts.cursor;
					params = JSDOC.Walker.onParamList(this.ts.balance("LEFT_PAREN"));
					this.ts.cursor = cursor;
					
					for (var i = 0; i < params.length; i++)
						functionCall["arg" + (i + 1)] = params[i].name;
				
					JSDOC.PluginManager.run("onFunctionCall", functionCall);
					if (functionCall.doc) {
						this.ts.insertAhead(new JSDOC.Token(functionCall.doc, "COMM", "JSDOC", this.token));
					}
				}
			}
			*/
			this.lastDoc = null;
		}
		else if (this.token.is("FUNCTION")) { // it's an anonymous function
			if (
				(!this.ts.look(-1).is("COLON") || !this.ts.look(-1).is("ASSIGN"))
				&& !this.ts.look(1).is("NAME")
			) {

				// /**@scope name*/ function () {}
				// TODO: xxxpedro
				var last = this.ts.look(-1); 
				if (last.is("JSDOC"))
				{
					doc = new JSDOC.DocComment(last.data);
					var scopeName = doc.getTag("closure");
				}

				// TODO: xxxpedro
				if(scopeName)
				{
					name = this.namescope.last().alias+"-"+scopeName;
				}
				else
				{
					if (this.lastDoc) doc = this.lastDoc;
					
					name = "$anonymous";
					name = this.namescope.last().alias+"-"+name;
				}

				params = JSDOC.Walker.onParamList(this.ts.balance("LEFT_PAREN"));
				
				symbol = new JSDOC.Symbol(name, params, "FUNCTION", doc, this.token, this.namescope);
				
				// TODO: xxxpedro scope
				if(scopeName)
				{
					symbol.isa = "SCOPE";
					symbol.isNamespace = true;
					symbol.isScope = true;
					symbol.isClosure = true;
					symbol.thisObj = doc.getTag("this");
				}
				
				JSDOC.Parser.addSymbol(symbol);
				
				this.handleScope(name, symbol);
				/*
				this.namescope.push(symbol);
				
				var matching = this.ts.getMatchingToken("LEFT_CURLY");
				if (matching) matching.popNamescope = name;
				else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".");
				*/
				
				// update scope
/*
				if (symbol.thisObj)
				{
					var thisSymbol = JSDOC.Parser.symbols.getSymbol(symbol.thisObj);
					if (thisSymbol)
						thisSymbol.updateScope(this.namescope);
				}/**/

			}
		}
		/*
		else if (this.token.is("WITH")) {
			LOG.warn("withhhhs")
			LOG.warn(this.ts.look(2));
		}/**/
	}
	return true;
};


JSDOC.Walker.prototype.resolveName = function(namespace)
{
	var resolvedName;

	var namescope = this.namescope;
	var scopeIndex = this.namescope.length;

	var scopeSymbol;
	var scopeName;
	var newName;

	var root = namespace.split(".").shift();
	var path = namespace.replace(/\.prototype/g, "#").replace(/#\./, "#");

	while(--scopeIndex)
	{
		scopeSymbol = namescope[scopeIndex];

		if (scopeSymbol.isScope)
		{

			// abort
			if (scopeSymbol.getParam(root))
			{
				break;
			}

			scopeName = scopeSymbol.alias;
			newName = scopeName + "-" + namespace;
			if (JSDOC.Parser.symbols.getSymbol(newName))
			{
				resolvedName = newName;
				break;
			}
		}
	}

	return resolvedName ? resolvedName : namespace;
};

JSDOC.Walker.prototype.handleScope = function(name, symbol, prefix) {

	prefix = prefix || "";

	this.namescope.push(symbol);

	var token, index = 1;
	do
	{
		token = this.ts.look(index++);

	} while(!token.is("LEFT_CURLY"));

	//while (this.ts.next() && (token = this.ts.look(index++)) && !token.is("LEFT_CURLY")) ;

	if (token && token.is("LEFT_CURLY"))
		token.pushNamescope = prefix+symbol.alias;
	else
		LOG.warn("Something terrible just happened! :(");

	var matching = this.ts.getMatchingToken("LEFT_CURLY");
	if (matching) matching.popNamescope = prefix+symbol.alias;
	else LOG.warn("Mismatched } character. Can't parse code in file " + symbol.srcFile + ".", symbol);
}

/**
	Resolves what "this." means when it appears in a name.
	@param name The name that starts with "this.".
	@returns The name with "this." resolved.
 */
JSDOC.Walker.prototype.resolveThis = function(name) {

	name.match(/^this\.(.+)$/);
	var nameFragment = RegExp.$1;
	if (!nameFragment) return name;
	
	var symbol = this.namescope.last();
	
	// TODO: xxxpedro
	var overrideThis = symbol.thisObj;
	if (overrideThis)
		symbol = JSDOC.Parser.symbols.getSymbol(overrideThis+"");
	
	var scopeType = symbol.scopeType || symbol.isa;
	
	//TODO: xxxpedro
	if (overrideThis) {
		name = symbol.alias+"."+nameFragment;
	}
	
	// if we are in a constructor function, `this` means the instance
	else if (scopeType == "CONSTRUCTOR") {
		name = symbol.alias+"#"+nameFragment;
	}
	
	// if we are in an anonymous constructor function, `this` means the instance
	else if (scopeType == "INSTANCE") {
		name = symbol.alias+"."+nameFragment;
	}
	
	// if we are in a function, `this` means the container (possibly the global)
	else if (scopeType == "FUNCTION") {
		// in a method of a prototype, so `this` means the constructor
		if (symbol.alias.match(/(^.*)[#.-][^#.-]+/)) {
			var parentName = RegExp.$1;
			
			// xxxpedro scope
			parentName = symbol.resolveName(parentName);
			
			var parent = JSDOC.Parser.symbols.getSymbol(parentName);

			if (!parent) {
				if (JSDOC.Lang.isBuiltin(parentName)) parent = JSDOC.Parser.addBuiltin(parentName);
				else {
					if (symbol.alias.indexOf("$anonymous") < 0) // these will be ignored eventually
						LOG.warn("\""+symbol.alias+"\" requires \""+parentName+"\" to be documented first.", symbol);
				}
			}
			if (parent) name = parentName+(parent.is("CONSTRUCTOR")?"#":".")+nameFragment;
		}
		else {
			// TODO: xxxpedro
			//LOG.dir(symbol.comment.getTag("x"));
			//LOG.warn(":::" + typeof symbol.comment.getTag("this")[0]);
			// TODO: xxxpedro
			/*
			var parentName = symbol.comment.getTag("this")[0];
			var parent = parentName ?
					JSDOC.Parser.symbols.getSymbol(parentName+"") :
					this.namescope.last(1);
			/**/
			parent = this.namescope.last(1);
			name = parent.alias+(parent.is("CONSTRUCTOR")?"#":".")+nameFragment;
		}
	}
	// otherwise it means the global
	else {
		name = nameFragment;
	}
	
	return name;
};

JSDOC.Walker.onParamList = function(/**Array*/paramTokens) {
	if (!paramTokens) {
		LOG.warn("Malformed parameter list. Can't parse code.");
		return [];
	}
	var params = [];
	for (var i = 0, l = paramTokens.length; i < l; i++) {
		if (paramTokens[i].is("JSDOC")) {
			var paramType = paramTokens[i].data.replace(/(^\/\*\* *| *\*\/$)/g, "");
			
			if (paramTokens[i+1] && paramTokens[i+1].is("NAME")) {
				i++;
				params.push({type: paramType, name: paramTokens[i].data});
			}
		}
		else if (paramTokens[i].is("NAME")) {
			paramTokens[i].isDeclaration = true;
			params.push({name: paramTokens[i].data});
		}
	}
	return params;
};
