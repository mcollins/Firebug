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
 * An implementation of a {@link Browser} for the example command line debugger.
 * 
 * @constructor
 * @param host the host IP address to connect to as a {@link String}
 * @param port the port number to connect to
 * @type CFBrowser
 * @return a CFBrowser
 * @version 1.0
 */
function CFBrowser(host, port) {
	Browser.call(this); // invoke superclass constructor
	this.host = host;
	this.port = port;
	this.socket = null;
	this.output = null;
	this.input = null;
	this.sequence = 0;
	this.initialized = false;
	this.verbose = true;
	this.handlers = []; // maps sequence numbers to handler objects
	importPackage(java.net);
	importPackage(java.io);
	this._setConnected(false);
};

/** 
 * Function to extend an object.
 * 
 * @function
 */
function subclass(obj) {
	function f(){};
	f.prototype = obj;
	return new f();
}

CFBrowser.prototype = subclass(Browser.prototype);

/**
 * Connects to the remote host/port via a socket and sends the handshake.
 * Sets up a runnable that reads packets from the socket. The connection
 * is not complete until a handshake is received back.
 * 
 * @function
 */
CFBrowser.prototype.connect= function() {
	if (!this.socket) {
		this.socket = new java.net.Socket(this.host, this.port);
		this.output = new java.io.BufferedOutputStream(this.socket.getOutputStream());
		this.input = new java.io.InputStreamReader(this.socket.getInputStream(), "utf-8");
		var localThis = this;
		// start a runnable to read packets
		var obj = { run: function() {
			var data = localThis.readPackets(); 
			while (data) {
				data = localThis.readPackets();
			}
			print("socket closed");
		}};
		var eventReader = new java.lang.Runnable(obj);
		var eventThread = new java.lang.Thread(eventReader);
		eventThread.start();
		
		// send handshake
		this.output.write(this._toUTF8("CrossfireHandshake\r\n"));
		this.output.flush();
	}
};

/**
 * Called by the thread reading packets.
 * 
 * @function
 * @returns the line read from the socket or <code>null</code> if closed
 */
CFBrowser.prototype.readPackets = function() {
	var line = this.readLine(-1);
	if (line && line.length > 2) {
		if (line.length > 15) {
			var header = line.slice(0,15);
			if (header == "Content-Length:") {
				var length = line.substring(15, line.length - 2);
				this.readLine(-1); // extra newline
				line = this.readLine(length);
			}
		}
		this.dispatchEvent(line);
	}
	return line;
};

/**
 * Reads and returns the next line from the socket or <code>null</code> if none.
 * 
 * @function
 * @param length the number of characters to read, or -1 to read until end of line
 * @returns the next line as a {@link String} or <code>null</code> of none
 */
CFBrowser.prototype.readLine = function(length) {
	var count = 0;
	var c = this.input.read();
	count++;
	var line = new String();
	while (c >= 0) {
		c = java.lang.Character.toString(c);
		line = line + c;
		if (length >= 0 && count == length) {
			return line;
		}
		if (c == "\n") {
			return line;
		}
		c = this.input.read();
		count++;
	}
	return null;
};

/**
 * Disconnects by closing the socket.
 * 
 * TODO: Is there a better way or Crossfire command to do this?
 * 
 * @function
 */
CFBrowser.prototype.disconnect = function() {
	if (this.socket) {
		this.socket.close();
	}
};

/**
 * Sends the version command to the remote browser.
 * 
 * @function
 */
CFBrowser.prototype.version = function() {
	var handler = function(response) {
		var version = response["body"]["version"];
		if (version) {
			print("Version: " + version);
		}
	};
	this._sendRequest({"command":"version"}, this, handler);
};

/**
 * Creates a packet out of the request object and sends it over the socket.
 * The listener is notified of the response
 * 
 * @function
 * @param request object to JSONify
 * @param receiver the object context in which to call the handler, or <code>null</code>
 * @param method function that handles the response or <code>null</code>
 */
CFBrowser.prototype._sendRequest = function(request, receiver, method) {
	// add sequence number + request
	request["type"] = "request";
	request["seq"] = ++this.sequence;
	var text = JSON.stringify(request) ;
	var length = "Content-Length:" + text.length + "\r\n\r\n";
	var packet = length + text + "\r\n";
	if (method) {
		this.handlers[this.sequence] = {"receiver": receiver, "method": method};
	}
	if (this.verbose) {
		print("[SENT]" + packet);
	}
	this.output.write(this._toUTF8(packet));
	this.output.flush();
};

/**
 * Initializes the initial known set of contexts after a handshake is received 
 * from the remote browser.
 * 
 * @function
 */
