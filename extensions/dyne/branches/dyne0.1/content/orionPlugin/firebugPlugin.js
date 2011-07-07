
var propRE = /\s*([^:\s]*)\s*:\s*(.*?)\s*(! important)?;/;
var CSSStylesheetUpdater =
{
    // From Orion to Firebug
    buffer: "",

    onModelChanging: function(event)
    {
        console.log("firebugPlugin onModelChanging ", event);
        firebugPlugin.firebugConnection.callService("IConsole", "log", ["firebugPlugin onModelChanging ", event]);
        if (!this.buffer)
        {
            this.buffer = event.text;
            this.sourceMap = new SourceMap(this.buffer);
        }
        else
        {
            this.sourceMap.editSource(event.start, event.text, event.removedCharCount);
            var lineText = event.text;
            var changedLineIndex = this.sourceMap.getLineByCharOffset(event.start);
            var lineText = this.sourceMap.getLineSourceByLine(changedLineIndex);
            firebugPlugin.firebugConnection.callService("IStylesheet", "onRuleLineChanged", [changedLineIndex, lineText]);
        }
    },

    // To Orion from Firebug
    onCSSSetProperty: function(event) {
        var selectorOffset = this.sourceMap.getCharOffsetByLine(event.selectorLine);
        if (!selectorOffset)
        {
            console.error("FirebugPlugin ERROR selector line "+event.selectorLine+" not found during onCSSSetProperty ", event);
            return;
        }
        var ruleOffset = this.sourceMap.indexOf(event.propName, selectorOffset);
        if (ruleOffset === -1)
        {
            console.error("FirebugPlugin ERROR property name "+event.propName+" not found during onCSSSetProperty ", event);
            return;
        }
        else
        {
            // we want to come up with replacementText, startOffset, endOffset
            // startOffset will point to the first char of the old propertyValue
            // endOffset will point to the last char.

            var ruleTextMatch = this.sourceMap.getMatchByRegExp(propRE, ruleOffset);
            if (!ruleTextMatch || ruleTextMatch.length < 3)
            {
                console.error("FirebugPlugin ERROR ruleText not found after "+ruleOffset+" during onCSSSetProperty ", event);
                return;
            }
            var prevPropValue = ruleTextMatch[2];
            var start = this.sourceMap.indexOf(prevPropValue, ruleOffset);
            var end = start + prevPropValue.length;
            var event = {
                method: "setText",
                arguments: [event.propValue,
                            start,
                            end]
            };

            firebugPlugin.commander.command(event)
        }
    }


};

var resourceOpener =
{

};

function EditCommander(serviceProvider)
{
    this.serviceProvider = serviceProvider;
}
EditCommander.prototype =
{
    command: function(event)
    {
        this.serviceProvider.dispatchEvent('content.update',event);
    }
}

var firebugPlugin =
{
    connectToOrion: function()
    {
        var provider = new eclipse.PluginProvider();
        var backchannel = provider.registerServiceProvider("orion.edit.listener", CSSStylesheetUpdater, {});

        this.commander = new EditCommander(backchannel);

        console.log("registered at orion.edit.listener, connecting... ", {cssUpdater: CSSStylesheetUpdater, commander: this.commander});
        provider.connect(this.onConnectToOrion.bind(this), this.onErrorConnectToOrion.bind(this));
    },

    onConnectToOrion: function()
    {
        console.log("Orion connect succeeded ", arguments);
    },
    onErrorConnectToOrion: function()
    {
        console.log("Orion connect failed ", arguments);
    },

    // -------------------------------------
    connectToFirebug: function() {
        // listen for json messages from Firebug Dyne extension
        this.firebugConnection = jsonConnection.add(document.documentElement, this.firebugObjectReceiver.bind(this));
        // For events from dyne to orion
        this.firebugConnection.registerService("firebug.resource.opener", null, resourceOpener);
        console.log("firebugPlugin waiting for firebug at "+document.documentElement.ownerDocument.location, document.documentElement);

        this.firebugConnection.postObject({connection: "firebugPlugin waiting for firebug at "+document.documentElement.ownerDocument.location});

    },

    /*
     * Called when Firebug starts talking back to firebugPlugin
     */
    firebugObjectReceiver: function(props) {

        console.log("firebugPlugin received object ", props);
        if (!firebugPlugin.connected && props.connection) {
            firebugPlugin.connected = true;
            // diagnostic to report we are ready for events
            console.log('firebugPlugin before orion ready message');
            this.firebugConnection.postObject({connection: "orion is ready"});
            console.log("orion posted ready");
        }
        var command = Object.keys(props);
        command.forEach(function actOn(command){
            CSSStylesheetUpdater[command](props[command]);
        });
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
