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
 * An implementation of a {@link Breakpoint} for the example command line debugger.
 * 
 * @constructor
 * @param compilationUnit the {@link CompilationUnit} unit that contains this breakpoint
 * @param lineNumber the source code line number the breakpoint is set on
 * @type CFBreakpoint
 * @return a {@link CFBreakpoint}
 * @version 1.0
 */
function CFBreakpoint(compilationUnit, lineNumber) {
	Breakpoint.call(this, compilationUnit, lineNumber);
	this.handle = null; // assigned by the back end once installed
}

/** 
 * CFBreakpoint is a subclass of Breakpoint
 */

CFBreakpoint.prototype = subclass(Breakpoint.prototype);

/**
 * Override from superclass
 */
CFBreakpoint.prototype.clear = function() {
	if (!this.isCleared()) {
		var handler = function(response) {
			if (response["success"]) {
				this.getCompilationUnit()._removeBreakpoint(this);
				this._cleared();
			}
		};
		var bc = this.getCompilationUnit().getBrowserContext();
		bc.getBrowser()._sendRequest({"command":"clearbreakpoint", "context_id": bc.getId(), "arguments":{"target":this.getCompilationUnit().getURL(), "handle":this.handle, "line":this.getLineNumber()}}, this, handler);
	}
};

/**
 * Sets the handle of this breakpoint once it has been installed by the back end.
 * 
 * @param handle breakpoint handle as a {@link String}
 * @function
 */
CFBreakpoint.prototype._setHandle  = function(handle) {
	this.handle = handle;
};