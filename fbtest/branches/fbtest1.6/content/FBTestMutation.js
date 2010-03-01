/* See license.txt for terms of usage */

// ************************************************************************************************
// Mutation Recognizer

/*
 * var lookForLogRow = new MutationRecognizer(panelDoc.defaultView, 'div', {class: "logRow-errorMessage"});

   lookForLogRow.onRecognize(function sawLogRow(elt)
   {
       checkConsoleLogMessage(elt, titles[ith], sources[ith]);  // deeper analysis if needed
       setTimeout(function bindArgs() { return fireTest(win, ith+1); }); // run next UI event on a new top level
   });
   // now fire a UI event
 */

/**
 * @constructor This object is intended for handling HTML changes that can occur on a page.
 * This is useful e.g. in cases when a test expects specific element to be created and
 * wants to asynchronously wait for it.
 * @param {Window} win Parent window.
 * @param {String} tagName Name of the element.
 * @param {Object} attributes List of attributes that identifies the element.
 * @param {String} text Specific text that should be created. The tagName must be set to
 * <i>Text</i> in this case.
 */
var MutationRecognizer = function(win, tagName, attributes, text)
{
   this.win = win;
   this.tagName = tagName;
   this.attributes = attributes;
   this.characterData = text;
};

MutationRecognizer.prototype.getDescription = function()
{
    var obj = {
        tagName: this.tagName,
        attributes: this.attributes,
        characterData: this.characterData
    };

    return JSON.stringify(obj);
};

/**
 * Passes a callback handler that is called when specific HTML change
 * occurs on the page.
 * @param {Function} handler Callback handler gets one parameter specifing the founded element.
 */
MutationRecognizer.prototype.onRecognize = function(handler)
{
    return new MutationEventFilter(this, handler);
}

/**
 * Passes a callback handler that is called when specific HTML change
 * occurs on the page. After the change is catched, the handler is executed yet
 * asynchronously.
 * @param {Function} handler Callback handler gets one parameter specifing the founded element.
 * @delay {Number} delay Number of milliseconds delay (10ms by default).
 */
MutationRecognizer.prototype.onRecognizeAsync = function(handler, delay)
{
    if (!delay)
        delay = 10;

    return new MutationEventFilter(this, function(element) {
        setTimeout(function() {
            FBTest.sysout("testFirebug.MutationEventFilter.onRecognizeAsync:", element);
            handler(element);
        }, delay);
    });
}

MutationRecognizer.prototype.getWindow = function()
{
    return this.win;
}

MutationRecognizer.prototype.matches = function(elt)
{
    // Note Text nodes have no tagName
    if (this.tagName == "Text")
    {
        if (elt.data && elt.data.indexOf(this.characterData) != -1)
        {
            if (FBTrace.DBG_TESTCASE_MUTATION)
                FBTrace.sysout("MutationRecognizer matches Text character data "+this.characterData);
            return true;
        }
        else
        {
            if (FBTrace.DBG_TESTCASE_MUTATION)
                FBTrace.sysout("MutationRecognizer no match in Text character data "+this.characterData+" vs "+elt.data,{element: elt, recogizer: this});
            return false;
        }
    }

    if (!(elt instanceof Element))
    {
        if (FBTrace.DBG_TESTCASE_MUTATION)
            FBTrace.sysout("MutationRecognizer Node not an Element ", elt);
        return false;
    }

    if (elt.tagName && (elt.tagName.toLowerCase() != this.tagName) )
    {
        if (FBTrace.DBG_TESTCASE_MUTATION)
            FBTrace.sysout("MutationRecognizer no match on tagName "+this.tagName+
                " vs "+elt.tagName.toLowerCase(), {element: elt, recogizer: this});
        return false;
    }

    for (var p in this.attributes)
    {
        if (this.attributes.hasOwnProperty(p))
        {
            var eltP = elt.getAttribute(p);
            if (!eltP)
            {
                if (FBTrace.DBG_TESTCASE_MUTATION)
                    FBTrace.sysout("MutationRecognizer no attribute "+p+" in "+
                        FW.FBL.getElementHTML(elt), {element: elt, recogizer: this});
                return false;
            }
            if (this.attributes[p] != null)
            {
                if (p == 'class')
                {
                    if (!FW.FBL.hasClass.apply(FW.FBL, [elt, this.attributes[p]]))
                    {
                        if (FBTrace.DBG_TESTCASE_MUTATION)
                            FBTrace.sysout("MutationRecognizer no match for class " +
                                this.attributes[p]+" vs "+eltP+" p==class: "+(p=='class') +
                                " indexOf: "+eltP.indexOf(this.attributes[p]));
                        return false;
                    }
                }
                else if (eltP != this.attributes[p])
                {
                    if (FBTrace.DBG_TESTCASE_MUTATION)
                        FBTrace.sysout("MutationRecognizer no match for attribute "+p+": "+
                            this.attributes[p]+" vs "+eltP,{element: elt, recogizer: this});
                    return false;
                }
            }
        }
    }

    if (this.characterData)
    {
        if (elt.textContent.indexOf(this.characterData) < 0)
        {
            if (FBTrace.DBG_TESTCASE_MUTATION)
                FBTrace.sysout("MutationRecognizer no match for characterData "+this.characterData+
                    " vs "+elt.textContent, {element: elt, recogizer: this});
            return false;
        }
    }

    // tagName and all attributes match
    FBTest.sysout("MutationRecognizer tagName and all attributes match "+elt, elt);
    return true;
}

