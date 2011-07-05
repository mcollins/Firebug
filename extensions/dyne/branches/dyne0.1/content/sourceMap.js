
function binaryIntervalSearch(ary, key, lowIndex, hiIndex)
{
    if (!ary.length)
        return -1;

    lowIndex = lowIndex || 0;
    if (typeof(hiIndex) === 'undefined')
        hiIndex = ary.length - 1;

    if (lowIndex > hiIndex)
        return -1; // no find

    var middle = Math.floor((lowIndex + hiIndex) / 2);

    if (key > ary[middle])
        return binaryIntervalSearch(ary, key, (middle + 1), hiIndex);

    if (middle === 0) // then the key is in or below our first interval
        return middle;

    if (key <= ary[middle - 1])
        return binaryIntervalSearch(ary, key, lowIndex, (middle - 1));
    else 	// key is <= ary[middle] && key > ary[middle - 1]
        return middle;
}

//line 1 goes from char 0 to char newLineOffsets[0]
function getNewLineOffsets(buffer)
{
    var newLineOffsets = [];
    var mark = -1
    while( (mark = buffer.indexOf('\n', mark+1)) !== -1 )
    {
        newLineOffsets.push(mark);
    }
    if (newLineOffsets[newLineOffsets.length - 1] !== buffer.length)
        newLineOffsets.push(buffer.length);

    return newLineOffsets;
}

function SourceMap(buffer) {
    this.buffer = buffer || "";
}

SourceMap.prototype.getLineByCharOffset = function(offset)
{
    if (!this.synced)
        this.resync();
    // line 0 will be illegal value
    if (offset < 0 || (this.newLineOffsets[0] === 0))
        return 0;
    if (offset > this.newLineOffsets[this.newLineOffsets.length - 1])
        return 0;
    return binaryIntervalSearch(this.newLineOffsets, offset) + 1;
}

SourceMap.prototype.getLineSourceByLine = function(lineNumber)
{
    if (!this.synced)
        this.resync();

    if (lineNumber > 0 && ((lineNumber - 1) < this.newLineOffsets.length) )
    {
        var mark = (lineNumber > 1) ? (this.newLineOffsets[lineNumber - 2] + 1 ): 0;
        var point = this.newLineOffsets[lineNumber - 1];
        return this.buffer.substring(mark, point);
    }
}

SourceMap.prototype.resync = function()
{
    this.newLineOffsets = getNewLineOffsets(this.buffer);
    this.synced = true;
}

SourceMap.prototype.editSource = function(start, addedSource, removeCount)
{
    var beforeChange = this.buffer.substring(0, start);
    var afterChange = this.buffer.substring(start+removeCount);
    this.buffer = beforeChange + addedSource + afterChange;
    this.synced = false;
    return this.buffer.length;
}