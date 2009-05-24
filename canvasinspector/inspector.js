8/29/2007/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const inspectDelay = 100;

const edgeSize = 2;

const defaultPrimaryPanel = "html";
const defaultSecondaryPanel = "dom";

// ************************************************************************************************
// Globals

var standardHighlighter = null;
var popupHighlighter = null;
var mx, my;

// ************************************************************************************************

Firebug.Inspector = extend(Firebug.Module,
{
    dispatchName: "inspector",
    inspecting: false,

    highlightObject: function(element, context, highlightType, boxFrame)
    {
        if (!element || !isElement(element) || !isVisible(element))
            element = null;

        if (element && context && context.window && context.window.document)
            this.defaultHighlighter.highlight(context, element, boxFrame);
    },

    toggleInspecting: function(context)
    {
        if (this.inspecting)
            this.stopInspecting(true);
        else
            this.startInspecting(context);
    },

    startInspecting: function(context)
    {
        if (this.inspecting || !context || !context.loaded)
            return;

        inspectorCanvas.show(context, true);

        this.inspecting = true;
        this.inspectingContext = context;

        Firebug.chrome.setGlobalAttribute("cmd_toggleInspecting", "checked", "true");
        this.attachInspectListeners(context);

        // Remember the previous panel and bar state so we can revert if the user cancels
        this.previousPanelName = context.panelName;
        this.previousSidePanelName = context.sidePanelName;
        this.previouslyCollapsed = $("fbContentBox").collapsed;
        this.previouslyFocused = Firebug.isDetached() && Firebug.chrome.isFocused();

        var htmlPanel = Firebug.chrome.selectPanel("html");
        this.previousObject = htmlPanel.selection;

        if (Firebug.isDetached())
            Firebug.chrome.focus();
        else if (Firebug.isMinimized())
            Firebug.showBar(true);

        htmlPanel.panelNode.focus();
        htmlPanel.startInspecting();

        if (context.hoverNode)
            this.inspectNode(context.hoverNode);
    },

    inspectNode: function(node)
    {
        if (node && node.nodeType != 1)
            node = node.parentNode;

        if (node && node.firebugIgnore)
            return;

        var context = this.inspectingContext;

        if (this.inspectTimeout)
        {
            context.clearTimeout(this.inspectTimeout);
            delete this.inspectTimeout;
        }

        this.highlightObject(node, context);

        this.inspectingNode = node;

        if (node)
        {
            this.inspectTimeout = context.setTimeout(function()
            {
                Firebug.chrome.select(node);
            }, inspectDelay);
        }
    },

    stopInspecting: function(cancelled, waitForClick)
    {
        if (!this.inspecting)
            return;

        var context = this.inspectingContext;

        if (this.inspectTimeout)
        {
            context.clearTimeout(this.inspectTimeout);
            delete this.inspectTimeout;
        }

        this.detachInspectListeners(context);
        if (!waitForClick)
            this.detachClickInspectListeners(context.window);

        Firebug.chrome.setGlobalAttribute("cmd_toggleInspecting", "checked", "false");

        this.inspecting = false;

        var htmlPanel = context.getPanel("html");

        if (this.previouslyFocused)
            Firebug.chrome.focus();

        if (cancelled)
        {
            if (this.previouslyCollapsed)
                Firebug.showBar(false);

            if (this.previousPanelName == "html")
                Firebug.chrome.select(this.previousObject);
            else
                Firebug.chrome.selectPanel(this.previousPanelName, this.previousSidePanelName);
        }
        else
        {
            Firebug.chrome.select(htmlPanel.selection);
            Firebug.chrome.getSelectedPanel().panelNode.focus();
        }

        htmlPanel.stopInspecting(htmlPanel.selection, cancelled);

        this.inspectNode(null);

        inspectorCanvas.show(this.inspectingContext, false);

        delete this.previousObject;
        delete this.previousPanelName;
        delete this.previousSidePanelName;
        delete this.inspectingContext;
        },

    inspectNodeBy: function(dir)
    {
        var target, node = this.inspectingNode;

        if (dir == "up")
            target = Firebug.chrome.getNextObject();
        else if (dir == "down")
        {
            target = Firebug.chrome.getNextObject(true);
            if (node && !target)
            {
                if (node.contentDocument)
                    target = node.contentDocument.documentElement;
                else
                    target = getNextElement(node.firstChild);
            }
        }

        if (target && isElement(target))
            this.inspectNode(target);
        else
            beep();
    },

    attachInspectListeners: function(context)
    {
        var win = context.window;
        if (!win || !win.document)
            return;

        var chrome = Firebug.chrome;

        this.keyListeners =
        [
            chrome.keyCodeListen("RETURN", null, bindFixed(this.stopInspecting, this)),
            chrome.keyCodeListen("ESCAPE", null, bindFixed(this.stopInspecting, this, true)),
            chrome.keyCodeListen("UP", isControl, bindFixed(this.inspectNodeBy, this, "up"), true),
            chrome.keyCodeListen("DOWN", isControl, bindFixed(this.inspectNodeBy, this, "down"), true),
        ];

        iterateWindows(win, bind(function(subWin)
        {
            subWin.document.addEventListener("mouseover", this.onInspectingMouseOver, true);
            subWin.document.addEventListener("mousedown", this.onInspectingMouseDown, true);
            subWin.document.addEventListener("click", this.onInspectingClick, true);
        }, this));
    },

    detachInspectListeners: function(context)
    {
        var win = context.window;
        if (!win || !win.document)
            return;

        var chrome = Firebug.chrome;

        if (this.keyListeners)  // XXXjjb for some reason this is null some times.
        {
            for (var i = 0; i < this.keyListeners.length; ++i)
                chrome.keyIgnore(this.keyListeners[i]);
            delete this.keyListeners;
        }

        iterateWindows(win, bind(function(subWin)
        {
            subWin.document.removeEventListener("mouseover", this.onInspectingMouseOver, true);
            subWin.document.removeEventListener("mousedown", this.onInspectingMouseDown, true);
        }, this));
    },

    detachClickInspectListeners: function(win)
    {
        // We have to remove the click listener in a second phase because if we remove it
        // after the mousedown, we won't be able to cancel clicked links
        iterateWindows(win, bind(function(subWin)
        {
            subWin.document.removeEventListener("click", this.onInspectingClick, true);
        }, this));
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onInspectingMouseOver: function(event)
    {
        if (FBTrace.DBG_INSPECT)
           FBTrace.dumpEvent("onInspecting event", event);
        this.inspectNode(event.target);
        cancelEvent(event);
    },

    onInspectingMouseDown: function(event)
    {
        if (FBTrace.DBG_INSPECT)
           FBTrace.dumpEvent("onInspecting event", event);
        this.stopInspecting(false, true);
        cancelEvent(event);
    },

    onInspectingClick: function(event)
    {
        if (FBTrace.DBG_INSPECT)
            FBTrace.dumpEvent("onInspecting event", event);
        var win = event.currentTarget.defaultView;
        if (win)
        {
            win = getRootWindow(win);
            this.detachClickInspectListeners(win);
        }
        cancelEvent(event);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Module

    initialize: function()
    {
        Firebug.Module.initialize.apply(this, arguments);

        this.onInspectingMouseOver = bind(this.onInspectingMouseOver, this);
        this.onInspectingMouseDown = bind(this.onInspectingMouseDown, this);
        this.onInspectingClick = bind(this.onInspectingClick, this);

        this.updateOption();
    },

    initContext: function(context)
    {
        context.onPreInspectMouseOver = function(event) { context.hoverNode = event.target; };
    },

    destroyContext: function(context)
    {
        if (context.highlightTimeout)
        {
            context.clearTimeout(context.highlightTimeout);
            delete context.highlightTimeout;
        }

        if (this.inspecting)
            this.stopInspecting(true);
    },

    watchWindow: function(context, win)
    {
        win.addEventListener("mouseover", context.onPreInspectMouseOver, true);
    },

    unwatchWindow: function(context, win)
    {
        try {
            win.removeEventListener("mouseover", context.onPreInspectMouseOver, true);
        } catch (ex) {
            // Get unfortunate errors here sometimes, so let's just ignore them
            // since the window is going away anyhow
        }
    },

    showContext: function(browser, context)
    {
        if (this.inspecting)
            this.stopInspecting(true);

    },

    showPanel: function(browser, panel)
    {
        var chrome = Firebug.chrome;
        var disabled = !panel || !panel.context.loaded;
        chrome.setGlobalAttribute("cmd_toggleInspecting", "disabled", disabled);
        //chrome.setGlobalAttribute("menu_firebugInspect", "disabled", disabled);
    },

    loadedContext: function(context)
    {
        Firebug.chrome.setGlobalAttribute("cmd_toggleInspecting", "disabled", "false");
        //Firebug.chrome.setGlobalAttribute("menu_firebugInspect", "disabled", "false");
    },

    updateOption: function()
    {
        this.highlightObject(null);
        this.defaultHighlighter = getHighlighter("boxModel");
    },

    getObjectByURL: function(context, url)
    {
        var styleSheet = getStyleSheetByHref(url, context);
        if (styleSheet)
            return styleSheet;
    }
});

// ************************************************************************************************
// Local Helpers

function getHighlighter(type)
{
    if (type == "boxModel")
    {
        if (!standardHighlighter)
            standardHighlighter = new StandardHighlighter();

        return standardHighlighter;
    }
    else if (type == "popup")
    {
        if (!popupHighlighter)
            popupHighlighter = new PopupHighlighter();

        return popupHighlighter;
    }
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

function PopupHighlighter()
{
}

PopupHighlighter.prototype =
{
    highlight: function(context, element)
    {
        var doc = context.window.document;
        var popup = doc.getElementById("inspectorPopup");
        popup.style.width = "200px";
        popup.style.height = "100px";
        popup.showPopup(element, element.boxObject.screenX,
            element.boxObject.screenY, "popup", "none", "none");
        if (FBTrace.DBG_INSPECT)
        {
            FBTrace.sysout("PopupHighlighter for "+element.tagName, " at ("+element.boxObject.screenX+","+element.boxObject.screenY+")");
            FBTrace.dumpProperties("PopupHighlighter popup=", popup);
        }
    },

    unhighlight: function(context)
    {
    },
}
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

function StandardHighlighter()
{
}

StandardHighlighter.prototype =
{
    highlight: function(context, element, boxFrame)
    {
        inspectorCanvas.highlight(context, element, true, boxFrame);
    },

    unhighlight: function(context)
    {
        inspectorCanvas.show(context, false);
    }
};

inspectorCanvas =
{
    "ctx": null,
    "mouseX": 0,
    "mouseY": 0,
    "offsetX": 0,
    "offsetY": 0,
    "htmlTimer": null,
    
    "mousemove": function(event, context)
    {
        this.mouseX = event.layerX;
        this.mouseY = event.layerY;
        this.highlight(context, event, false);
        this.showInfo(context);
    },
    
    "mouseout": function(event, context)
    {
        this.show(context, false, event);
    },

    "mousedown": function(context)
    {
        this.show(context, false);
        Firebug.Inspector.stopInspecting(false, true);
    },
    
    "highlight": function(context, eventOrElt, boxModel, boxFrame)
    {
        var i, elt, rect, popup, canvas,
            htmlPanel = Firebug.chrome.selectPanel("html"),
            win = context.window,
            doc = win.document;
            
        this.show(context, true, null, boxModel);

        if(eventOrElt.constructor == MouseEvent)
        {
            this.mouseX = eventOrElt.layerX;
            this.mouseY = eventOrElt.layerY;

            elt = doc.elementFromPoint(this.mouseX, this.mouseY);
            if(/[^i]frame/i.test(elt.nodeName))
            {
                rect = elt.getBoundingClientRect();
                this.offsetX = rect.left;
                this.offsetY = rect.top;
                elt = elt.contentDocument.elementFromPoint(this.mouseX - this.offsetX, this.mouseY - this.offsetY);
            }
        }
        else
        {
            elt = eventOrElt;

            if(win.frames.length > 0 && win.frames.length > doc.getElementsByTagName('iframe').length)
            {
                for(i=0; i<win.frames.length; i++)
                {
                    if(win.frames[i].document == elt.ownerDocument)
                    {
                        rect = win.frames[i].frameElement.getBoundingClientRect();
                        this.offsetX = rect.left;
                        this.offsetY = rect.top;
                        break;
                    }
                }
            }
        }

        if(/(html)|(frameset)/i.test(elt.nodeName.toUpperCase()))
            return;
        else if(/area/i.test(elt.nodeName) || (!boxModel && elt.useMap))
            this.highlightImageMap(context, elt, boxModel);
        else
        {
            popup = document.getElementById("autoscroller");
            canvas = document.getElementById("firebugCanvas");

            rect = getRectTRBLWH(elt);
            rect.left += this.offsetX;
            rect.top += this.offsetY;
            
            if(!this.ctx)
                this.ctx = canvas.getContext("2d");

            if(boxModel)
            {
                var left, top, right, bottom, width, height, img,
                    offsetParent = elt.offsetParent || elt,
                    win = elt.ownerDocument.defaultView,
                    parentRect = getRectTRBLWH(offsetParent),
                    style = win.getComputedStyle(elt, ""),
                    styles = readBoxStyles(style),
                    x = rect.left - Math.abs(styles.marginLeft),
                    y = rect.top - Math.abs(styles.marginTop),
                    w = elt.offsetWidth - (styles.paddingLeft + styles.paddingRight + styles.borderLeft + styles.borderRight),
                    h = elt.offsetHeight - (styles.paddingTop + styles.paddingBottom + styles.borderTop + styles.borderBottom);

                this.ctx.clearRect(0, 0, canvas.width, canvas.height);

                parentRect.left += this.offsetX;
                parentRect.top += this.offsetY;
                    
                // margin - yellow rgb(237, 255, 100)
                left = x;
                top = y;
                width = rect.width + 2 * styles.marginRight;
                height = rect.height + 2 * styles.marginBottom;
                this.ctx.fillStyle = "rgba(237, 255, 100, 0.8)";
                this.ctx.clearRect(left, top, width, height);
                this.ctx.fillRect(left, top, width, height);

                // border - grey rgb(102, 102, 102)
                left = rect.left;
                top = rect.top;
                width = rect.width;
                height = rect.height;
                this.ctx.fillStyle = "rgba(102, 102, 102, 0.8)";
                this.ctx.clearRect(left, top, width, height);
                this.ctx.fillRect(left, top, width, height);
                        
                // padding - SlateBlue rgb(53, 126, 199)
                left = rect.left + styles.borderLeft;
                top = rect.top + styles.borderTop;
                width = rect.width - 2 * styles.borderRight;
                height = rect.height - 2 * styles.borderBottom;
                this.ctx.fillStyle = "rgba(53, 126, 199, 0.8)";
                this.ctx.clearRect(left, top, width, height);
                this.ctx.fillRect(left, top, width, height);

                // content - SkyBlue rgba(130, 202, 255)
                left = rect.left + styles.borderLeft + styles.paddingLeft;
                top = rect.top + styles.borderTop + styles.paddingTop;
                width = rect.width - 2 * (styles.borderRight + styles.paddingRight);
                height = rect.height - 2 * (styles.borderBottom + styles.paddingBottom);
                this.ctx.fillStyle = "rgba(130, 202, 255, 0.8)";
                this.ctx.clearRect(left, top, width, height);
                this.ctx.fillRect(left, top, width, height);

                // Rulers & guides
                if(boxFrame && Firebug.showRulers)
                {
                    this.ctx.strokeStyle = "#FF0000";
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    
                    // Outline parent
                    this.ctx.strokeRect(parentRect.left, parentRect.top, parentRect.width, parentRect.height);
                    
                    // Rulers
                    this.ctx.globalAlpha = 0.8;
                    img = new Image();
                    img.src = "chrome://firebug/skin/rulerH.png";
                    this.ctx.drawImage(img, 1, 1, parentRect.width, 14, parentRect.left, parentRect.top, parentRect.width, 14);

                    img.src = "chrome://firebug/skin/rulerV.png";
                    this.ctx.drawImage(img, 1, 1, 14, parentRect.height, parentRect.left, parentRect.top, 14, parentRect.height);
                    
                    // Guides
                    this.ctx.globalAlpha = 1;
                    this.ctx.strokeStyle = "#000000";
                    
                    switch(boxFrame)
                    {
                        case "margin":
                            left = x;
                            top = y;
                            width = rect.width + 2 * styles.marginRight;
                            height = rect.height + 2 * styles.marginBottom;
                            break;
                        case "border":
                            left = rect.left;
                            top = rect.top;
                            width = rect.width;
                            height = rect.height;
                            break;
                        case "padding":
                            left = rect.left + styles.borderLeft;
                            top = rect.top + styles.borderTop;
                            width = rect.width - 2 * styles.borderRight;
                            height = rect.height - 2 * styles.borderBottom;
                            break;
                        case "content":
                            left = rect.left + styles.borderLeft + styles.paddingLeft;
                            top = rect.top + styles.borderTop + styles.paddingTop;
                            width = rect.width - 2 * (styles.borderRight + styles.paddingRight);
                            height = rect.height - 2 * (styles.borderBottom + styles.paddingBottom);
                    }

                    //top
                    this.ctx.moveTo(1, top);
                    this.ctx.lineTo(canvas.width, top);
                    
                    // right
                    this.ctx.moveTo(left + width, 1);
                    this.ctx.lineTo(left + width, canvas.height);
                    
                    //bottom
                    this.ctx.moveTo(1, top + height);
                    this.ctx.lineTo(canvas.width, top + height);
                  
                    // left
                    this.ctx.moveTo(left, 1);
                    this.ctx.lineTo(left, canvas.height);
                    
                    this.ctx.stroke();
                }
            }
            else
            {
                this.highlightElement(elt, false, "", "#3875d7");

                if(htmlPanel.selection != elt)
                {
                    if(this.htmlTimer)
                        clearTimeout(this.htmlTimer);
                    
                    this.htmlTimer = setTimeout(function()
                    {
                        htmlPanel.select(elt, true);
                    }, inspectDelay);
                }
            }
        }
    },
    
    "highlightElement": function(elt, clearCanvas, fillStyle, strokeStyle, lineWidth)
    {
        var canvas = document.getElementById("firebugCanvas");
        
        if(!this.ctx)
            this.ctx = canvas.getContext("2d");

        if(fillStyle == 'default')
            this.ctx.fillStyle = "rgba(135, 206, 235, 0.7)";
        else
            this.ctx.fillStyle = fillStyle;

        if(strokeStyle == 'default')
            this.ctx.strokeStyle = "rgb(29, 55, 95)";
        else
            this.ctx.strokeStyle = strokeStyle;

        this.ctx.lineWidth = lineWidth || 2;

        if(clearCanvas)
            this.ctx.clearRect(0,0,canvas.width,canvas.height);

        rect = getRectTRBLWH(elt);
        rect.left += this.offsetX;
        rect.top += this.offsetY;

        if(fillStyle.length>0)
            this.ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
        
        if(strokeStyle.length>0)
            this.ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
    },
    
    "showInfo": function(context)
    {
        var rect,
            top = 5,
            left = 5,
            canvas = document.getElementById("firebugCanvas"),
            win = context.window,
            doc = win.document,
            elt = doc.elementFromPoint(this.mouseX, this.mouseY),
            rect = getRectTRBLWH(elt);
            
        if(/[^i]frame/i.test(elt.nodeName))
        {
            this.offsetX = rect.left;
            this.offsetY = rect.top;
            elt = elt.contentDocument.elementFromPoint(this.mouseX - this.offsetX, this.mouseY - this.offsetY);
        }

        if(this.mouseX <= 150 && this.mouseY <= 110)
            left = elt.ownerDocument.activeElement.offsetWidth - 155;
        
        if(!this.ctx)
            this.ctx = canvas.getContext("2d");

        this.ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
        
        this.ctx.textBaseline = "top";
        
        this.ctx.fillRect(left, top, 150, 110);
        this.ctx.strokeRect(left, top, 150, 110);

        left += 5;
        
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillText("Type: "+elt.nodeName, left, top+5, 140);
        this.ctx.fillText("id: "+elt.id, left, top+20, 140);
        this.ctx.fillText("name: "+elt.name, left, top+35, 140);
        this.ctx.fillText("top: "+(rect.top + elt.ownerDocument.activeElement.scrollTop), left, top+50, 140);
        this.ctx.fillText("left: "+(rect.left + elt.ownerDocument.activeElement.scrollLeft), left, top+65, 140);
        this.ctx.fillText("width: "+rect.width, left, top+80, 140);
        this.ctx.fillText("height: "+rect.height, left, top+95, 140);
    },
    
    "highlightImageMap": function(context, image, boxModel)
    {
        var i, v, images, tempArea, currentArea;
            
        if (image)
        {
            if(image.useMap && !boxModel)
            {
                var mapName = image.useMap.replace('#',""),
                    map = image.ownerDocument.getElementById(mapName),
                    areas = map.areas;

                this.highlightElement(image, true, "default", "");

                for(i=0;i<areas.length;i++)
                {
                    tempArea = this.highlightImageMapArea(image, areas[i], false, "", "default");
                    currentArea = tempArea || currentArea;
                }
            }
            else
            {
                images = this.getImages(context, "#"+image.parentNode.name, boxModel, image.ownerDocument);
                
                if(images.length===0)
                    images[0] = image;
                
                for(i=0;i<images.length;i++)
                    this.highlightImageMapArea(images[i], image, i==0, "default", "default");
            }
            
            if(!boxModel)
            {
                htmlPanel = Firebug.chrome.selectPanel("html");

                if(htmlPanel.selection != currentArea)
                {
                    if(this.htmlTimer)
                        clearTimeout(this.htmlTimer);
                    
                    this.htmlTimer = setTimeout(function()
                    {
                        htmlPanel.select(currentArea || image);
                    }, inspectDelay);
                }
            }
            
            if(currentArea)
                this.highlightImageMapArea(image, currentArea, false, "rgba(255, 0, 0, 0.2)", "default", 2, true);
        }
    },
    
    "highlightImageMapArea": function(image, area, clearCanvas, fillStyle, strokeStyle, lineWidth)
    {
        var i, v, rect,
            canvas = document.getElementById("firebugCanvas");

        if(!this.ctx)
            this.ctx = canvas.getContext("2d");

        if(fillStyle == 'default')
            this.ctx.fillStyle = "rgba(135, 206, 235, 0.7)";
        else
            this.ctx.fillStyle = fillStyle;

        if(strokeStyle == 'default')
            this.ctx.strokeStyle = "rgb(29, 55, 95)";
        else
            this.ctx.strokeStyle = strokeStyle;

        this.ctx.lineWidth = lineWidth || 2;
       
        rect = getRectTRBLWH(image);
        rect.left += this.offsetX;
        rect.top += this.offsetY;
        
        v = area.coords.split(",");
        
        this.ctx.beginPath();

        if(clearCanvas)
            this.ctx.clearRect(0,0,canvas.width,canvas.height);
        
        if (area.shape.toLowerCase() === 'rect')
        {
            this.ctx.rect(rect.left+parseInt(v[0],10), rect.top+parseInt(v[1],10), v[2]-v[0], v[3]-v[1]);
        }
        else if (area.shape.toLowerCase() === 'circle')
        {
            this.ctx.arc(rect.left+parseInt(v[0],10) + this.ctx.lineWidth / 2, rect.top+parseInt(v[1],10) + this.ctx.lineWidth / 2, v[2], 0, Math.PI / 180 * 360, false);
        }
        else
        {
            this.ctx.moveTo(rect.left+parseInt(v[0],10), rect.top+parseInt(v[1],10));
            for(i=2;i<v.length;i+=2)
            {
                this.ctx.lineTo(rect.left+parseInt(v[i],10), rect.top+parseInt(v[i+1],10));
            }
        }

        this.ctx.closePath();

        if(fillStyle.length>0)
            this.ctx.fill();
        
        if(strokeStyle.length>0)
            this.ctx.stroke();
            
        if(this.ctx.isPointInPath(this.mouseX, this.mouseY))
            return area;
    },
    
    "getImages": function(context, mapName, boxModel, doc)
    {
        var i,
            elts = [],
            images = [],
            elts2 = doc.getElementsByTagName("img"),
            elts3 = doc.getElementsByTagName("input");
       
        for(i=0;i<elts2.length;i++)
            elts.push(elts2[i]);
            
        for(i=0;i<elts3.length;i++)
            elts.push(elts3[i]);
       
        if(elts)
        {
            for(i=0;i<elts.length;i++)
            {
                if(elts[i].getAttribute('usemap') == mapName)
                {
                    rect=elts[i].getBoundingClientRect();

                    if(boxModel)
                    {
                        images.push(elts[i]);
                    }
                    else if(rect.left <= mx && rect.right >= mx && rect.top <= my && rect.bottom >= my)
                    {
                        images[0]=elts[i];
                        break;
                    }
                }
            }
        }
        return images;
    },
    
    "show": function(context, state, event, boxModel)
    {
        var popup = document.getElementById('autoscroller'),
            canvas = document.getElementById("firebugCanvas"),
            content = document.getElementById("content"),
            appContent = document.getElementById("appcontent"),
            doc = context.window.document,
            _this = this,
            w, h;
        
        if(state)
        {
            if(!popup)
            {
                popup = context.browser._createAutoScrollPopup();
                context.browser._autoScrollNeedsCleanup = true;
            }

            if(!canvas)
            {
                canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas")
                canvas.id = "firebugCanvas";
                canvas.className = "firebugCanvas";

                canvas.addEventListener("mousemove", function(event){_this.mousemove(event, context);}, false);
                canvas.addEventListener("mouseout", function(event){_this.mouseout(event, context);}, false);
                canvas.addEventListener("mousedown", function(){_this.mousedown(context);}, false);
                popup.appendChild(canvas);
            }

            w = context.window.innerWidth;
            h = context.window.innerHeight;

            if(context.window.scrollMaxX)
                h -= 15;

            if(context.window.scrollMaxY)
                w -= 15;
  
            popup.style.backgroundImage = "url()";
            popup.style.margin = "0 0";
            popup.sizeTo(w, h);
            canvas.width = w;
            canvas.height = h;
            popup.openPopupAtScreen(appContent.boxObject.screenX, appContent.boxObject.screenY + content.tabContainer.boxObject.height, false);
        }
        else
        {
            var canvas = document.getElementById("firebugCanvas");
            
            if(canvas)
            {
                if(!event || event.layerX === 0 || event.layerX >= canvas.width || event.layerY === 0 || event.layerY >= canvas.height)
                    canvas.parentNode.removeChild(canvas);
                else
                    return;
            }
            
            popup.style.backgroundImage = "";
            popup.style.margin = "";
            popup.sizeTo(0, 0);
            popup.hidePopup();
            
            this.offsetX = 0;
            this.offsetY = 0;
            this.ctx = null;
        }
    }
}

// ************************************************************************************************

Firebug.registerModule(Firebug.Inspector);

// ************************************************************************************************

}});
