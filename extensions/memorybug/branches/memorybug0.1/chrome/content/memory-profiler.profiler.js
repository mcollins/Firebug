function doProfiling()
{
    var namedObjects = getNamedObjects();

    var graph = {};
    var rejectedTypes = {};
    var INTERESTING_TYPES = [
        'Object', 'Function', 'Call', 'Window', 'Array', 'RegExp',
        'Block', 'Date', 'String', 'StopIteration', 'Iterator',
        'Error', 'Math', 'JSON', 'Boolean', 'With', 'Number',
        'XML', 'Script', 'CanvasRenderingContext2D',
        'PageTransitionEvent', 'MouseEvent',
        'Location', 'Navigator', 'Generator', 'XPCNativeWrapper',
        'XPCSafeJSObjectWrapper', 'XPCCrossOriginWrapper'
    ];

    var interestingTypes = {};

    INTERESTING_TYPES.forEach(
        function(name) { interestingTypes[name] = true; }
    );

    var shapes = {};
    var maxShapeId = 0;
    var windows = {};

    for (name in namedObjects)
    {
        var id = namedObjects[name];
        var info = getObjectInfo(id);
        while (info.wrappedObject) {
            id = info.wrappedObject;
            info = getObjectInfo(info.wrappedObject);
        }

        if (info.innerObject)
            id = info.innerObject;
        namedObjects[name] = id;
        windows[id] = true;
    }

    var table = getObjectTable();

    var byFiles = {};

    // Check every JS object
    var nativeClassWhitelist = {"Function":1,"Array":1,"String":1,"BackstagePass":1,"RegExp":1,"Date":1};
    for (var i in table)
    {
        var info = getObjectInfo(parseInt(i));

        if (!(info.parent in windows))
            continue;

        // For now, ignore native objects which seems to be all created in C++ layers
        // There are considered as native because there wasn't JS stack frame during there creation.
        if (info.isNative) 
            continue;

        var file = info.filename ? info.filename : "?";
        var line = info.lineStart ? info.lineStart : "?";
        var protoinfo = getObjectInfo(info.constr);
        var proto = "?";

        if (protoinfo && protoinfo.name)
        {
            desc = /*"p_"+*/protoinfo.name;
        }
        else if (nativeClassWhitelist[info.nativeClass]==1)
        {
            desc = /*"nw_"+*/info.nativeClass;
        }
        else if (info.nativeClass == "Object")
        {
            var properties = getObjectProperties(info.id);
            var properties_list = [];
            for(var name in properties)
                properties_list.push(name);
            properties_list.sort();
            if (properties_list.length>0)
                desc = /*"s_"+*/properties_list.join(', ');
            else
                desc = "Object"; //"o_Object";
        }
        else
        {
            desc = /*"nb_"+*/info.nativeClass;
        }

        if (!byFiles[file])
        {
            byFiles[file] = {
                parent: info.parent,
                count: 0,
                lines: {}
            };
        }

        byFiles[file].count++;

        if (!byFiles[file].lines[line])
        {
            byFiles[file].lines[line] = {
                url: file,
                number: line,
                count: 0,
                descriptions: {}
            };
        }

        byFiles[file].lines[line].count++;
        if (!byFiles[file].lines[line].descriptions[desc])
            byFiles[file].lines[line].descriptions[desc] = 0;
        byFiles[file].lines[line].descriptions[desc]++;
    }

  for (id in table) {
    var nativeClass = table[id];
    if ((nativeClass in interestingTypes) ||
      (nativeClass.indexOf('HTML') == 0) ||
        (nativeClass.indexOf('DOM') == 0) ||
        (nativeClass.indexOf('XPC_WN_') == 0)) {
      var intId = parseInt(id);
      var parent = getObjectParent(intId);
      if ((parent in windows) || (intId in windows))
        graph[id] = getObjectInfo(intId);
    } else {
      if (!(nativeClass in rejectedTypes))
        rejectedTypes[nativeClass] = true;
    }
  }

  for (id in graph) {
    var info = graph[id];
    if (info.parent in windows && info.nativeClass == "Object") {
      var props = getObjectProperties(parseInt(id));
      props = [name for (name in props)];
      // TODO: If there's a comma in the property name,
      // we can get weird results here, though it's
      // unlikely.
      props = props.join(",");
      if (!(props in shapes)) {
        shapes[props] = maxShapeId;
        maxShapeId++;
      }
      info['shape'] = shapes[props];
    }
  }

  var shapesArray = [];
  for (name in shapes)
    shapesArray[shapes[name]] = name;

  var rejectedList = [];
  for (name in rejectedTypes)
    rejectedList.push(name);
  return {namedObjects: namedObjects,
          graph: graph,
          shapes: shapesArray,
          rejectedTypes: rejectedList,
          objects: byFiles};
}

// This function uses the Python-inspired traceback functionality of the
// profiling runtime to return a stack trace that looks much like Python's.
function getTraceback(frame) {
  var lines = [];
  if (frame === undefined)
    frame = stack();
  while (frame) {
    var line = ('  File "' + frame.filename + '", line ' +
                frame.lineNo + ', in ' + frame.functionName);
    lines.splice(0, 0, line);
    frame = frame.caller;
  }
  lines.splice(0, 0, "Traceback (most recent call last):");
  return lines.join('\n');
}

(function() {
   var result;
   try {
     result = {success: true,
               data: doProfiling()};
   } catch (e) {
     result = {success: false,
               traceback: getTraceback(lastExceptionTraceback),
               error: String(e)};
   }
   return JSON.stringify(result);
 })();
