/**
 * Software License Agreement (BSD License)
 * 
 * Copyright (c) 2010 IBM Corporation.
 * All rights reserved.
 * 
 * Redistribution and use of this software in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 * 
 * * Neither the name of IBM nor the names of its
 *   contributors may be used to endorse or promote products
 *   derived from this software without specific prior
 *   written permission of IBM.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * An implementation of a {@link CompilationUnit} for the command line debugger example.
 * 
 * @constructor
 * @param url compilation unit URL - a {@link String}
 * @param context the {@link JavaScriptContext} this compilation unit is contained in
 * @type CFCompilationUnit
 * @return a CFCompilationUnit
 * @version 1.0
 */
function CFCompilationUnit(url, context) {
	CompilationUnit.call(this, url, context);
	this.source = null;
}

/** 
 * CFCompilationUnit is a subclass of CompilationUnit
 */

CFCompilationUnit.prototype = subclass(CompilationUnit.prototype);

/**
 * Override from superclass.
 */
CFCompilationUnit.prototype.setBreakpoint = function(lineNumber) {
	lineNumber = parseInt(lineNumber);
	var breakpoint = new CFBreakpoint(this, lineNumber);
	var handler = function(response) {
		var bp = response["body"]["breakpoint"];
		if (bp) {
			breakpoint._setHandle(bp["handle"]);
			breakpoint._installed();
		} else {
			breakpoint._failedInstall();
		}
	};
	this._addBreakpoint(breakpoint);
	this.getBrowserContext().getBrowser()._sendRequest({"command":"setbreakpoint", "context_id":this.getBrowserContext().getId(), "arguments":{"target": this.getURL(), "line": lineNumber}}, this,  handler);
	return breakpoint;
};


/**
 * Override from superclass.
 */
CFCompilationUnit.prototype.getSource = function(listener) {
	if (this.source) {
		listener.call(null, this.source);
		return;
	}
	// retrieve source
	var handler = function(response) {
		var script = response["body"]["script"];
		if (script) {
			this.source = script["source"];
			if (this.source) {
				listener.call(null, this.source);
			}
		}
	};
	this.getBrowserContext().getBrowser()._sendRequest({"command":"script", "context_id":this.getBrowserContext().getId(), "arguments":{ "includeSource":true, "url":this.getURL()}}, this, handler);
};
