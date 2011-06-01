/*******************************************************************************
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global eclipse:true orion:true dojo window*/
/*jslint devel:true*/

dojo.addOnLoad(function(){

    var editorContainerDomNode = dojo.byId("editorContainer");

    var editorFactory = function() {
        return new eclipse.Editor({
            parent: editorContainerDomNode,
            stylesheet: "/editor/samples/editor.css",
            tabSize: 4
        });
    };

    var contentAssistFactory = function(editor) {
        var contentAssist = new eclipse.ContentAssist(editor, "contentassist");
        contentAssist.addProvider(new orion.contentAssist.CssContentAssistProvider(), "css", "\\.css$");
        contentAssist.addProvider(new orion.contentAssist.JavaScriptContentAssistProvider(), "js", "\\.js$");
        return contentAssist;
    };

    // Canned highlighters for js, java, and css
    var syntaxHighlighter = {
        styler: null,

        highlight: function(fileName, editorWidget) {
            if (this.styler) {
                this.styler.destroy();
                this.styler = null;
            }
            if (fileName) {
                var splits = fileName.split(".");
                var extension = splits.pop().toLowerCase();
                if (splits.length > 0) {
                    switch(extension) {
                        case "js":
                            this.styler = new eclipse.TextStyler(editorWidget, "js");
                            break;
                        case "java":
                            this.styler = new eclipse.TextStyler(editorWidget, "java");
                            break;
                        case "css":
                            this.styler = new eclipse.TextStyler(editorWidget, "css");
                            break;
                    }
                }
            }
        }
    };

    var annotationFactory = new orion.AnnotationFactory();

    function save(editor) {
        editor.onInputChange(null, null, null, true);
        window.alert("Save hook.");
    }

    var keyBindingFactory = function(editor, keyModeStack, undoStack, contentAssist) {

        // Create keybindings for generic editing
        var genericBindings = new orion.TextActions(editor, undoStack);
        keyModeStack.push(genericBindings);

        // create keybindings for source editing
        var codeBindings = new orion.SourceCodeActions(editor, undoStack, contentAssist);
        keyModeStack.push(codeBindings);

        // save binding
        editor.getEditorWidget().setKeyBinding(new eclipse.KeyBinding("s", true), "save");
        editor.getEditorWidget().setAction("save", function(){
                save(editor);
                return true;
        });

        // speaking of save...
        dojo.byId("save").onclick = function() {save(editor);};

    };

    var dirtyIndicator = "";
    var status = "";

    var statusReporter = function(message, isError) {
        if (isError) {
            status =  "ERROR: " + message;
        } else {
            status = message;
        }
        dojo.byId("status").innerHTML = dirtyIndicator + status;
    };

    var editorContainer = new orion.EditorContainer({
        editorFactory: editorFactory,
        undoStackFactory: new orion.UndoFactory(),
        annotationFactory: annotationFactory,
        lineNumberRulerFactory: new orion.LineNumberRulerFactory(),
        contentAssistFactory: contentAssistFactory,
        keyBindingFactory: keyBindingFactory,
        statusReporter: statusReporter,
        domNode: editorContainerDomNode
    });

    dojo.connect(editorContainer, "onDirtyChange", this, function(dirty) {
        if (dirty) {
            dirtyIndicator = "*";
        } else {
            dirtyIndicator = "";
        }
        dojo.byId("status").innerHTML = dirtyIndicator + status;
    });

    editorContainer.installEditor();

    function objectReceiver(props) {
        console.log("orionEditorAdapter received object ", props);
    }
    var connection = addObjectConnection(window, window.parent, objectReceiver);
    connection.postObject({connection:"ready"});
    /*
    // if there is a mechanism to change which file is being viewed, this code would be run each time it changed.
    var contentName = "sample.js";  // for example, a file name, something the user recognizes as the content.
    var initialContent = "window.alert('this is some javascript code');  // try pasting in some real code";
    editorContainer.onInputChange(contentName, null, initialContent);
    syntaxHighlighter.highlight(contentName, editorContainer.getEditorWidget());
    // end of code to run when content changes.
    */
    window.onbeforeunload = function() {
        if (editorContainer.isDirty()) {
             return "There are unsaved changes.";
        }
    };
});