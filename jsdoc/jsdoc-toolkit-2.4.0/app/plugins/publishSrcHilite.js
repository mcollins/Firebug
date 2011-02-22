JSDOC.PluginManager.registerPlugin(
	"JSDOC.publishSrcHilite",
	{
		onPublishSrc: function(src) {
			var path = src.path;
			if (path in JsHilite.cache) {
				return; // already generated src code
			}
			else JsHilite.cache[path] = true;
			
			// xxxpedro performance
			var cache = JSDOC.FileCache[path];
			
			var sourceCode = cache.text;
			var lines = cache.lines;
			
			var hiliter = new JsHilite(sourceCode, src.charset, path); // xxxpedro performance - added path param
			src.hilited = hiliter.hilite(sourceCode, lines); // xxxpedro
		}
	}
);

function JsHilite(src, charset, srcPath) { // xxxpedro performance - added srcPath param

	// xxxpedro performance
	this.tokens = JSDOC.TokenReader.getAllTokens(srcPath);
	
	if (!charset) charset = "utf-8";
	
	// xxxpedro
	this.header = '<html><head><meta http-equiv="content-type" content="text/html; charset='+charset+'"> '+
		'<link rel=stylesheet href="../../code.css" type="text/css">' +
		'</head><body><pre>';
	this.footer = "</pre></body></html>";
	this.showLinenumbers = true;
}

JsHilite.cache = {};

