/* Released under BSD license (see license.txt) */
/*
 * dojofirebugextension 
 * Copyright IBM Corporation 2010, 2010. All Rights Reserved. 
 * U.S. Government Users Restricted Rights -  Use, duplication or disclosure restricted by GSA ADP 
 * Schedule Contract with IBM Corp. 
 */


/**
 * Helper functions to set dojo related breakpoints.
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */


define([
        "firebug/firebug",
        "firebug/js/fbs",
        "firebug/js/stackFrame",
        "firebug/lib/object",
        "firebug/lib/trace",
        "dojo/lib/filtering"
       ], function dojoDebuggerFactory(Firebug, FBS, StackFrame, Obj, FBTrace, DojoFilter)
{

const Ci = Components.interfaces;
const PCMAP_SOURCETEXT = Ci.jsdIScript.PCMAP_SOURCETEXT;
    
    
var DojoDebug = {};
 
/* ****************************************************************************
 * ****************************************************************************
 * ****************************************************************************
 */       
    
var DebugInfo = function() {
    this.fnExists = false;
    this.fnName = '(undefined)'; //FIXME i18n!
    this.scriptInfo = null;
};
DebugInfo.prototype = 
{
        
        getFnName: function() {
            return this.fnName;
        },
        
        /**
         * sets the fn name for this debug info object. Also sets fnExists to true.
         */
        setFnName: function(aName) {
            this.fnName = aName;
            this.fnExists = true;
        },
        
        /**
         * sets the scriptInfo to this obj
         */
        setScriptInfo: function(sourceFile, lineNo) {
            this.scriptInfo = {
                'sourceFile': sourceFile,
                'lineNo': lineNo                    
            };
        },

        /**
         * returns the sourceFile obj associated to this debugInfo
         * @return SourceFile
         */
        /*fbug SourceFile*/getSourceFile: function() {
            if(!this.scriptInfo) {
                return;
            }
            return this.scriptInfo.sourceFile;
        },

        /**
         * returns the lineNo associated to this debugInfo
         * @return int
         */
        /*int*/getLineNo: function() {
            if(!this.scriptInfo) {
                return;
            }
            return this.scriptInfo.lineNo;
        },

        /**
         * returns true if there is a BP currently set for this debugInfo
         */
        hasBreakpoint: function() {
            if(!this.getSourceFile() || !this.getLineNo()) {
                return false;
            }
            return FBS.findBreakpoint(this.getSourceFile().href, this.getLineNo()) != null;
        }
};

/**
 * dojo debugger service. It's the contact with the Firebug debugger
 */
var DojoDebugger = function(/*DojoAccessor*/ dojoAccessor) {
    this.dojoProxy = dojoAccessor;
};
DojoDebugger.prototype = 
{
        destroy: function() {
            delete this.dojoProxy;
        },

        /**
         * toggles the BP associated to the given debugInfo object
         * @param fnInfo
         */
        toggleBreakpointInFunction: function(/*DebugInfo*/fnInfo) {
            var sourceFile = fnInfo.getSourceFile();
            var lineNo = fnInfo.getLineNo();
            if(!sourceFile || !lineNo) {
                return;
            }
        
            //FIXME this is the brute-force way... find a better one
            if (fnInfo.hasBreakpoint()) {
                Firebug.Debugger.clearBreakpoint(sourceFile, lineNo);
            } else {
                Firebug.Debugger.setBreakpoint(sourceFile, lineNo);
            }
                
        },

        /**
         * returns the lineNo of the first executable line of the given jsd script.
         * @param script
         * @param sourceFile
         * @return lineNo (int)
         */
        /*lineNo*/_findFirstExecutableLine: function(script, sourceFile) {

            //FIXME check this code. I don't know if it works on every situation...            
            //FIXME I don't believe this is cross-browser valid code...we are using jsdIScript api
            
            var scriptAnalyzer = sourceFile.getScriptAnalyzer(script);
            if(!scriptAnalyzer) {
                return;
            }

           //UI's line number (for the end user)
            var lineNo = scriptAnalyzer.getBaseLineNumberByScript(script);

            var pcmap = sourceFile.pcmap_type;
            if(!pcmap) {
                pcmap = PCMAP_SOURCETEXT;
            }

            var jsdBaseLine = script.baseLineNumber;
            var scriptLength = script.lineExtent;
                        
            var jsdLine2 = lineNo + (sourceFile.getBaseLineOffset());
            if(scriptLength == 1) {
                //FIXME HACK! magic...
                jsdLine2 = jsdLine2 - 1; 
            }
            var jsdLine = jsdLine2;

            //while initialization values...
            var isExec = false;
            jsdLine = jsdLine - 1;
            while(!isExec && (jsdLine <= (jsdBaseLine + scriptLength))) {
                //let's try with the next line, assuming this line is a comment.       
                jsdLine = jsdLine + 1;
                isExec = script.isLineExecutable(jsdLine, pcmap);            
            }
            if(isExec) {
                var newLineNo = jsdLine - (sourceFile.getBaseLineOffset());
                lineNo = newLineNo;
            }

            return lineNo;
        },

        /**
         * returns debugger information about a given function
         * @param context
         * @param fn
         * @return DebugInfo 
         */
        /*DebugInfo*/getDebugInfoAboutFunction: function(/*fbug context*/ context, fn, label) {
        
            var fnInfo = new DebugInfo();
            
            if(!fn) {
                return fnInfo;
            }

            var script = Firebug.SourceFile.findScriptForFunctionInContext(context, fn);            
            var fnName = label;
            if (!fnName) {
                if (script) {
                    try {
                        fnName = StackFrame.getFunctionName(script, context);
                    } catch (exc) {
                        //$$HACK
                        fnName = fn.name; 
                    }
                } else {
                    fnName = fn.name;
                }
            }
            
            fnInfo.setFnName(fnName);

            if (!script) {
              return fnInfo;
            }
            
            var lineNo = null;
            var sourceFile = Firebug.SourceFile.getSourceFileByScript(context, script);
            if (!sourceFile) {
                return fnInfo;
            }
            
            lineNo = this._findFirstExecutableLine(script, sourceFile);
            fnInfo.setScriptInfo(sourceFile, lineNo);
                        
            return fnInfo;
        },
        
        /**
         * returns the debug information associated to the connect function caller frame.
         * @param context
         * @return DebugInfo, or null if we cannot find a calling stacktrace
         */
        /*DebugInfo*/getDebugInfoAboutConnectCaller: function(/*fbug context*/context) {
            //'connect place' -> dojo.connect impl -> (_connect wrapper from _Widget) -> our proxy -> dojo._connect impl
            return this.getDebugInfoAboutCaller(context, this.dojoProxy.getStackTraceDepthForConnect(context));
        },
        
        /**
         * returns the debug information associated to the subscribe function caller frame.
         * @param context
         * @return DebugInfo, or null if we cannot find a calling stacktrace
         */
        /*DebugInfo*/getDebugInfoAboutSubscribeCaller: function(/*fbug context*/context) {
            return this.getDebugInfoAboutCaller(context, this.dojoProxy.getStackTraceDepthForSubscribe(context));
        },
        
        /**
         * returns the debug information associated to the caller frame.
         * @param context
         * @param stackDepth the depth in the stacktrace where the call was made
         * @return DebugInfo, or null if we cannot find a calling stacktrace
         */
        /*DebugInfo*/getDebugInfoAboutCaller: function(/*fbug context*/context, stackDepth) {

            var stackTrace = Firebug.Debugger.getCurrentStackTrace(context);
            if(!stackTrace || !stackTrace.frames) {
                return null;
            }

            var callerFrame = this._findCallerFrame(stackTrace, context, stackDepth);
   
            var callerInfo = new DebugInfo();
            callerInfo.setFnName(callerFrame.fn);
            callerInfo.setScriptInfo(callerFrame.sourceFile, callerFrame.line);
   
            return callerInfo;
        },
        
        _findCallerFrame: function(stackTrace, context, stackDepth) {
           var isChromebugActive = _stringInclude(stackTrace.frames[1].href, 'chrome://'); //hack!

           stackDepth = this._computeChromeOffeset(isChromebugActive, stackDepth, stackTrace);
           
           var frame = stackTrace.frames[stackDepth];
           

           /*
        * if chromebug is installed , we need to add 4 places . Why:
        * Because Chromebug makes some stackframes to be available! These are the extra frames:
        * "fn: anonymous file: chrome://firebug/content/lib.js (2595)"
        * "fn: anonymous file: chrome://browser/content/browser.xul -> chrome://dojofirebugextension/content/dojofirebugextension.js (772)"
        * "fn: anonymous file: chrome://browser/content/browser.xul -> chrome://dojofirebugextension/content/dojofirebugextension.js (105)"
        * "fn: (?) file: file:///C:/home/pato/prog/firebug/workspace/DojoTestPrj/WebContent/standard_1.5.0-20100812-IBM_dojo_profilebuild/dojo/dojo.js.uncompressed.js (3519)"
        *
        * IMPORTANT: Beware that Firefox sometimes returns prefix chrome:// but sometimes prefix file:// ! This breaks our assumptions
        * for the computeChromeOffset method...
        */       
           
           return frame;
       },

       /**
        * IMPORTANT: Beware that Firefox sometimes returns prefix chrome:// but sometimes prefix file:// ! 
        * This breaks our assumptions for the _computeChromeOffeset method...
        * @param isChromebugActive
        * @param stackDepth
        * @param stackTrace
        * @return int - the real index
        */
       /*index (int)*/_computeChromeOffeset: function(isChromebugActive, stackDepth, stackTrace) {
            if (!isChromebugActive) {
                return stackDepth;
            }
            
            var index = 0;
            var realIndex = 0;
            
            while (index <= stackDepth) {
                
                //HACK due to firefox not always returning prefix chrome:// for FF files...for example: firebug-service.js
                if (!_stringInclude(stackTrace.frames[realIndex].href, 'chrome://') && !_stringInclude(stackTrace.frames[realIndex].href, '/modules/')) {
                      index++;
                }
                
                if(index <= stackDepth) {
                    realIndex++;
                }
            }
            
            
            return realIndex;
        }
       
};

var _stringInclude = function(str, strToCheck){
    return str.split(strToCheck).length > 1;
};


/***********************************************************************************************************************/
    DojoDebugger.DebugInfo = DebugInfo;
    DojoDebug.DojoDebugger = DojoDebugger;

    
    return DojoDebug;
});