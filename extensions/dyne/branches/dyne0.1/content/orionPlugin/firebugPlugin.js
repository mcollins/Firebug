var eventAdapterForCSS = {
     onModelChanging : function(event){
            console.log("firebugPlugin.onModelChanging "+event.text, event);
     },

    // eclipse.TextModel listener
    onChanged: function(start, removedCharCount, addedCharCount, removedLineCount, addedLineCount)
    {
        console.log("eventAdapterForCSS onChanged ", arguments);
        syntaxHighlighter.highlight(contentName, editorContainer.getEditorWidget());
        if (this.empty) // then this is the first event
        {
            editorContainerDomNode.addEventListener("DOMNodeRemoved", function onNodeRemoved(event)
            {
                console.log("DOMNodeRemoved ", event);
            }, true);
            delete this.empty;  // mark seen first event
            return;             // drop first event, its just the initial buffer load
        }

        var changedLineIndex = this.model.getLineAtOffset(start);
        var lineText = this.model.getLine(changedLineIndex);
        connection.callService("IStylesheet", "onRuleLineChanged", [changedLineIndex, lineText]);
    },
};

var resourceOpener =
{

};

var firebugPlugin =
{
    connectToOrion: function() {
        var provider = new eclipse.PluginProvider();
        provider.registerServiceProvider("orion.edit.listener", eventAdapterForCSS, {});
        provider.connect();
        console.log("connected firebugPlugin to orion.edit.listener");
    },

    // -------------------------------------
    connectToFirebug: function() {
        // listen for json messages from Firebug Dyne extension
        this.firebugConnection = jsonConnection.add(document.documentElement, this.firebugObjectReceiver.bind(this));
        // For events from dyne to orion
        this.firebugConnection.registerService("firebug.resource.opener", null, resourceOpener);
        console.log("firebugPlugin waiting for firebug at "+window.location);
    },

    /*
     * Called when Firebug starts talking back to firebugPlugin
     */
    firebugObjectReceiver: function(props) {

        console.log("orionEditorAdapter received object ", props);
        // diagnostic to report we are ready for events
        console.log('orionEditorAdapter before orion ready message')
        connection.postObject({connection: "orion is ready"});
        console.log("orion posted ready");
    },
};

window.onload = function() {
    try{
        // listen for commands from Firebug
        firebugPlugin.connectToFirebug();
        // Connect to Orion in frame.parent
        firebugPlugin.connectToOrion();

    } catch (exc) {
        console.error(exc);
    }

};