JsHilite.prototype.hilite = function(sourceCode, lines) {

	var result = [];
	var lineNumber = 1;
	
	var tokens = this.tokens;
	
	// adjust the base location of links to allow source-to-doc references
	Link.base = "../../";
	
	
/*

var name, name2=value, name2=expr+some/(value-rest), name3=function(){}

[name] [equals] [until find ',' or ';' in deph==0] or..
[name] [equals] [until find 'keyword' in deph==0, but not after operator "+","-","="]


PROBLEMS with names:
	param variables
	name definition in objects
	name definition in multiple variable declaration


PROBLEMS:
	how to name scopes
	use different colors in source code?
			- reference --> link to definition
					- local reference
					- closure reference
					- global reference
					- with reference

			- definition --> link to itself or documentation

	how to present data
			- filter or group scope classes from class index?
			- include scope info?
					- and what happens in methods defined outside?


POSSIBILITIES
	- link title (tooltip) - ex: My.Resolved.Namespace(param) [file.html:123]
	- scope chain
	- inheritance chain
	- create table of name definitions
	- create table of name references

*/
	
// #################################################################################################


	var debug = false;

	var resolveNameNew = function(namespace, isDeclaration)
	{
		var names = namespace.split(".");
		var root = names.shift();

		if (!root) return [{name: namespace}];

		var parts = [];

		var rootSymbol;
		var lastSymbol;

		var scopeName;
		var scopeSymbol;
		var isConstructor;
		var isThis;

		var index = namescope.length-1;
		var symbols = JSDOC.Parser.symbols;

		// -------------------------------------------------------------------------

		if (debug) print();
		if (debug) print("resolving name: " + namespace);

		for (; !rootSymbol && (index >= 0); index--)
		{
			var isWithScope = false;

			var scopeName = namescope[index];

			if (scopeName.indexOf("(with)") == 0)
			{
				scopeName = scopeName.replace("(with)", "");
				isWithScope = true;
				if (debug) print("\tWITH scope found: " + scopeName);
			}

			var scopeSymbol = symbols.getSymbol(scopeName);

			if (scopeSymbol)
			{
				// this is just confusing!!
				// var name = value ==> is local definition
				// name = value ==> may not be definition
				// name: value ==> looks for names instead of scopes
				// function(param) ==> there is no way currently to find its parent
				if (!isDeclaration &&
						!scopeSymbol.isScope &&
						!isWithScope &&
						scopeSymbol.isa != "FUNCTION" &&
						root != "this")
				{
					if (debug) print("xxx " + scopeSymbol.isa);
					continue;
				}
			}

			if (debug) print("\tsearching for root in scope: " + scopeName + " ==> " + scopeSymbol)

			if (root == "this")
			{
				isThis = true;

				if (scopeSymbol)
				{
					if (scopeSymbol.isa == "CONSTRUCTOR")
					{
						root = scopeSymbol.alias;
						isConstructor = true;
					}
					else
						root = scopeSymbol.thisObj ? scopeSymbol.thisObj : scopeSymbol.memberOf;
				}
				else
				{
					root = null;
				}

				if (root)
					rootSymbol = symbols.getSymbol(root);

				if (debug) print("\tfound \"this\" root as: " + root);
				break;
			}

			if (scopeSymbol && !isWithScope)
			{
				var param = scopeSymbol.getParam(root);

				if (debug) print("\tchecking if \""+ root +"\" is a parameter of scope " + scopeName);

				if (param)
				{
					if (debug) print("\tname \""+ root +"\"found as a parameter of scope " + scopeName);

					rootSymbol = null;
					break;
				}
			}

			if (scopeSymbol)
			{

				if (scopeSymbol.isClosure || scopeSymbol.isa == "FUNCTION")
				{
					//rootSymbol = scopeSymbol.getScopeMember(root);

					var namehack = scopeName + "-" + root;
					rootSymbol = symbols.getSymbol(namehack);

				}
				else
				{
					//rootSymbol = scopeSymbol.getMember(root);

					var namehack = scopeName + "." + root;
					rootSymbol = symbols.getSymbol(namehack);

				}

				if (debug) print("\ttesting name alias: " + namehack + " ==> " + rootSymbol);

			}

		}

		// global scope
		if(!rootSymbol)
		{
			rootSymbol = symbols.getSymbol(root);
			if (debug) print("\ttrying global: " + root + " ==> " + rootSymbol);
		}

		parts.push({
			symbol: rootSymbol,
			name: isThis ? "this" : root
		});

		if (debug)
		{
			if (rootSymbol)
			print("\tname lookup found: " + namespace + " --> " + rootSymbol.alias);
			else
			print("\tname lookup NOT FOUND: " + namespace);
		}

		// -------------------------------------------------------------------------

		if (debug) print();

		var memberSymbol;
		var proto = isConstructor ||
				// if the "this" keyword is used, then we'll try to guess
				// if it refers to the prototype object using the scopeName string
				isThis && /#[\w_$][\w\d_$]+$/.test(scopeName);

		var part;

		lastSymbol = rootSymbol;
		for(var i = 0, l = names.length, name; i < l; i++)
		{
			name = names[i];

			if (lastSymbol)
			{
				if (name == "prototype")
				{
					proto = true;
				}
				else
				{
					var separator = proto ? "#" : ".";
					var namehack = lastSymbol.alias + separator + name;
					if (debug) print("\t" + namehack);
					var memberSymbol = symbols.getSymbol(namehack);
					/**/

/*
					var memberSymbol = proto ?
							lastSymbol.getProtoMember(name) :
							lastSymbol.getMember(name);/**/

					/*
					lastSymbol = proto ?
							lastSymbol.getProtoMember(name) :
							lastSymbol.getMember(name);/**/

					if (debug) print("\tproto: " + proto + "	name : " + name + " = " + lastSymbol.alias + ", " + memberSymbol);
					lastSymbol = memberSymbol;
					proto = false;
				}
			}
			else
			{
				proto = false;
			}

			parts.push({
				symbol: proto ? null : lastSymbol,
				name: name
			});
		}

		// -------------------------------------------------------------------------

		if (debug) print();

		return parts;
	};



// #################################################################################################

/*

// OBSOLETE CODE - SHOULD BE REMOVED WHEN ITS DONE

	var normalizeNamespaceOld = function(namespace)
	{
		var names = namespace.split(".");
		var root = names.shift();
		var path = names.join(".");

		if (root == "this")
		{
			var scopeName = namescope[namescope.length-1];
			var scopeSymbol = symbols.getSymbol(scopeName);

			if (scopeSymbol)
				root = scopeSymbol.thisObj ? scopeSymbol.thisObj : scopeSymbol.memberOf;
			else
				root = "_global_";
				//print("FAIL AT " + scopeName + " " + scopeSymbol + " " + namescope.length);
		}

		//path = path.replace(/\.prototype\./g, "#");

		var object =
		{
			root: root,
			namespace: path
		};

		return object;
	};

	var lookupNameOld = function(namespace)
	{
		var symbols = JSDOC.Parser.symbols;

		var object;
		var symbol;

		//var index = 0;
		//var length;
		//var found;

		object = normalizeNamespaceOld(namespace);
		symbol = symbols.getSymbol(object.root);

		if (symbol)
		{
			var separator = symbol.isConstructor ? "#" : ".";
			var resolvedNamespace = symbol.alias + separator + object.namespace;
			var resolvedSymbol = symbols.getSymbol(resolvedNamespace);
		}


//		 do
//		 {
//			 object = normalizeNamespaceOld(namespace);
//			 symbol = symbols.getSymbol(object.root);
//
//			 // continue... augments[]
//
//		 } while(!found);


		return resolvedSymbol ? resolvedNamespace : namespace;
	};


	var lookupScopeOld = function(namespace)
	{
		var symbols = JSDOC.Parser.symbols;

		var object;
		var symbol;
		var resolvedNamespace;

		var found;
		var index = namescope.length-1;

		while (!found && (index >= 0))
		{
			var scopeName = namescope[index];
			var scopeSymbol = symbols.getSymbol(scopeName);
			//print("scopeName: " + scopeName + ",	scopeSymbol:" + scopeSymbol);

			if (scopeSymbol)
			{
				var separator = scopeSymbol.isScope ? "-" : ".";
				var paramFound = false;

				resolvedNamespace = scopeName + separator + namespace;
				symbol = symbols.getSymbol(resolvedNamespace);

				if (symbol)
				{
					found = true;
				}
				else
				{
					// check params
					//print("..............................................................");
					object = normalizeNamespaceOld(namespace);

					var root = object.root;
					var path = object.namespace;

					var params = scopeSymbol.params;
					var param;

					for (var i=0, l=params.length; i<l; i++)
					{
						param = params[i];
						if (param.name == root)
						{
							paramFound = true;
							break;
						}
					}

					if (paramFound)
					{
						if (path)
						{
							if (param.type)
							{
								symbol = symbols.getSymbol(param.type);

								if (symbol)
								{
									separator = symbol.isConstructor ? "#" : ".";
									resolvedNamespace = symbol.alias + separator + path;
									symbol = symbols.getSymbol(resolvedNamespace);

									found = !!symbol;
								}
							}
						}
						else
						{
							found = true;
							resolvedNamespace = scopeName;
						}
					}
				}

				//print("resolvedNamespace: " + resolvedNamespace + ", " + symbol + "	" + index + "/" + namescope.length);
			}

			index--;

			//print("LOOP" + !symbol && (index >= 0));
		}

		return found ? resolvedNamespace : namespace;
	};

	var resolveNameOld2 = function(namespace)
	{
		var symbols = JSDOC.Parser.symbols;

		var resolvedNamespace;

		// if "this" is specified we know the scope where to look for names,
		// which is the last scope in the scope chain
		if (namespace.indexOf("this.") == 0)
		{
			resolvedNamespace = lookupNameOld(namespace);
		}
		// otherwise we need to look up in the scope chain
		else
		{
			resolvedNamespace = lookupScopeOld(namespace);
		}

		return resolvedNamespace ? resolvedNamespace : namespace;
	};
	
// #################################################################################################
	
	var resolveNameOld1 = function(name)
	{
	
		var symbols = JSDOC.Parser.symbols;
	
		if (name.indexOf("this.") == 0)
		{
			var scopeName = namescope[namescope.length-1];
			var scopeSymbol = symbols.getSymbol(scopeName);

//			 var thisSymbol = scopeSymbol.thisObj ?
//					 symbols.getSymbol(scopeSymbol.thisObj) : null;
//
//			 var parentName = thisSymbol ? thisSymbol.alias : scopeSymbol.memberOf;

			var parentName = scopeSymbol.thisObj ? scopeSymbol.thisObj : scopeSymbol.memberOf;


			//var parentName = scopeSymbol.memberOf;
			var parentSymbol = symbols.getSymbol(parentName);

			var rest = name.replace(/^this\./, "");

			if (parentSymbol.hasMethod(rest))
			{
				var separator = parentSymbol.isConstructor ? "#" : ".";
				newName = parentSymbol.alias + separator + rest;
				symbol = parentSymbol;
			}

			//print("scopeName: " + scopeName + "	scopeSymbol: " + scopeSymbol + " rest: " + rest);
			//print(parentSymbol.hasMethod(rest));
			//print("-----------------------------------------------------------------");
		}
		else
		{
			//var symbol = symbols.getSymbol(name);
			//var newName = name;

			var symbol;
			var newName;

			//if (symbol) print("name= " +name+ "	s.alias= " + symbol.alias + "	isa= " + symbol.isa);

			var index = namescope.length-1;
			while (!symbol && (index >= 0))
			{
				var scopeName = namescope[index];
				var scopeSymbol = symbols.getSymbol(scopeName);
				//print("scopeName: " + scopeName + ",	scopeSymbol:" + scopeSymbol);

				if (scopeSymbol)
				{
					var separator = scopeSymbol.isScope ? "-" : ".";
					newName = scopeName + separator + name;
					symbol = symbols.getSymbol(newName);
					//print("newName: " + newName + ", " + symbol + "	" + index + "/" + namescope.length);
				}

				index--;

				//print("LOOP" + !symbol && (index >= 0));
			}

			//if (symbol) print("END name= " +name+ "	s.alias= " + symbol.alias + "	isa= " + symbol.isa);

			//print();
		}

		return symbol ? newName : name;
	};

*/
// #################################################################################################


	var namescope = [];
	var symbols = JSDOC.Parser.symbols;
	
	for (var i=0, length = tokens.length, token; i < length; i++)
	{
		token = tokens[i];
		
		var data = token.data;
		
		// to log conditional debug info change the condition below
		//debug = data == "copyObject";

		if (token.pushNamescope)
		{
			//result.push("PUSH["+token.pushNamescope+"]");
			result.push("<span class='scope' rel='"+token.pushNamescope+"'>");
			namescope.push(token.pushNamescope);
		}

		if (token.type == "NEWLINE")
			result.push("\n");
	
		else if (token.type == "WHIT")
			result.push(data);
	
		else if (token.type == "NAME")
		{
			var isDeclaration = token.isDeclaration;
			var parts = resolveNameNew(data, isDeclaration);
			var SPAN = "<span class=\"NAME\">";

			if (parts.length > 0)
			{

				for(var pi = 0, pl = parts.length, part; pi < pl; pi++)
				{

					if (isDeclaration && pi == pl-1)
					{
						SPAN = "<span class=\"NAME NAMEDEF\">";
					}

					part = parts[pi];

					var partSymbol = part.symbol;
					var partName = part.name;

					if (debug)
					{
						if (partSymbol)
							print("partName: " + partName + "	partSymbol: " + partSymbol + " " + partSymbol.alias);
						else
							print("partName: " + partName + "	partSymbol: " + partSymbol);
					}

					if (partSymbol)
					{
						result.push(SPAN+new Link().toSrc(partSymbol.srcFile, partSymbol.lineNumber).withText(partName)+"</span>");
					}
					else
					{
						if (partName == "prototype")
						{
							result.push("<span class=\"KEYW\">prototype</span>");
						}
						else
						{
							result.push(SPAN + partName + "</span>");
						}
					}

					if (pi < pl-1)
					{
						result.push("<span class=\"PUNC\">.</span>");
					}

				};
			}
			else
			{
				result.push("<span class=\"NAME\">"+new Link().toSymbol(data)+"</span>");
			}
		}
		else
			result.push("<span class=\""+token.type+"\">"+data.replace(/</g, "&lt;").replace(/>/g, "&gt;")+"</span>");
			

		if (token.popNamescope)
		{
			if (token.popNamescope == namescope[namescope.length-1])
			{
				//result.push("POP["+token.popNamescope+"]");
				result.push("</span>");
				namescope.pop();
			}
		}

	}
	
	// restore the default value
	Link.base = "";
	
	var str = result.join("");
	
	var html = ['</pre><div class="lineNumbers">'];
	var hl = 1;
	
	// render the line number divs
	for(var l=1; l<=lines; l++)
	{
		html[hl++] = '<div><a name="L';
		html[hl++] = l;
		html[hl++] = '" href="#L';
		html[hl++] = l;
		html[hl++] = '">';
		html[hl++] = l;
		html[hl++] = '</a></div>';
	}
	
	html[hl++] = '</div><div id="sourceSpacer" class="lineNumbers"></div>';
	return this.header+str+html.join("")+this.footer;
};