CFBrowser.prototype._initializeContexts = function() {
	var handler = function(response) {
		var contexts = response["body"]["contexts"];
		for ( var i = 0; i < contexts.length; i++) {
			var c = contexts[i];
			var context = new CFBrowserContext(c["context_id"], c["href"], this);
			var curr = c["current"];
			this._contextCreated(context);
			if (curr) {
				this._setFocusContext(context);
			}
		}
	};
	this._sendRequest({"command":"listcontexts"}, this, handler);
};

/**
 * Decodes the packet and processes the response or event.
 * 
 * @function
 * @param packet a string (line) of text read from the socket
 */
CFBrowser.prototype.dispatchEvent = function(packet) {
	if (this.verbose) {
		print("[RECEIVED]" + packet);
	}
	if (packet == "CrossfireHandshake\r\n") {
		this._setConnected(true);
		this._initializeContexts();
	} else {
		var object = JSON.parse(packet);
		var command = object["command"];
		if (command) {
			var req = object["request_seq"];
			var callback = this.handlers[req];
			if (callback) {
				callback.method.call(callback.receiver, object);
				this.handlers[req] = null;
			} else {
				print("no handler for request: " + req);
			}
		}
		var event = object["event"];
		if (event) {
			var handler = this[event];
			if (handler) {
				handler.apply(this, [object]);
			} else {
				print("Unhandled event: " + event);
			}
		}
	}
};

/**
 * Called when an 'onContextCreated' event is received.
 * Creates a new context from the packet and notifies listeners.
 * 
 * @param packet the event packet
 */
CFBrowser.prototype.onContextCreated = function(packet) {
	var context = new CFBrowserContext(packet["context_id"], packet["data"]["href"], this);
	this._contextCreated(context);
};

/**
 * Called when an 'onContextChanged' event is received.
 * Sets the new focus context and notifies listeners.
 * 
 * @param packet the event packet
 */
CFBrowser.prototype.onContextChanged = function(packet) {
	var id = packet["new_context_id"];
	var curr = this.getBrowserContext(id);
	this._setFocusContext(curr);
};

/**
 * Called when an 'onContextDestroyed' event is received.
 * Disposes the associated context and notifies listeners.
 * 
 * @param packet the event packet
 */
CFBrowser.prototype.onContextDestroyed = function(packet) {
	this._contextDestroyed(packet["context_id"]);
};

/**
 * Called when an 'onContextLoaded' event is received.
 * Marks the associated context as loaded and notifies listeners.
 * 
 * @param packet the event packet
 */
CFBrowser.prototype.onContextLoaded = function(packet) {
	this._contextLoaded(packet["context_id"]);
};

/**
 * Called when an 'onScript' event is received.
 * Creates a new script object in the associated context.
 * 
 * @param packet the event packet
 */
CFBrowser.prototype.onScript = function(packet) {
	var context = this.getBrowserContext(packet["context_id"]);
	if (context) {
		context._scriptCompiled(packet["data"]["href"]);
	} else {
		print("Context associated with script did not exist!");
	}
};

/**
 * Called when an 'onBreak' event is received.
 * Notifies the associated execution context that it has suspended.
 * 
 * @param packet event packet
 */
CFBrowser.prototype.onBreak = function(packet) {
	var context = this.getBrowserContext(packet["context_id"]);
	if (context) {
		var js = context.getJavaScriptContext();
		if (js) {
			var url = packet["data"]["url"];
			var cu = context.getCompilationUnit(url);
			if (cu) {
				var line = packet["data"]["line"];
				js._suspended(cu, line);
			} else {
				print("No compilation unit associated with break event!");
			}
		} else {
			print("No JavaScript context associated with break event!");
		}
	} else {
		print("No context associated with break event!");
	}
};

/**
 * Called when an 'onResume' event is received.
 * Notifies the associated execution context that it has resumed.
 * 
 * @param packet event packet
 */
CFBrowser.prototype.onResume = function(packet) {
	var context = this.getBrowserContext(packet["context_id"]);
	if (context) {
		var js = context.getJavaScriptContext();
		if (js) {
			js._resumed();
		} else {
			print("No JavaScript context associated with resume event!");
		}
	} else {
		print("No context associated with resume event!");
	}
};

/**
 * Sets verbose mode - i.e. whether to echo packet send/receives.
 * 
 * @function
 * @param verbose whether in verbose mode
 */
CFBrowser.prototype.setVerbose = function(verbose) {
	this.verbose = verbose;
};

/**
 * Called when a 'closed' event is received.
 * Disconnects from the remote browser.
 * 
 * @param packet the event packet
 */
CFBrowser.prototype.closed = function(packet) {
	this._setConnected(false);
};

/**
 * Converts a string to its UTF-8 bytes.
 * 
 * @function
 */
CFBrowser.prototype._toUTF8 = function(string) {
	return new java.lang.String(string).getBytes("utf-8");
};