function MutationEventFilter(recognizer, handler)
{
    this.recognizer = recognizer;

    this.winName = new String(window.location.toString());
    var filter = this;
    this.onMutateAttr = function handleAttrMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        if (!recognizer.attributes)
            return; // we don't care about attribute mutation

        if (FBTrace.DBG_TESTCASE_MUTATION)
            FBTrace.sysout("onMutateAttr "+event.attrName+"=>"+event.newValue+" on "+event.target+
                " in "+event.target.ownerDocument.location, event.target);

        // We care about some attribute mutation.
        if (!recognizer.attributes.hasOwnProperty(event.attrName))
        {
            if (FBTrace.DBG_TESTCASE_MUTATION)
                FBTrace.sysout("onMutateAttr not interested in "+event.attrName+"=>"+event.newValue+
                    " on "+event.target+" in "+event.target.ownerDocument.location, event.target);
            return;  // but not the one that changed.
        }

        try
        {
            if (filter.checkElement(event.target))
                handler(event.target);
        }
        catch(exc)
        {
            if (FBTrace.DBG_TESTCASE_MUTATION)
                FBTrace.sysout("onMutateNode FAILS "+exc, exc);
        }
    }

    // the matches() function could be tuned to each kind of mutation for improved efficiency
    this.onMutateNode = function handleNodeMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        if (FBTrace.DBG_TESTCASE_MUTATION)
            FBTrace.sysout("onMutateNode "+event.target+" in "+event.target.ownerDocument.location, event.target);

        try
        {
            if (filter.checkElementDeep(event.target))
                handler(event.target);
        }
        catch(exc)
        {
            if (FBTrace.DBG_TESTCASE_MUTATION)
                FBTrace.sysout("onMutateNode FAILS "+exc, exc);
        }
    }

    this.onMutateText = function handleTextMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        if (!recognizer.characterData)
            return; // we don't care about text

        // We care about text and the text for this element mutated.  If it matches we must have hit.
        if (FBTrace.DBG_TESTCASE_MUTATION)
            FBTrace.sysout("onMutateText =>"+event.newValue+" on "+event.target.ownerDocument.location, event.target);

        try
        {
            if (filter.checkElement(event.target))  // target is CharacterData node
                handler(event.target);
        }
        catch(exc)
        {
            if (FBTrace.DBG_TESTCASE_MUTATION)
                FBTrace.sysout("onMutateNode FAILS "+exc, exc);
        }
    }

    filter.checkElement = function(elt)
    {
        if (recognizer.matches(elt))
        {
            filter.unwatchWindow(recognizer.getWindow())
            return true;
        }
        return false;
    }

    filter.checkElementDeep = function(elt)
    {
        if (filter.checkElement(elt))
            return true;
        else
        {
            var child = elt.firstChild;
            for (; child; child = child.nextSibling)
            {
                if (this.checkElementDeep(child))
                    return true;
            }
        }
        return false;
    }

    filter.watchWindow(recognizer.win);
}

// ************************************************************************************************
// Mutation Event Filter

var filterInstance = 1;
var activeFilters = {};
MutationEventFilter.prototype.watchWindow = function(win)
{
    var doc = win.document;
    doc.addEventListener("DOMAttrModified", this.onMutateAttr, false);
    doc.addEventListener("DOMCharacterDataModified", this.onMutateText, false);
    doc.addEventListener("DOMNodeInserted", this.onMutateNode, false);
    // doc.addEventListener("DOMNodeRemoved", this.onMutateNode, false);

    var filter = this;
    filterInstance++;
    activeFilters[filterInstance] = filter;
    this.filterInstance = filterInstance;

    filter.cleanUp = function(event)
    {
        try
        {
            if (window.closed)
            {
                throw new Error("Filter cleanup in window.closed event.target:"+event.target);
            }
            FBTest.sysout("Filter.cleanup "+filter.filterInstance);
            filter.unwatchWindow(win);
            document.removeEventListener("FBTestCleanup", filter.cleanUp, true);
        }
        catch (e)
        {
          FBTest.sysout("Filter.cleanup FAILS "+e, e);
        }
    }
    win.addEventListener("unload", filter.cleanUp, true);
    window.addEventListener("unload", filter.cleanUp, true);
    document.addEventListener("FBTestCleanup", filter.cleanUp, true);
    //window.FBTest.progress("added MutationWatcher to "+doc.location+" and FBTestCleanup to "+document.location);
    //window.FBTest.progress("added FBTestCleanup "+filterInstance+" to "+document.location);
}

MutationEventFilter.prototype.unwatchWindow = function(win)
{
    var doc = win.document;

    doc.removeEventListener("DOMAttrModified", this.onMutateAttr, false);
    doc.removeEventListener("DOMCharacterDataModified", this.onMutateText, false);
    doc.removeEventListener("DOMNodeInserted", this.onMutateNode, false);
    win.removeEventListener("unload", this.cleanUp, true);
    window.removeEventListener("unload", this.cleanUp, true);
    window.FBTest.sysout("unwatchWindow removed MutationWatcher "+this.filterInstance+" from "+doc.location);
    delete activeFilters[this.filterInstance];
}

// ************************************************************************************************
// Clean up

window.addEventListener('unload', function sayUnload()
{
    FBTest.sysout(" UNLOAD "+window.location);
    for (var p in activeFilters)
    {
        FBTest.sysout(p+" still active filter ");
        activeFilters[p].cleanUp();
    }

}, true);
