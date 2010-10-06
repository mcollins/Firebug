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
 * An implementation of a {@link JavaScriptContext} for the command line debugger example.
 * 
 * @constructor
 * @param browserContext the browser context that contains the execution context
 * @type CFExecutionContext
 * @return a CFExecutionContext
 * @version 1.0
 */
function CFExecutionContext(browserContext) {
	JavaScriptContext.call(this, browserContext);
	this.initialized = false;
}

/** 
 * CFExecutionContext is a subclass of JavaScriptContext
 */

CFExecutionContext.prototype = subclass(JavaScriptContext.prototype);

/**
 * Overrides resume from superclass to provide Crossfire implementation.
 * 
 *  @function
 */
CFExecutionContext.prototype.resume = function() {
	if (this.isSuspended()) {
		var handler = function(response) {
			if (response["success"]) {
				this._resumed();
			}
		};
		this.getBrowserContext().getBrowser()._sendRequest({"command":"continue", "context_id":this.getBrowserContext().getId()}, this, handler);	
	}
};

